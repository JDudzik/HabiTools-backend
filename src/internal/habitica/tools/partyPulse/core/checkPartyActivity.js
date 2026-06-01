import HabiticaTool from 'knex/models/HabiticaTool';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { returnOrSendResponse } from 'utils';
import toolInvalidCredentials from '../../content/toolInvalidCredentials';


const calculateScoreTier = (score) => {
  if (score >= 11) { return 3; }
  if (score >= 7) { return 2; }
  if (score >= 3) { return 1; }
  if (score >= -2) { return 0; }
  if (score >= -6) { return -1; }
  if (score >= -10) { return -2; }
  return -3;
};

/**
 * Checks for a pending quest invitation for the linked Habitica account and accepts it if found. If the Habitica credentials are invalid or if there was an error during the process, sends a notification to the user and tears down the associated tool resources.
 * @param {Object} properties - The properties for accepting the pending quest.
 * @param {string} properties.userId - The user ID of the Habitools user.
 * @param {string} properties.resourceId - The ID of the associated tool resource.
 * @param {string} properties.habiticaUserId - The Habitica user ID to check for pending quests.
 * @returns {Promise<Object>} - A success message if a quest was accepted, or a failure message if no pending quest was found or if there was an error.
 */
export const checkPartyActivity = async ({ userId, resourceId, habiticaUserId }) => {
  const userData = await getLinkedHabiticaUser({ userId });
  if (userData?.code) { return returnOrSendResponse(userData.code, userData.responseContent); }

  const selectedTool = await HabiticaTool.query()
    .alias('tool')
    .joinRelated('habitica_user')
    .where('tool.id', resourceId)
    .whereNull('tool.deleted_at')
    .where('habitica_user.user_id', userId)
    .first();
  const { lastPulseAt, members } = selectedTool.data;

  // If last pulse was less than 23.5 hours ago, we skip this check.
  if (lastPulseAt && Date.now() - new Date(lastPulseAt).getTime() < 84600000) {
    return { success: null };
  }

  const habiticaMemberInfo = await callHabiticaApi({
    method: 'GET',
    path: '/groups/party/members?includeAllPublicFields=true',
    habiticaUserId: habiticaUserId,
    userId,
    retryOnNetworkError: true,
    retryOnRateLimit: true,
  });
  if (!habiticaMemberInfo?.success) {
    if (habiticaMemberInfo?.code === 401 || habiticaMemberInfo?.code === 403) {
      await createEventMessage({
        userId,
        resourceId,
        eventSlug: 'party-pulse-failed',
        eventName: 'Party Pulse Failed',
        messageText: toolInvalidCredentials('Party Pulse'),
        shortMessage: 'Party Pulse Failed',
        shouldNotify: true,
        shouldNotifyHabiticaViaAdmin: true,
        priority: 3,
      }).catch(() => {});
      await teardownToolResources({
        resourceId,
        userId,
      });
    }
    return { success: false };
  }

  const updatedStoredMembersData = {};
  habiticaMemberInfo.data.forEach((habiticaMember) => {
    const matchingStoredMember = members?.[habiticaMember.id];

    const hasRecentActivity = new Date(habiticaMember?.auth?.timestamps.loggedin).getTime() > Date.now() - 86400000; // 24 hours
    const currentScore = matchingStoredMember?.currentScore || 0;
    const newScore = hasRecentActivity ? (currentScore + 1) : (currentScore - 1);
    const newScoreLimited = Math.max(Math.min(newScore, 14), -14);

    updatedStoredMembersData[habiticaMember.id] = {
      id: habiticaMember.id,
      totalChecks: (matchingStoredMember?.totalChecks || 0) + 1,
      currentScore: newScoreLimited,
      scoreTier: calculateScoreTier(newScoreLimited),
      username: habiticaMember.auth?.local?.username || '',
      displayName: habiticaMember.profile?.name || '(unknown)',
      userUrl: `https://habitica.com/profile/${ habiticaMember.id }`,
    };
  });

  HabiticaTool.query()
    .patch({
      data: {
        ...selectedTool.data,
        lastPulseAt: new Date().toISOString(),
        members: updatedStoredMembersData,
      },
    })
    .where('id', resourceId)
    .then(() => {})
    .catch((err) => { throw [ err, 'checkPartyActivity.saveTool' ]; });

  await createEventMessage({
    userId,
    resourceId,
    eventSlug: 'party-pulse-update',
    eventName: 'Party Pulse Update',
    messageText: `Party Pulse has updated activitie scores for ${ Object.keys(updatedStoredMembersData).length } members.`,
    shortMessage: 'Party Pulse Update',
    priority: 0,
  }).catch(() => {});

  return { success: true };
};
