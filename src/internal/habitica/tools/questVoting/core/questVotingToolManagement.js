import HabiticaTool from 'knex/models/HabiticaTool';
import QuestVoting from 'knex/models/QuestVoting';
import Webhook from 'knex/models/Webhook';
import Cron from 'knex/models/Cron';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { getHabiticaPartyInfo } from 'internal/habitica/methods/getHabiticaPartyInfo';
import { modifyToolInstanceData } from 'internal/habitica/methods/modifyToolInstanceData';
import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';
import { setWebhook } from 'internal/webhooks/core/setWebhook';
import { setCron } from 'internal/cron/core/setCron';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { sanitizeProperties, optional, isBoolean, returnOrSendResponse } from 'utils';
import {
  getToolDataFromInput,
  getUserQuestVotingTool,
  updateParticipantInQuestVoting,
  processPartyQuestState,
  emitSharedEventMessage,
  removeParticipantFromQuestVoting,
} from './questVotingCore';


const TOOL_SLUG = 'quest-voting';
const TOOL_NAME = 'Quest Voting';
const HOURLY_TASK_NAME = 'quest-voting-hourly-check';
const WEBHOOK_TASK_NAME = 'quest-voting-party-webhook';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const sendPartyMessage = async ({
  userId,
  habiticaUserId,
  message,
}) => {
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

const ensureLeaderAutomation = async ({
  toolInstance,
  userId,
  habiticaUserId,
  expiresAt,
}) => {
  if (!toolInstance?.id || !userId || !habiticaUserId) { return; }

  const existingWebhook = await Webhook.query()
    .where('resource_id', toolInstance.id)
    .where('task_name', WEBHOOK_TASK_NAME)
    .whereNull('deleted_at')
    .first();

  if (!existingWebhook) {
    const internalWebhook = await setWebhook({
      user_id: userId,
      resource_id: toolInstance.id,
      task_name: WEBHOOK_TASK_NAME,
      expires_at: expiresAt || toolInstance.expires_at,
      is_active: true,
      data: { habiticaUserId },
      skipTaskSetup: true,
    });

    const callbackBaseUrl = process.env.HABITICA_WEBHOOK_URL_OVERRIDE || process.env.BACKEND_HOST;
    const callbackUrl = `${ callbackBaseUrl }/v1/webhooks/trigger/${ internalWebhook.url_id }`;

    const habiticaResult = await callHabiticaApi({
      method: 'POST',
      path: '/user/webhook',
      habiticaUserId,
      userId,
      body: {
        url: callbackUrl,
        enabled: true,
        type: 'questActivity',
        options: {
          questStarted: true,
          questFinished: true,
          questInvited: true,
        },
      },
      retryConfig: {
        retryOnNetworkError: true,
        retryOnRateLimit: true,
      },
    });

    if (habiticaResult?.success && habiticaResult?.data?.id) {
      await Webhook.query()
        .where('id', internalWebhook.id)
        .patch({ data: { ...(internalWebhook.data || {}), habiticaWebhookId: habiticaResult.data.id }});
    }
  }

  const existingCron = await Cron.query()
    .where('resource_id', toolInstance.id)
    .where('task_name', HOURLY_TASK_NAME)
    .whereNull('deleted_at')
    .first();

  if (!existingCron) {
    await setCron({
      userId,
      resourceId: toolInstance.id,
      taskName: HOURLY_TASK_NAME,
      expiresAt: expiresAt || toolInstance.expires_at,
      isActive: true,
      immediateOnce: true,
      schedule: 'RAND() RAND(0,59) * * * *',
      data: { habiticaUserId },
    });
  }
};

export const activateQuestVotingTool = async ({ _req, userId, payload }) => {
  const sanitizedPayload = sanitizeProperties(payload || {}, {
    optionalKeys: [ 'filter_categories', 'leave_one_per_quest', 'party_wide_filter', 'secure_voting' ],
    parseBools: true,
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      optional(isBoolean('leave_one_per_quest', 'leave_one_per_quest must be a boolean')),
      optional(isBoolean('secure_voting', 'secure_voting must be a boolean')),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  const linkedHabiticaUser = await getLinkedHabiticaUser({ userId, forceRefresh: true });
  if (linkedHabiticaUser?.code) { return linkedHabiticaUser; }

  const partyInfo = await getHabiticaPartyInfo({ userId, forceRefresh: true });
  if (partyInfo?.code) { return partyInfo; }

  const isLeader = !!partyInfo?.isLeader;
  const toolData = getToolDataFromInput({
    filterCategories: sanitizedProperties.filter_categories,
    leaveOnePerQuest: sanitizedProperties.leave_one_per_quest,
    partyWideFilter: sanitizedProperties.party_wide_filter,
    secureVoting: sanitizedProperties.secure_voting,
  });

  let toolInstance = getUserQuestVotingTool(linkedHabiticaUser);

  if (!toolInstance) {
    const now = Date.now();
    const expiresAt = now + THIRTY_DAYS_MS;

    toolInstance = await HabiticaTool.query().insertAndFetch({
      habitica_user_id: linkedHabiticaUser.id,
      tool_slug: TOOL_SLUG,
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
      last_refreshed_at: now,
      data: toolData,
    });

    if (isLeader) {
      await ensureLeaderAutomation({
        toolInstance,
        userId,
        habiticaUserId: linkedHabiticaUser.habitica_user_id,
        expiresAt,
      });
    }

    await createEventMessage({
      userId,
      resourceId: toolInstance.id,
      priority: 1,
      eventSlug: `${ TOOL_SLUG }-activated`,
      eventName: 'Tool Activated',
      messageText: `The ${ TOOL_NAME } tool has been activated.`,
      shortMessage: `${ TOOL_NAME } activated.`,
    }).catch(() => {});
  } else {
    await modifyToolInstanceData({
      userId,
      resourceId: toolInstance.id,
      toolData: {
        ...(toolInstance?.data || {}),
        ...toolData,
      },
      eventMessage: {
        messageText: '<small>Quest Voting settings were updated.</small>',
        shortMessage: 'Quest Voting settings updated.',
      },
    });

    if (isLeader) {
      await ensureLeaderAutomation({
        toolInstance,
        userId,
        habiticaUserId: linkedHabiticaUser.habitica_user_id,
        expiresAt: toolInstance.expires_at,
      });
    }
  }

  const updatedToolData = {
    ...(toolInstance?.data || {}),
    ...toolData,
  };

  const updateResult = await updateParticipantInQuestVoting({
    linkedHabiticaUser,
    toolInstance,
    toolData: updatedToolData,
    partyInfo,
    isLeader,
  });
  let questVoting = updateResult.questVoting;

  await emitSharedEventMessage({
    questVoting,
    eventSlug: 'quest-voting-roster-joined',
    eventName: 'Roster Updated',
    messageText: `${ linkedHabiticaUser?.habitica_user_data?.username || 'A user' } enabled Quest Voting and joined the roster.`,
    shortMessage: 'A user joined the Quest Voting roster.',
    priority: 1,
  });

  if (isLeader && (!updateResult.previousLeaderUserId || updateResult.previousLeaderUserId !== userId)) {
    await sendPartyMessage({
      userId,
      habiticaUserId: linkedHabiticaUser.habitica_user_id,
      message: 'Quest Voting has been activated for this party. Vote links will be posted for the next quest whenever a ballot is opened.',
    });
  }

  if (isLeader) {
    const processResult = await processPartyQuestState({ questVoting, source: 'activation' });
    if (processResult?.questVoting) {
      questVoting = processResult.questVoting;
    }
  }

  return {
    success: true,
    toolInstance,
    isLeader,
    leaderEnabled: !!questVoting?.leader_user_id,
    waitingForLeader: !questVoting?.leader_user_id,
    questVoting,
  };
};

export const disableQuestVotingTool = async ({ userId }) => {
  const linkedHabiticaUser = await getLinkedHabiticaUser({ userId, forceRefresh: false });
  if (linkedHabiticaUser?.code) { return linkedHabiticaUser; }

  const toolInstance = getUserQuestVotingTool(linkedHabiticaUser);
  if (!toolInstance?.id) {
    return returnOrSendResponse(404, {
      status: 'QUEST_VOTING_NOT_ACTIVE',
      message: 'Quest Voting is not active for this account.',
    });
  }

  const partyQuestVoting = await QuestVoting.query()
    .where('party_habitica_id', linkedHabiticaUser?.habitica_user_data?.party?._id)
    .whereNull('deleted_at')
    .first();

  if (partyQuestVoting) {
    const removed = await removeParticipantFromQuestVoting({ questVoting: partyQuestVoting, userId });

    if (removed.questVoting) {
      await emitSharedEventMessage({
        questVoting: removed.questVoting,
        eventSlug: 'quest-voting-roster-left',
        eventName: 'Roster Updated',
        messageText: `${ linkedHabiticaUser?.habitica_user_data?.username || 'A user' } disabled Quest Voting and left the roster.`,
        shortMessage: 'A user left the Quest Voting roster.',
        priority: 1,
      });

      if (partyQuestVoting.leader_user_id === userId) {
        await sendPartyMessage({
          userId,
          habiticaUserId: linkedHabiticaUser.habitica_user_id,
          message: 'Quest Voting has been disabled by the current party leader. The roster remains saved until all participants disable the tool.',
        });
      }
    }
  }

  await teardownToolResources({
    userId,
    resourceId: toolInstance.id,
    notification: {
      slugPrefix: 'quest-voting',
      name: 'Quest Voting',
      fromExpiration: false,
    },
  });

  return { success: true };
};
