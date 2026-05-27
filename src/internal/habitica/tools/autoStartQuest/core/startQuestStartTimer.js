import HabiticaTool from 'knex/models/HabiticaTool';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { getHabiticaContent } from 'internal/habitica/core/getHabiticaContent';
import { handleApiAnalytic, returnOrSendResponse } from 'utils';
import { setCron } from 'internal/cron/core/setCron';
import { deleteCrons } from 'internal/cron/core/deleteCrons';
import toolInvalidCredentials from '../../content/toolInvalidCredentials';


const WAIT_MODE_MAP = {
  '24': 22,
  '3': 2,
};

/**
 * Checks for a pending quest invitation for the linked Habitica account and accepts it if found. If the Habitica credentials are invalid or if there was an error during the process, sends a notification to the user and tears down the associated tool resources.
 * @param {Object} properties - The properties for accepting the pending quest.
 * @param {string} properties.userId - The user ID of the Habitools user.
 * @param {string} properties.resourceId - The ID of the associated tool resource.
 * @param {string} properties.habiticaUserId - The Habitica user ID to check for pending quests.
 * @returns {Promise<Object>} - A success message if a quest was accepted, or a failure message if no pending quest was found or if there was an error.
 */
export const startQuestStartTimer = async ({ userId, resourceId, habiticaUserId }) => {
  const userData = await getLinkedHabiticaUser({ userId });
  if (userData?.code) { return returnOrSendResponse(userData.code, userData.responseContent); }

  const habiticaPartyInfo = await callHabiticaApi({
    method: 'POST',
    path: '/groups/party',
    habiticaUserId: habiticaUserId,
    userId,
  });
  if (!habiticaPartyInfo?.success) {
    if (habiticaPartyInfo?.code === 401 || habiticaPartyInfo?.code === 403) {
      await createEventMessage({
        user_id: userId,
        resource_id: resourceId,
        event_slug: 'quest-auto-start-failed',
        event_name: 'Quest Auto-Start Failed',
        message_text: toolInvalidCredentials('Auto Start Quests'),
        short_message: 'Quest Auto-Start Failed',
        should_notify: true,
        should_notify_habitica_via_admin: true,
        priority: 3,
      }).catch(() => {});
      await teardownToolResources({
        resourceId,
        userId,
        notification: {
          slugPrefix: 'auto-start-quests',
          name: 'Auto Start Quests',
        },
      });
    }
    return { success: false };
  }

  const selectedTool = await HabiticaTool.query()
    .alias('tool')
    .joinRelated('habitica_user')
    .where('tool.id', resourceId)
    .whereNull('tool.deleted_at')
    .where('habitica_user.user_id', userId)
    .first();
  const toolData = selectedTool?.data && JSON.parse(selectedTool.data);

  // Clear out any existing cron timers for this tool before starting a new one.
  await deleteCrons({ resourceId: resourceId, runCleanup: false });

  const questKey = habiticaPartyInfo?.data?.quest?.key;
  const isQuestActive = habiticaPartyInfo?.data?.quest?.active;
  if (!questKey || isQuestActive) {
    return { success: null };
  }

  const partyLeader = habiticaPartyInfo?.data?.leader?.id;
  const questLeader = habiticaPartyInfo?.data?.quest?.leader;
  if (questKey && habiticaUserId !== partyLeader && habiticaUserId !== questLeader) {
    await createEventMessage({
      user_id: userId,
      resource_id: resourceId,
      event_slug: 'quest-auto-start-skipped',
      event_name: 'Skipped',
      message_text: 'Auto-start was skipped this time because you must either be the party leader or the quest leader.',
      short_message: 'Skipped',
      priority: 0,
    }).catch(() => {});
    return { success: null };
  }

  const contentResult = await getHabiticaContent({ dataItems: { quests: true }, language: userData?.habitica_user_data?.preferences?.language || 'en' });
  const questName = contentResult?.quests?.[questKey]?.text;
  const questUrl = questName?.replace(/\s+/g, '_');

  const hoursToWait = WAIT_MODE_MAP[toolData?.waitMode || '24'];
  await setCron({
    schedule: `RAND(0,9)-59/10 DELAY(15,${ hoursToWait }) * * *`,
    userId,
    resourceId,
    taskName: 'auto-start-quests-launch',
    expiresAt: Date.now() + (5 * 24 * 60 * 60 * 1000), // 5 days
    isActive: true,
    immediateOnce: false,
    data: { habiticaUserId, questKey, questName, questUrl },
  });

  await createEventMessage({
    user_id: userId,
    resource_id: resourceId,
    event_slug: 'quest_timer_started',
    event_name: 'Quest Timer Started',
    message_text: `The automatic-start timer for your quest, [${ questName } (Wiki)](https://habitica.fandom.com/wiki/${ questUrl }), has been started. The quest will launch in ${ hoursToWait } hours.`,
    short_message: 'Quest Timer Started',
    priority: 1,
  }).catch(() => {});

  handleApiAnalytic(undefined, 'start-quests-timer', JSON.stringify({
    userId,
    habitica_username: userData?.habitica_user_data?.username,
    habitica_email: userData?.habitica_user_data?.email,
    quest: {
      key: questKey,
      name: questName,
    },
    hoursToWait,
  }));

  return { success: true };
};
