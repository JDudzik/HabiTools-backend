import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { handleApiAnalytic } from 'utils';


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
    await createEventMessage({
      userId,
      resourceId,
      eventSlug: 'no-pending-quests',
      eventName: 'Quests Not Pending',
      messageText: `Attempted to start "_${ questName }_", but it was not pending. It likely already started or was cancelled.`,
      shortMessage: 'Quests Not Pending',
      priority: 1,
    }).catch(() => {});
    if (removeThisCron) {
      await removeThisCron();
    }
    return { success: false };
  }

  const habiticaMemberInfo = await callHabiticaApi({
    method: 'GET',
    path: '/groups/party/members?includeAllPublicFields=true',
    habiticaUserId: habiticaUserId,
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
    if (nonResponders?.length > 0) {
      rsvpMessage = `\n<small>Unresponsive members: ${ nonResponders }</small>`;
    } else {
      rsvpMessage = 'All members responded';
    }
  } else {
    rsvpMessage = '(Unable to retrieve RSVP\'d statuses)';
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
    await createEventMessage({
      userId,
      resourceId,
      eventSlug: 'no-pending-quests',
      eventName: 'Quests Not Pending',
      messageText: `Attempted to start "_${ questName }_", but it was not pending. It likely already started or was cancelled.`,
      shortMessage: 'Quests Not Pending',
      priority: 1,
    }).catch(() => {});
    if (removeThisCron) {
      await removeThisCron();
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
    messageText: `Started the quest [(Wiki)](https://habitica.fandom.com/wiki/${ questUrl }). ${ rsvpMessage }`,
    shortMessage: 'Quest Auto-Started',
    priority: 1,
  }).catch(() => {});
  if (removeThisCron) {
    await removeThisCron();
  }
  return { success: true };
};
