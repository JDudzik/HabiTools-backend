import HabiticaTool from 'knex/models/HabiticaTool';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { getHabiticaContent } from 'internal/habitica/core/getHabiticaContent';
import { handleApiAnalytic, handleApiError, returnOrSendResponse } from 'utils';
import { setCron } from 'internal/cron/core/setCron';
import { deleteCrons } from 'internal/cron/core/deleteCrons';
import { startQuest } from './startQuest';



const sleep = ms => new Promise((resolve) => { setTimeout(resolve, ms); });

const checkIfAllPartyMembersAcceptedQuest = async ({ userId, habiticaUserId, expectedQuestKey }) => {
  const habiticaPartyInfo = await callHabiticaApi({
    method: 'GET',
    path: '/groups/party',
    habiticaUserId,
    userId,
    retryConfig: {
      retryOnNetworkError: true,
      retryOnRateLimit: true,
    },
  });

  if (!habiticaPartyInfo?.success) {
    return { shouldStartImmediately: false, skipTimer: false };
  }

  const currentQuestKey = habiticaPartyInfo?.data?.quest?.key;
  const isQuestActive = habiticaPartyInfo?.data?.quest?.active;

  if (!currentQuestKey || currentQuestKey !== expectedQuestKey || isQuestActive) {
    return { shouldStartImmediately: false, skipTimer: true };
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

  if (!habiticaMemberInfo?.success) {
    return { shouldStartImmediately: false, skipTimer: false };
  }

  const hasNonResponders = habiticaMemberInfo?.data?.some(member => member?.party?.quest?.RSVPNeeded === true);
  return {
    shouldStartImmediately: !hasNonResponders,
    skipTimer: false,
  };
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
    method: 'GET',
    path: '/groups/party',
    habiticaUserId: habiticaUserId,
    userId,
    retryConfig: {
      retryOnNetworkError: true,
      retryOnRateLimit: true,
    },
  });
  if (!habiticaPartyInfo?.success) {
    if (habiticaPartyInfo?.code === 401 || habiticaPartyInfo?.code === 403) {
      handleApiError(new Error(`auto-start-quests-webhook-failed. ${ habiticaPartyInfo?.code }`), 'startQuestStartTimer.auto-start-quests-webhook-failed');
      handleApiAnalytic(undefined, 'auto-start-quests-webhook-failed', JSON.stringify({
        code: habiticaPartyInfo?.code,
        habiticaPartyInfo,
        username: userData?.habitica_user_data?.username,
        email: userData?.habitica_user_data?.email,
      }));
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
  const toolData = selectedTool?.data;

  // Clear out any existing cron timers for this tool before starting a new one.
  await deleteCrons({ resourceId: resourceId, runCleanup: false });

  const questKey = habiticaPartyInfo?.data?.quest?.key;
  const isQuestActive = habiticaPartyInfo?.data?.quest?.active;

  if (!questKey || isQuestActive) {
    return { success: null };
  }

  const partyLeader = habiticaPartyInfo?.data?.leader?.id;
  const questLeader = habiticaPartyInfo?.data?.quest?.leader;
  const canStartQuest = questKey && (habiticaUserId === partyLeader || habiticaUserId === questLeader);
  if (!canStartQuest) {
    await createEventMessage({
      userId,
      resourceId,
      eventSlug: 'quest-auto-start-skipped',
      eventName: 'Skipped',
      messageText: 'Auto-start was skipped this time because you must either be the party leader or the quest leader.',
      shortMessage: 'Skipped',
      priority: 0,
    }).catch(() => {});
    return { success: null };
  }

  const contentResult = await getHabiticaContent({ dataItems: { quests: true }, language: userData?.habitica_user_data?.preferences?.language || 'en' });
  const questName = contentResult?.quests?.[questKey]?.text;
  const questUrl = questName?.replace(/\s+/g, '_');

  // Give auto-accept tools a short window to respond, then start immediately if everyone has accepted.
  await sleep(10000);
  const immediateStartCheck = await checkIfAllPartyMembersAcceptedQuest({
    userId,
    habiticaUserId,
    expectedQuestKey: questKey,
  });
  if (immediateStartCheck.shouldStartImmediately) {
    await startQuest({
      userId,
      resourceId,
      habiticaUserId,
      questKey,
      questName,
      questUrl,
    });
    return { success: true, startedImmediately: true };
  }

  if (immediateStartCheck.skipTimer) {
    return { success: null };
  }

  const waitHours = Number(toolData?.waitHours ?? 24);
  const finalWaitHours = Math.min(waitHours, 23); // This number is not the final cron number, it's the input for the delay function.
  await setCron({
    schedule: `RAND(0,9)-59/10 DELAY(15,${ finalWaitHours }) * * *`,
    userId,
    resourceId,
    taskName: 'auto-start-quests-launch',
    expiresAt: Date.now() + (5 * 24 * 60 * 60 * 1000), // 5 days
    isActive: true,
    immediateOnce: false,
    data: { habiticaUserId, questKey, questName, questUrl },
  });

  await createEventMessage({
    userId,
    resourceId,
    eventSlug: 'quest_timer_started',
    eventName: 'Timer Started',
    messageText: `<small>The automatic-start timer for your quest, [${ questName } (Wiki)](https://habitica.fandom.com/wiki/${ questUrl }), has been started. The quest will launch in ${ waitHours } hours.</small>`,
    shortMessage: 'Timer Started',
    priority: 1,
  }).catch(() => {});
  handleApiAnalytic(undefined, 'auto_start_quest_timer', JSON.stringify({
    userId,
    habitica_username: userData?.habitica_user_data?.username,
    habitica_email: userData?.habitica_user_data?.email,
    quest: {
      key: questKey,
      name: questName,
    },
    waitHours,
  }));

  return { success: true };
};