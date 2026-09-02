import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { handleApiAnalytic } from 'utils';


/**
 * Starts a pending quest for the linked Habitica account if one is found.
 * @param {Object} properties - The properties for starting the pending quest.
 * @param {string} properties.userId - The user ID of the Habitools user.
 * @param {string} properties.resourceId - The ID of the associated tool resource.
 * @param {string} properties.habiticaUserId - The Habitica user ID to check for pending quests.
 * @param {string} properties.questKey - The key of the quest to start.
 * @param {string} properties.questName - The name of the quest to start.
 * @param {string} properties.questUrl - The URL of the quest to start.
 * @param {Function} [properties.removeThisCron] - An optional function to remove the associated cron job.
 * @returns {Promise<Object>} - A success message if the quest was started, or a failure message if no pending quest was found or if there was an error.
 */
export const startQuest = async ({
  userId,
  resourceId,
  habiticaUserId,
  questKey,
  questName,
  questUrl,
  removeThisCron,
}) => {
  const userData = await getLinkedHabiticaUser({ userId, forceRefresh: true });
  const questData = userData?.habitica_user_data?.party?.quest;

  if (!questData?.key) {
    await createEventMessage({
      userId,
      resourceId,
      eventSlug: 'no-pending-quests',
      eventName: 'Quests Not Pending',
      messageText: `Attempted to start "_${ questName }_", but no quest was pending.`,
      shortMessage: 'Quests Not Pending',
      priority: 1,
    }).catch(() => {});
    if (removeThisCron) { await removeThisCron(); }
    return { success: false };
  }

  if (questData.key !== questKey) {
    await createEventMessage({
      userId,
      resourceId,
      eventSlug: 'quest-mismatch',
      eventName: 'Wrong Quest Pending',
      messageText: `Attempted to start "_${ questName }_", but the pending Habitica quest is a different one.<small> This can be a normal occurrence in some situations. Another timer will handle the current pending quest.</small>`,
      shortMessage: 'Wrong Quest Pending',
      priority: 1,
    }).catch(() => {});
    if (removeThisCron) { await removeThisCron(); }
    return { success: false };
  }

  const habiticaMemberInfo = await callHabiticaApi({
    method: 'GET',
    path: '/groups/party/members?includeAllPublicFields=true',
    habiticaUserId,
    userId,
    retryConfig: {
      retryOnNetworkError: true,
      retryOnRateLimit: true,
    },
  });

  let rsvpMessage = undefined;
  if (habiticaMemberInfo?.success) {
    const nonResponders = habiticaMemberInfo?.data
      ?.filter(member => member.party.quest.RSVPNeeded === true)
      ?.map(member => `_[[${ member.profile.name }](https://habitica.com/profile/${ member.id })]_`)
      ?.join(', ');

    rsvpMessage = nonResponders?.length > 0
      ? `\n<small>Unresponsive members: ${ nonResponders }</small>`
      : 'All members responded';
  } else {
    rsvpMessage = '(Unable to retrieve RSVP\'d statuses)';
  }

  const habiticaResponse = await callHabiticaApi({
    method: 'POST',
    path: '/groups/party/quests/force-start',
    habiticaUserId,
    userId,
    retryConfig: {
      retryOnNetworkError: true,
      retryOnRateLimit: true,
    },
  });

  if (!habiticaResponse?.success) {
    await createEventMessage({
      userId,
      resourceId,
      eventSlug: 'no-pending-quests',
      eventName: 'Quests Not Pending',
      messageText: `Attempted to start "_${ questName }_", but it was not pending. It likely already started or was cancelled.`,
      shortMessage: 'Quests Not Pending',
      priority: 1,
    }).catch(() => {});
    if (removeThisCron) { await removeThisCron(); }
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
    messageText: `Started the quest [(Wiki)](https://habitica.fandom.com/wiki/${ questUrl }). ${ rsvpMessage }`,
    shortMessage: 'Quest Auto-Started',
    priority: 1,
  }).catch(() => {});

  if (removeThisCron) { await removeThisCron(); }
  return { success: true };
};
