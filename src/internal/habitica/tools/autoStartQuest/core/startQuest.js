import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { handleApiAnalytic, handleApiError } from 'utils';
import toolInvalidCredentials from '../../content/toolInvalidCredentials';


/**
 * Checks for a pending quest invitation for the linked Habitica account and starts it if found. If the Habitica credentials are invalid or if there was an error during the process, sends a notification to the user and tears down the associated tool resources.
 * @param {Object} properties - The properties for starting the pending quest.
 * @param {string} properties.userId - The user ID of the Habitools user.
 * @param {string} properties.resourceId - The ID of the associated tool resource.
 * @param {string} properties.habiticaUserId - The Habitica user ID to check for pending quests.
 * @returns {Promise<Object>} - A success message if a quest was started, or a failure message if no pending quest was found or if there was an error.
 */
export const startQuest = async ({ userId, resourceId, habiticaUserId, questKey, questName, questUrl, removeThisCron }) => {
  const userData = await getLinkedHabiticaUser({ userId, forceRefresh: true });
  const questData = userData?.habitica_user_data?.party?.quest;

  if (!questData?.key || questData?.key !== questKey) {
    if (removeThisCron) {
      await removeThisCron();
    }
    return { success: false };
  }

  const habiticaResponse = await callHabiticaApi({
    method: 'POST',
    path: '/groups/party/quests/force-start',
    habiticaUserId: habiticaUserId,
    userId,
    retryConfig: {
      retryOnNetworkError: true,
      retryOnRateLimit: true,
    },
  });
  if (!habiticaResponse?.success) {
    if (habiticaResponse?.code === 401 || habiticaResponse?.code === 403) {
      await createEventMessage({
        userId,
        resourceId,
        eventSlug: 'quest-auto-start-cron-failed',
        eventName: 'Quest Auto-Start Failed',
        messageText: toolInvalidCredentials('Auto Start Quests'),
        shortMessage: 'Quest Auto-Start Failed',
        shouldNotify: true,
        shouldNotifyHabiticaViaAdmin: true,
        priority: 3,
      }).catch(() => {});
      await teardownToolResources({
        resourceId,
        userId,
      });
      handleApiError(new Error(`quest-auto-start-cron-failed. ${ habiticaResponse?.code }`), 'startQuest.quest-auto-start-cron-failed');
      handleApiAnalytic(undefined, 'quest-auto-start-cron-failed', JSON.stringify({
        code: habiticaResponse?.code,
        habiticaResponse,
        username: userData?.habitica_user_data?.username,
        email: userData?.habitica_user_data?.email,
      }));
    }
    return { success: false };
  }

  handleApiAnalytic(undefined, 'auto_start_quest_launched', JSON.stringify({
    userId,
    habitica_username: userData?.habitica_user_data?.username,
    habitica_email: userData?.habitica_user_data?.email,
    quest: {
      key: questKey,
      name: questName,
    },
  }));

  await createEventMessage({
    userId,
    resourceId,
    eventSlug: 'quest-auto-started',
    eventName: 'Quest Auto-Started',
    messageText: `Started the quest for [${ questName } (Wiki)](https://habitica.fandom.com/wiki/${ questUrl })`,
    shortMessage: 'Quest Auto-Started',
    priority: 1,
  }).catch(() => {});

  if (removeThisCron) {
    await removeThisCron();
  }

  return { success: true };
};
