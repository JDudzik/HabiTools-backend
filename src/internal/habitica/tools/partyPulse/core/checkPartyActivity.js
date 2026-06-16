import HabiticaTool from 'knex/models/HabiticaTool';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { returnOrSendResponse, handleApiAnalytic, handleApiError } from 'utils';


const MIN_CHECKS_FOR_CALIBRATION = 7;
const calculateScoreTier = (score) => {
  if (score >= 21) { return 3; }  // 21 to 28
  if (score >= 13) { return 2; }  // 13 to 20
  if (score >= 5) { return 1; }  // 5 to 12
  if (score >= -4) { return 0; }  // -4 to 4
  if (score >= -12) { return -1; } // -12 to -5
  if (score >= -20) { return -2; } // -20 to -13
  return -3; // -28 to -21
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

  // If last pulse was less than 23 hours ago, we skip this check.
  if (lastPulseAt && Date.now() - new Date(lastPulseAt).getTime() < 82800000) {
    return { success: null };
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
  if (!habiticaMemberInfo?.success) {
    if (habiticaMemberInfo?.code === 401 || habiticaMemberInfo?.code === 403) {
      handleApiError(new Error(`party-pulse-failed. ${ habiticaMemberInfo?.code }`), 'checkPartyActivity.party-pulse-failed');
      handleApiAnalytic(undefined, 'party-pulse-failed', JSON.stringify({
        code: habiticaMemberInfo?.code,
        habiticaResponse: habiticaMemberInfo,
        username: userData?.habitica_user_data?.username,
        email: userData?.habitica_user_data?.email,
      }));
    }
    return { success: false };
  }

  const updatedStoredMembersData = {};
  habiticaMemberInfo.data.forEach((habiticaMember) => {
    const matchingStoredMember = members?.[habiticaMember.id];
    const prevTotalChecks = (matchingStoredMember?.totalChecks || 0);
    const totalChecks = prevTotalChecks + 1;
    const isCalibrating = prevTotalChecks <= MIN_CHECKS_FOR_CALIBRATION;
    const isCalibrationTier = totalChecks <= MIN_CHECKS_FOR_CALIBRATION;
    const habiticaStats = `${ habiticaMember?.stats?.exp }:${ habiticaMember?.stats?.lvl }:${ habiticaMember?.stats?.toNextLevel }`;

    let newScore = matchingStoredMember?.currentScore || 0;
    const storedLoginCount = matchingStoredMember?.loginCount;
    const storedStats = matchingStoredMember?.currentStats;
    if (matchingStoredMember && storedLoginCount && storedStats) {
      // Login count check:
      const habiticaLoginCount = habiticaMember?.loginIncentives;
      const loginCountDifference = habiticaLoginCount === storedLoginCount
        ? -1
        : storedLoginCount
          ? (habiticaLoginCount - storedLoginCount)
          : 1;

      // Stats check:
      const statsDifference = habiticaStats === storedStats ? -1 : 1;

      // During calibration phase, we weight activity more heavily to quickly adjust scores to accurate tiers.
      const calibrationMultiplier = isCalibrating ? 2 : 1;
      const newScoreChange = (loginCountDifference + statsDifference) * calibrationMultiplier;
      newScore = newScore + newScoreChange;
    }

    const newScoreClamped = Math.max(Math.min(newScore, 35), -35);
    updatedStoredMembersData[habiticaMember.id] = {
      id: habiticaMember.id,
      loginCount: habiticaMember?.loginIncentives,
      totalChecks: totalChecks,
      currentScore: newScoreClamped,
      currentStats: habiticaStats,
      scoreTier: isCalibrationTier ? 'calibrating' : calculateScoreTier(newScoreClamped),
      username: habiticaMember.auth?.local?.username,
      displayName: habiticaMember.profile?.name,
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
    messageText: `Party Pulse has updated activity scores for ${ Object.keys(updatedStoredMembersData).length } members.`,
    shortMessage: 'Party Pulse Update',
    priority: 0,
  }).catch(() => {});

  return { success: true };
};
