import HabiticaTool from 'knex/models/HabiticaTool';
import QuestVoting from 'knex/models/QuestVoting';
import Webhook from 'knex/models/Webhook';
import Cron from 'knex/models/Cron';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import questVotingFailedBallotLeaderExpiredMessage from 'internal/habitica/core/content/questVotingFailedBallotLeaderExpiredMessage';
import { emitSharedEventMessage, removeParticipantFromQuestVoting } from './questVotingCore';


const TOOL_SLUG = 'quest-voting';

const sendPartyMessage = async ({ userId, habiticaUserId, message }) => {
  if (!userId || !habiticaUserId || !message) { return false; }

  const result = await callHabiticaApi({
    method: 'POST',
    path: '/groups/party/chat',
    body: { message },
    userId,
    habiticaUserId,
    retryConfig: {
      retryOnNetworkError: true,
      retryOnRateLimit: true,
    },
  });

  return !!result?.success;
};

const removeExternalWebhooks = async ({ resourceId }) => {
  const relatedWebhooks = await Webhook.query()
    .where('resource_id', resourceId)
    .whereNull('deleted_at');

  for (const webhook of relatedWebhooks) {
    const habiticaWebhookId = webhook?.data?.habiticaWebhookId;
    const habiticaUserId = webhook?.data?.habiticaUserId;

    if (!habiticaWebhookId || !habiticaUserId) { continue; }

    await callHabiticaApi({
      method: 'DELETE',
      path: `/user/webhook/${ habiticaWebhookId }`,
      habiticaUserId,
      retryConfig: {
        retryOnNetworkError: true,
        retryOnRateLimit: true,
      },
    }).catch(() => {});
  }
};

const removeToolResources = async ({ resourceId }) => {
  if (!resourceId) { return; }

  await removeExternalWebhooks({ resourceId }).catch(() => {});

  await Webhook.query()
    .where('resource_id', resourceId)
    .whereNull('deleted_at')
    .del()
    .catch(() => {});

  await Cron.query()
    .where('resource_id', resourceId)
    .whereNull('deleted_at')
    .del()
    .catch(() => {});

  await HabiticaTool.query()
    .where('id', resourceId)
    .where('tool_slug', TOOL_SLUG)
    .whereNull('deleted_at')
    .del()
    .catch(() => {});
};

const getParticipantUserId = ({ questVoting, userId, resourceId }) => {
  if (userId) { return userId; }

  const participant = (questVoting?.participants || []).find(item => item?.toolResourceId === resourceId);
  return participant?.userId || null;
};

export const handleQuestVotingExpirationCleanup = async ({ userId, resourceId, fromExpiration }) => {
  if (!fromExpiration) {
    return { success: true, skipped: 'not-expiration' };
  }

  if (!resourceId && !userId) {
    return { success: true, skipped: 'missing-identifiers' };
  }

  const tool = resourceId
    ? await HabiticaTool.query()
      .where('id', resourceId)
      .where('tool_slug', TOOL_SLUG)
      .whereNull('deleted_at')
      .first()
    : null;

  let questVoting = null;
  if (resourceId) {
    questVoting = await QuestVoting.query()
      .where('leader_tool_resource_id', resourceId)
      .whereNull('deleted_at')
      .first();
  }

  if (!questVoting && userId) {
    const rows = await QuestVoting.query().whereNull('deleted_at');
    questVoting = rows.find(row => (row?.participants || []).some(item => item?.userId === userId)) || null;
  }

  if (questVoting) {
    const participantUserId = getParticipantUserId({ questVoting, userId, resourceId });

    if (participantUserId) {
      const linked = await getLinkedHabiticaUser({ userId: participantUserId, forceRefresh: false }).catch(() => null);
      const username = linked?.code
        ? 'A user'
        : (linked?.habitica_user_data?.username || 'A user');

      const removed = await removeParticipantFromQuestVoting({
        questVoting,
        userId: participantUserId,
      });

      if (removed?.questVoting) {
        await emitSharedEventMessage({
          questVoting: removed.questVoting,
          eventSlug: 'quest-voting-roster-left',
          eventName: 'Roster Updated',
          messageText: `${ username } was removed from the Quest Voting roster because their tool expired.`,
          shortMessage: 'A user was removed from the roster due to expiration.',
          priority: 1,
        });

        if (questVoting.leader_user_id === participantUserId && !linked?.code) {
          await sendPartyMessage({
            userId: participantUserId,
            habiticaUserId: linked?.habitica_user_id,
            message: questVotingFailedBallotLeaderExpiredMessage,
          });
        }
      }

      await createEventMessage({
        userId: participantUserId,
        eventSlug: 'quest-voting-expired',
        eventName: 'Quest Voting Expired',
        messageText: 'The tool **Quest Voting** has expired because it was not refreshed in time. Re-enable it from the tool page to continue.',
        shortMessage: 'Quest Voting has expired.',
        shouldNotify: true,
        shouldNotifyHabiticaViaAdmin: true,
        priority: 2,
      }).catch(() => {});
    }
  }

  const resolvedResourceId = resourceId || tool?.id;
  if (resolvedResourceId) {
    await removeToolResources({ resourceId: resolvedResourceId });
  }

  return { success: true };
};
