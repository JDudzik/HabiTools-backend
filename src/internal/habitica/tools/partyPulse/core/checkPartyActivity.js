import HabiticaTool from 'knex/models/HabiticaTool';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { returnOrSendResponse, handleApiAnalytic, handleApiError } from 'utils';


const scoreConfig = {
  calibrationDays: 7,
  calibrationWeight: 2,
  maxScore: 42,
  minScore: -42,
  login: { inc: 1, dec: -1 },
  lootDrop: { inc: 2, dec: -2 },
  sleep: {
    inc: 1,
    dec: -1,
    max: 14,
    min: 0,
  },
  activityHistory: {
    length: 30,
  },
};
const calculateScoreTier = (score) => {
  if (score >= 31) { return 3; }   // 31 to 42
  if (score >= 19) { return 2; }   // 19 to 30
  if (score >= 7) { return 1; }    // 7 to 18
  if (score >= -6) { return 0; }   // -6 to 6
  if (score >= -18) { return -1; } // -18 to -7
  if (score >= -30) { return -2; } // -30 to -19
  return -3;                       // -42 to -31
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
    const isCalibrating = prevTotalChecks <= scoreConfig.calibrationDays;
    const isCalibrationTier = totalChecks <= scoreConfig.calibrationDays;

    let newScore = matchingStoredMember?.currentScore || 0;
    const storedLoginCount = matchingStoredMember?.loginCount;
    if (matchingStoredMember && storedLoginCount) {
      // Login count check:
      const habiticaLoginCount = habiticaMember?.loginIncentives;
      const loginCountDifference = habiticaLoginCount === storedLoginCount
        ? scoreConfig.login.dec
        : (habiticaLoginCount - storedLoginCount) * scoreConfig.login.inc;

      // Loot drop check:
      const habiticaLootDropDate = habiticaMember?.items?.lastDrop?.date;
      const lootDropDifference = habiticaLootDropDate && (new Date() - new Date(habiticaLootDropDate)) < 172800000
        ? (scoreConfig.lootDrop.inc)
        : (scoreConfig.lootDrop.dec);

      // During calibration phase, we weight activity more heavily to quickly adjust scores to accurate tiers.
      const calibrationMultiplier = isCalibrating ? scoreConfig.calibrationWeight : 1;
      const newScoreChange = (loginCountDifference + lootDropDifference) * calibrationMultiplier;
      newScore = newScore + newScoreChange;
    }
    const newScoreClamped = Math.max(Math.min(newScore, scoreConfig.maxScore), scoreConfig.minScore);
    
    const newScoreHistory = matchingStoredMember?.scoreHistory || [];
    newScoreHistory.push(newScoreClamped);
    if (newScoreHistory.length > scoreConfig.activityHistory.length) {
      newScoreHistory.shift();
    }

    // Track days spent asleep:
    const storedSleepScore = matchingStoredMember?.sleepScore || 0;
    const isAsleep = habiticaMember?.preferences?.sleep;
    const sleepDifference = isAsleep ? scoreConfig.sleep.inc : scoreConfig.sleep.dec;
    const newSleepScore = Math.max(Math.min((storedSleepScore + sleepDifference), scoreConfig.sleep.max), scoreConfig.sleep.min);

    updatedStoredMembersData[habiticaMember.id] = {
      id: habiticaMember.id,
      loginCount: habiticaMember?.loginIncentives,
      totalChecks: totalChecks,
      currentScore: newScoreClamped,
      scoreHistory: newScoreHistory,
      scoreTier: isCalibrationTier ? 'calibrating' : calculateScoreTier(newScoreClamped),
      sleepScore: newSleepScore,
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
