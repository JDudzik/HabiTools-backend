import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { getHabiticaContent } from 'internal/habitica/core/getHabiticaContent';
import { handleApiAnalytic, handleApiError } from 'utils';


/**
 * Checks for a pending quest invitation for the linked Habitica account and accepts it if found. If the Habitica credentials are invalid or if there was an error during the process, sends a notification to the user and tears down the associated tool resources.
 * @param {Object} properties - The properties for accepting the pending quest.
 * @param {string} properties.userId - The user ID of the Habitools user.
 * @param {string} properties.resourceId - The ID of the associated tool resource.
 * @param {string} properties.habiticaUserId - The Habitica user ID to check for pending quests.
 * @param {string} properties.source - The source of the quest acceptance (e.g., 'cron', 'webhook', 'activation').
 * @returns {Promise<Object>} - A success message if a quest was accepted, or a failure message if no pending quest was found or if there was an error.
 */
export const acceptPendingQuest = async ({ userId, resourceId, habiticaUserId, source }) => {
  const userData = await getLinkedHabiticaUser({ userId, forceRefresh: true });
  const questData = userData?.habitica_user_data?.party?.quest;

  if (!questData?.RSVPNeeded) {
    return { success: null };
  }

  const habiticaResponse = await callHabiticaApi({
    method: 'POST',
    path: '/groups/party/quests/accept',
    habiticaUserId: habiticaUserId,
    userId,
    retryConfig: {
      retryOnNetworkError: true,
      retryOnRateLimit: true,
    },
  });
  if (!habiticaResponse?.success) {
    if (habiticaResponse?.code === 401 || habiticaResponse?.code === 403) {
      handleApiError(new Error(`auto-accept-quests-failed. ${ habiticaResponse?.code }`), 'acceptPendingQuest.auto-accept-quests-failed');
      handleApiAnalytic(undefined, 'auto-accept-quests-failed', JSON.stringify({
        code: habiticaResponse?.code,
        habiticaResponse,
        username: userData?.habitica_user_data?.username,
        email: userData?.habitica_user_data?.email,
      }));
    }
    return { success: false };
  }

  const contentResult = await getHabiticaContent({ dataItems: { quests: true }, language: userData?.habitica_user_data?.preferences?.language || 'en' });
  const questName = contentResult?.quests?.[questData?.key]?.text;
  const questUrl = questName?.replace(/\s+/g, '_');
  await createEventMessage({
    userId,
    resourceId,
    eventSlug: 'quest-auto-accepted',
    eventName: 'Quest Auto-Accepted',
    messageText: `A quest invitation for [${ questName } (Wiki)](https://habitica.fandom.com/wiki/${ questUrl }) was automatically accepted.`,
    shortMessage: 'Quest auto-accepted',
    priority: 1,
  }).catch(() => {});
  handleApiAnalytic(undefined, 'quest_accepted', JSON.stringify({
    questKey: questData?.key,
    userId,
    habitica_username: userData?.habitica_user_data?.username,
    habitica_email: userData?.habitica_user_data?.email,
    source,
  }));
  if (source === 'cron') {
    // If a cron accepted a quest, that implies that a webhook has failed to trigger for some reason.
    handleApiAnalytic(undefined, 'quest_accepted_via_cron', JSON.stringify({
      questKey: questData?.key,
      userId,
      habitica_username: userData?.habitica_user_data?.username,
      habitica_email: userData?.habitica_user_data?.email,
      source,
    }));
    handleApiError(new Error('Quest accepted via cron'), 'acceptPendingQuest.acceptedViaCron');
  }
  return { success: true };
};
