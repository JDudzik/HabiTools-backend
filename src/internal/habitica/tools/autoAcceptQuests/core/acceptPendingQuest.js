import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { getHabiticaContent } from 'internal/habitica/core/getHabiticaContent';
import { handleApiAnalytic } from 'utils';


/**
 * Checks for a pending quest invitation for the linked Habitica account and accepts it if found. If the Habitica credentials are invalid or if there was an error during the process, sends a notification to the user and tears down the associated tool resources.
 * @param {Object} properties - The properties for accepting the pending quest.
 * @param {string} properties.userId - The user ID of the Habitools user.
 * @param {string} properties.resourceId - The ID of the associated tool resource.
 * @param {string} properties.habiticaUserId - The Habitica user ID to check for pending quests.
 * @returns {Promise<Object>} - A success message if a quest was accepted, or a failure message if no pending quest was found or if there was an error.
 */
export const acceptPendingQuest = async ({ userId, resourceId, habiticaUserId, source }) => {
  const userData = await getLinkedHabiticaUser({ userId, forceRefresh: true });
  const questData = userData?.habitica_user_data?.party?.quest;
  handleApiAnalytic(undefined, 'checked_pending_quest', JSON.stringify({
    userId,
    habitica_username: userData?.habitica_user_data?.username,
    habitica_email: userData?.habitica_user_data?.email,
    source,
    questData,
  }));

  if (!questData?.RSVPNeeded) {
    return { success: null };
  }

  const habiticaResponse = await callHabiticaApi({
    method: 'POST',
    path: '/groups/party/quests/accept',
    habiticaUserId: habiticaUserId,
    userId,
  });
  if (!habiticaResponse?.success) {
    if (habiticaResponse?.code === 401 || habiticaResponse?.code === 403) {
      await createEventMessage({
        user_id: userId,
        resource_id: resourceId,
        event_slug: 'quest-auto-accept-failed',
        event_name: 'Quest Auto-Accept Failed',
        message_text: 'Failed to auto-accept a quest invitation due to invalid Habitica credentials. The associated tool resources have been removed. Please link your Habitica account again to continue using the tool.',
        short_message: 'Quest auto-accept failed',
        should_notify: true,
        should_notify_habitica_via_admin: true,
        priority: 1,
      }).catch(() => {});
      await teardownToolResources({
        resourceId,
        userId,
        notification: {
          slugPrefix: 'auto-accept-quests',
          name: 'Auto Accept Quests',
        },
      });
    }
    return { success: false };
  }

  const contentResult = await getHabiticaContent({ dataItems: { quests: true }, language: userData?.habitica_user_data?.preferences?.language || 'en' });
  const questName = contentResult?.quests?.[questData?.key]?.text;
  const questUrl = questName?.replace(/\s+/g, '_');
  await createEventMessage({
    user_id: userId,
    resource_id: resourceId,
    event_slug: 'quest-auto-accepted',
    event_name: 'Quest Auto-Accepted',
    message_text: `A quest invitation for [${ questName } (Wiki)](https://habitica.fandom.com/wiki/${ questUrl }) was automatically accepted.`,
    short_message: 'Quest auto-accepted',
    should_notify: true,
    should_notify_habitica_via_admin: true,
    priority: 1,
  }).catch(() => {});
  if (source === 'cron') {
    // If a cron accepted a quest, that implies that a webhook has failed to trigger for some reason.
    handleApiAnalytic(undefined, 'quest_accepted_via_cron', JSON.stringify({
      questData,
      userId,
      habitica_username: userData?.habitica_user_data?.username,
      habitica_email: userData?.habitica_user_data?.email,
    }));
  }
  return { success: true };
};
