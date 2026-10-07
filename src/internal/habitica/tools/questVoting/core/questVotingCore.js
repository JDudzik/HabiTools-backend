import crypto from 'crypto';
import QuestVoting from 'knex/models/QuestVoting';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { getHabiticaPartyInfo } from 'internal/habitica/methods/getHabiticaPartyInfo';
import { getHabiticaContent } from 'internal/habitica/core/getHabiticaContent';
import { modifyToolInstanceData } from 'internal/habitica/methods/modifyToolInstanceData';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import questVotingBallotMessageContent from 'internal/habitica/core/content/questVotingBallotMessage';
import questVotingFailedBallotNoQuestsMessage from 'internal/habitica/core/content/questVotingFailedBallotNoQuestsMessage';
import { sanitizeProperties, isUUID, optional, returnOrSendResponse } from 'utils';

const TOOL_SLUG = 'quest-voting';

const PARTY_FILTERS = [ 'all', 'pets-only' ];
const USER_FILTERS = [ 'normal', 'pets', 'time-traveler' ];
const QUEST_CATEGORY_TO_BUCKET = {
  gold: 'normal',
  unlockable: 'normal',
  world: 'normal',
  pet: 'pets',
  hatchingPotion: 'pets',
  timeTravelers: 'time-traveler',
};

const ensureArray = value => (Array.isArray(value) ? value : []);

const normalizeUserFilters = (input) => {
  const raw = ensureArray(input);
  const normalized = raw
    .map(item => String(item || '').toLowerCase())
    .filter(item => USER_FILTERS.includes(item));

  if (normalized.length === 0) {
    return [ 'normal', 'pets', 'time-traveler' ];
  }

  return Array.from(new Set(normalized));
};

const normalizePartyFilter = input => (PARTY_FILTERS.includes(input) ? input : 'all');

const normalizeHistory = voteHistory => ensureArray(voteHistory).slice(-10);

const randomItem = (arr) => {
  if (!arr?.length) { return null; }
  return arr[Math.floor(Math.random() * arr.length)];
};

const pickRandomUnique = ({ options, count }) => {
  const cloned = [ ...options ];
  const selected = [];

  while (cloned.length > 0 && selected.length < count) {
    const index = Math.floor(Math.random() * cloned.length);
    const item = cloned.splice(index, 1)[0];
    selected.push(item);
  }

  return selected;
};

const getQuestBucket = questCategory => QUEST_CATEGORY_TO_BUCKET[questCategory] || 'normal';

const canQuestPassPartyFilter = ({ questBucket, partyFilter }) => {
  if (partyFilter === 'pets-only') {
    return questBucket === 'pets' || questBucket === 'time-traveler';
  }

  return true;
};

const safeQuestCount = (value) => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) { return 0; }
  return parsed;
};

const getWeightedRandom = (options) => {
  const validOptions = ensureArray(options).filter(option => option.weight > 0);
  const totalWeight = validOptions.reduce((sum, option) => sum + option.weight, 0);
  if (!totalWeight) { return null; }

  const target = Math.random() * totalWeight;
  let running = 0;

  for (const option of validOptions) {
    running += option.weight;
    if (running >= target) {
      return option;
    }
  }

  return validOptions[validOptions.length - 1] || null;
};

const generateWikiLink = (questName) => {
  if (!questName) { return 'Unknown Quest'; }
  const questUrl = `https://habitica.fandom.com/wiki/${ questName.replace(/\s+/g, '_') }`;
  if (!questUrl) { return 'Unknown Quest'; }
  return `[${ questName }](${ questUrl })`;
};

const getVoteUrl = ({ partyInternalId, selectionId }) => {
  const base = process.env.FRONTEND_HOST || 'https://habitools.online';
  const query = `party_id=${ encodeURIComponent(partyInternalId) }&selection_id=${ encodeURIComponent(selectionId) }`;
  return `${ base }/tools/quest-voting/vote?${ query }`;
};

const sendPartyMessage = async ({
  userId,
  habiticaUserId,
  message,
}) => {
  if (!userId || !habiticaUserId || !message) { return false; }

  const result = await callHabiticaApi({
    method: 'POST',
    path: '/groups/party/chat',
    body: { message },
    userId,
    habiticaUserId,
    retryConfig: {
      retryOnNetworkError: true,
      retryOnRateLimit: true,
    },
  });

  return !!result?.success;
};

export const emitSharedEventMessage = async ({ questVoting, eventSlug, eventName, messageText, shortMessage, priority = 1 }) => {
  const participants = ensureArray(questVoting?.participants);

  await Promise.all(participants.map(async (participant) => {
    if (!participant?.userId) { return; }

    await createEventMessage({
      userId: participant.userId,
      resourceId: questVoting.id,
      eventSlug,
      eventName,
      messageText,
      shortMessage,
      priority,
    }).catch(() => {});
  }));
};

export const getToolDataFromInput = ({
  filterCategories,
  leaveOnePerQuest,
  partyWideFilter,
  secureVoting,
}) => {
  return {
    filterCategories: normalizeUserFilters(filterCategories),
    leaveOnePerQuest: !!leaveOnePerQuest,
    ...(partyWideFilter ? { partyWideFilter: normalizePartyFilter(partyWideFilter) } : {}),
    ...(secureVoting !== undefined ? { secureVoting: !!secureVoting } : {}),
  };
};

export const getUserQuestVotingTool = (linkedHabiticaUser) => {
  const tools = ensureArray(linkedHabiticaUser?.habitica_tools)
    .filter(tool => tool?.tool_slug === TOOL_SLUG)
    .filter(tool => tool?.deleted_at === null || tool?.deleted_at === undefined)
    .filter((tool) => {
      return !tool?.expires_at || tool.expires_at > Date.now();
    });

  return tools[0] || null;
};

const upsertParticipant = ({ questVoting, participant }) => {
  const participants = ensureArray(questVoting?.participants);
  const existingIndex = participants.findIndex(item => item?.userId === participant.userId);

  if (existingIndex >= 0) {
    participants[existingIndex] = {
      ...participants[existingIndex],
      ...participant,
    };
    return participants;
  }

  return [ ...participants, participant ];
};

const buildParticipantFromUser = ({ linkedHabiticaUser, toolInstance, toolData, isLeader }) => {
  return {
    userId: linkedHabiticaUser.user_id,
    habiticaUserId: linkedHabiticaUser.habitica_user_id,
    username: linkedHabiticaUser?.habitica_user_data?.username || null,
    displayName: linkedHabiticaUser?.habitica_user_data?.profile?.name || linkedHabiticaUser?.habitica_user_data?.username || null,
    toolResourceId: toolInstance.id,
    filterCategories: normalizeUserFilters(toolData?.filterCategories),
    leaveOnePerQuest: !!toolData?.leaveOnePerQuest,
    isLeader,
    updatedAt: Date.now(),
  };
};

const getQuestPool = async ({ questVoting, forceRefresh = true }) => {
  const partyFilter = normalizePartyFilter(questVoting?.party_filters?.partyWideFilter || 'all');
  const participantSnapshots = [];
  const questsByKey = {};

  const content = await getHabiticaContent({
    dataItems: { quests: true },
    language: 'en',
  });
  const allQuestContent = content?.quests || {};

  const participants = ensureArray(questVoting?.participants);

  for (const participant of participants) {
    if (!participant?.userId || !participant?.habiticaUserId) { continue; }

    const linkedUser = await getLinkedHabiticaUser({
      userId: participant.userId,
      forceRefresh,
    });
    if (linkedUser?.code) { continue; }

    const partyId = linkedUser?.habitica_user_data?.party?._id;
    if (!partyId || partyId !== questVoting.party_habitica_id) { continue; }

    const userQuestInventory = linkedUser?.habitica_user_data?.items?.quests || {};
    const userFilters = normalizeUserFilters(participant.filterCategories);
    const minimumCount = participant?.leaveOnePerQuest ? 2 : 1;

    participantSnapshots.push({
      participant,
      linkedUser,
      questInventory: userQuestInventory,
      userFilters,
      minimumCount,
    });

    Object.keys(userQuestInventory).forEach((questKey) => {
      const questCount = safeQuestCount(userQuestInventory[questKey]);
      if (!questCount || questCount < minimumCount) { return; }

      const questContent = allQuestContent?.[questKey];
      const questCategory = questContent?.category;
      const questBucket = getQuestBucket(questCategory);

      if (!canQuestPassPartyFilter({ questBucket, partyFilter })) { return; }
      if (!userFilters.includes(questBucket)) { return; }

      if (!questsByKey[questKey]) {
        questsByKey[questKey] = {
          questKey,
          questName: questContent?.text || questKey,
          questCategory,
          questBucket,
          hosts: [],
        };
      }

      questsByKey[questKey].hosts.push({
        participant,
        linkedUser,
        questCount,
      });
    });
  }

  const questOptions = Object.values(questsByKey);
  return {
    questOptions,
    participantSnapshots,
  };
};

const buildVoteMessage = ({ questVoting, options, hiddenOption }) => {
  const lines = [
    questVotingBallotMessageContent.trim(),
    '',
  ];

  const hasLimitedRoster = options.length < 3 || !hiddenOption;
  if (hasLimitedRoster) {
    lines.push('**Note:** There aren\'t enough quests in the party roster to provide a full ballot, so options are limited.');
    lines.push('');
  }

  options.forEach((option, index) => {
    const voteUrl = getVoteUrl({ partyInternalId: questVoting.id, selectionId: option.id });
    lines.push(`${ index + 1 }. [[**Vote**]](${ voteUrl }) **•**  _${ generateWikiLink(option.questName) }_`);
  });

  if (hiddenOption) {
    const hiddenVoteUrl = getVoteUrl({ partyInternalId: questVoting.id, selectionId: hiddenOption.id });
    lines.push(`4. [[**Vote**]](${ hiddenVoteUrl }) **•** _Other Random Option_`);
  }

  return lines.join('\n');
};

const selectCandidatesForBallot = ({ questVoting, questOptions }) => {
  const recentSelections = normalizeHistory(questVoting.vote_history)
    .slice(-3)
    .map(item => item?.chosenQuestKey)
    .filter(Boolean);

  let candidatePool = [ ...questOptions ];

  if (questOptions.length >= 6) {
    const withoutRecent = questOptions.filter(item => !recentSelections.includes(item.questKey));
    if (withoutRecent.length > 0) {
      candidatePool = withoutRecent;
    }
  }

  const displayed = pickRandomUnique({ options: candidatePool, count: 3 });

  const remaining = candidatePool.filter(candidate => !displayed.some(selected => selected.questKey === candidate.questKey));

  const hidden = candidatePool.length >= 4
    ? randomItem(remaining)
    : null;

  return {
    displayed,
    hidden,
    candidatePool,
  };
};

const createBallotAndBroadcast = async ({ questVoting, source }) => {
  if (questVoting.paused) {
    return { success: true, skipped: 'paused' };
  }

  const { questOptions } = await getQuestPool({ questVoting, forceRefresh: true });

  if (questOptions.length === 0) {
    const pausedQuestVoting = await QuestVoting.query().patchAndFetchById(questVoting.id, {
      updated_at: Date.now(),
      paused: true,
      active_ballot: null,
      vote_links: [],
    });

    await sendPartyMessage({
      userId: pausedQuestVoting.leader_user_id,
      habiticaUserId: pausedQuestVoting.leader_habitica_user_id,
      message: questVotingFailedBallotNoQuestsMessage,
    });

    await emitSharedEventMessage({
      questVoting: pausedQuestVoting,
      eventSlug: 'quest-voting-no-options',
      eventName: 'No Eligible Quests',
      messageText: 'No eligible quests were available when trying to open a ballot.',
      shortMessage: 'No eligible quests were available.',
      priority: 1,
    });

    return { success: true, questVoting: pausedQuestVoting, skipped: 'no-eligible-quests' };
  }

  const selection = selectCandidatesForBallot({ questVoting, questOptions });

  const createVoteLink = (candidate, isHiddenRandom = false) => ({
    id: crypto.randomUUID(),
    questKey: candidate.questKey,
    questName: candidate.questName,
    isHiddenRandom,
    votes: [],
  });

  const optionLinks = selection.displayed.map(option => createVoteLink(option, false));
  const hiddenLink = selection.hidden ? createVoteLink(selection.hidden, true) : null;

  const now = Date.now();

  const activeBallot = {
    id: crypto.randomUUID(),
    status: 'open',
    createdAt: now,
    source,
    options: optionLinks,
    hiddenOption: hiddenLink,
    totalEligibleQuests: questOptions.length,
  };

  const updated = await QuestVoting.query().patchAndFetchById(questVoting.id, {
    updated_at: now,
    active_ballot: activeBallot,
    vote_links: [ ...optionLinks, ...(hiddenLink ? [ hiddenLink ] : []) ],
    last_vote_opened_at: now,
  });

  const voteMessage = buildVoteMessage({
    questVoting: updated,
    options: optionLinks,
    hiddenOption: hiddenLink,
  });

  await sendPartyMessage({
    userId: updated.leader_user_id,
    habiticaUserId: updated.leader_habitica_user_id,
    message: voteMessage,
  });

  await emitSharedEventMessage({
    questVoting: updated,
    eventSlug: 'quest-voting-ballot-opened',
    eventName: 'Ballot Opened',
    messageText: `A new quest ballot has opened with ${ optionLinks.length } visible options${ hiddenLink ? ' and an Other Random option' : '' }.`,
    shortMessage: 'A new ballot is open.',
    priority: 1,
  });

  return { success: true, questVoting: updated };
};

const getRecentHostPenaltyMap = (questVoting) => {
  const recent = normalizeHistory(questVoting.vote_history).slice(-3);
  const penalties = new Set();
  recent.forEach((entry) => {
    if (entry?.selectedHostHabiticaUserId) {
      penalties.add(entry.selectedHostHabiticaUserId);
    }
  });

  return penalties;
};

const tryStartQuestFromCandidate = async ({ questVoting, candidateQuestKey, candidateQuestName }) => {
  const recentPenalty = getRecentHostPenaltyMap(questVoting);

  const { questOptions } = await getQuestPool({ questVoting, forceRefresh: true });
  const candidate = questOptions.find(option => option.questKey === candidateQuestKey);

  if (!candidate || candidate.hosts.length === 0) {
    return { success: false, reason: 'no-hosts-available' };
  }

  const remainingHosts = [ ...candidate.hosts ];

  while (remainingHosts.length > 0) {
    const weightedHosts = remainingHosts.map((host) => {
      const penaltyMultiplier = recentPenalty.has(host.participant.habiticaUserId) ? 0.2 : 1.0;
      return {
        ...host,
        weight: Math.max(1, host.questCount) * penaltyMultiplier,
      };
    });

    const selectedHost = getWeightedRandom(weightedHosts);
    if (!selectedHost) { break; }

    const startResult = await callHabiticaApi({
      method: 'POST',
      path: `/groups/party/quests/invite/${ candidateQuestKey }`,
      userId: selectedHost.participant.userId,
      habiticaUserId: selectedHost.participant.habiticaUserId,
      retryConfig: {
        retryOnNetworkError: true,
        retryOnRateLimit: true,
      },
    });

    if (startResult?.success) {
      return {
        success: true,
        selectedHost,
        candidateQuestKey,
        candidateQuestName,
      };
    }

    const removeIndex = remainingHosts.findIndex(item => item.participant.userId === selectedHost.participant.userId);
    if (removeIndex >= 0) {
      remainingHosts.splice(removeIndex, 1);
    } else {
      break;
    }
  }

  return { success: false, reason: 'all-hosts-failed' };
};

const finalizeBallotAndStartQuest = async ({ questVoting }) => {
  const activeBallot = questVoting?.active_ballot;
  if (!activeBallot) { return { success: true, skipped: 'no-active-ballot' }; }

  const voteLinks = ensureArray(questVoting.vote_links);
  const tallies = voteLinks.map(option => ({
    selectionId: option.id,
    questKey: option.questKey,
    questName: option.questName,
    isHiddenRandom: !!option.isHiddenRandom,
    votes: ensureArray(option.votes).length,
  }));

  if (tallies.length === 0) {
    return { success: true, skipped: 'no-ballot-options' };
  }

  const randomizedTallies = [ ...tallies ].sort(() => Math.random() - 0.5);
  randomizedTallies.sort((a, b) => b.votes - a.votes);

  let startedQuest = null;
  let startedFrom = null;

  for (const candidate of randomizedTallies) {
    const attempt = await tryStartQuestFromCandidate({
      questVoting,
      candidateQuestKey: candidate.questKey,
      candidateQuestName: candidate.questName,
    });

    if (attempt.success) {
      startedQuest = candidate;
      startedFrom = attempt.selectedHost;
      break;
    }
  }

  const now = Date.now();

  if (!startedQuest || !startedFrom) {
    const cleared = await QuestVoting.query().patchAndFetchById(questVoting.id, {
      updated_at: now,
      active_ballot: null,
      vote_links: [],
      last_vote_closed_at: now,
    });

    await sendPartyMessage({
      userId: cleared.leader_user_id,
      habiticaUserId: cleared.leader_habitica_user_id,
      message: 'Quest Voting could not start a quest because no valid host could be found for the current ballot options.',
    });

    await emitSharedEventMessage({
      questVoting: cleared,
      eventSlug: 'quest-voting-no-host',
      eventName: 'Unable to Start Quest',
      messageText: 'A ballot concluded, but no eligible participant could host any of the top options.',
      shortMessage: 'Ballot ended with no valid host.',
      priority: 2,
    });

    return { success: true, questVoting: cleared };
  }

  const topVoted = randomizedTallies[0];
  const usedRunnerUp = topVoted.questKey !== startedQuest.questKey;

  const historyEntry = {
    id: crypto.randomUUID(),
    finalizedAt: now,
    chosenQuestKey: startedQuest.questKey,
    chosenQuestName: startedQuest.questName,
    selectedHostUserId: startedFrom.participant.userId,
    selectedHostHabiticaUserId: startedFrom.participant.habiticaUserId,
    selectedHostName: startedFrom.participant.displayName || startedFrom.participant.username || 'Unknown',
    tallies,
  };

  const nextHistory = normalizeHistory([ ...ensureArray(questVoting.vote_history), historyEntry ]);

  const updated = await QuestVoting.query().patchAndFetchById(questVoting.id, {
    updated_at: now,
    active_ballot: null,
    vote_links: [],
    vote_history: nextHistory,
    last_vote_closed_at: now,
  });

  let message = `Quest Voting started ${ generateWikiLink(startedQuest.questName) } from ${ startedFrom.participant.displayName || startedFrom.participant.username || 'a party member' }.`;
  if (usedRunnerUp) {
    message = `${ message }\n\nNote: the highest-voted quest was unavailable at launch time, so a runner-up was used.`;
  }

  await sendPartyMessage({
    userId: updated.leader_user_id,
    habiticaUserId: updated.leader_habitica_user_id,
    message,
  });

  await emitSharedEventMessage({
    questVoting: updated,
    eventSlug: 'quest-voting-quest-opened',
    eventName: 'Quest Opened',
    messageText: `${ generateWikiLink(startedQuest.questName) } was opened from ${ startedFrom.participant.displayName || startedFrom.participant.username || 'a party member' }.`,
    shortMessage: `${ startedQuest.questName } was opened.`,
    priority: 1,
  });

  return { success: true, questVoting: updated, startedQuest };
};

const refreshLeaderAssignmentIfNeeded = async ({
  questVoting,
  suppressPauseOnMissingPartyInfo = false,
}) => {
  if (!questVoting?.leader_user_id) { return { questVoting }; }

  let partyInfo = await getHabiticaPartyInfo({ userId: questVoting.leader_user_id, forceRefresh: true });

  if (!partyInfo?.code && partyInfo?.leaderHabiticaUserId === questVoting.leader_habitica_user_id) {
    return { questVoting, partyInfo };
  }

  const participants = ensureArray(questVoting.participants);

  for (const participant of participants) {
    const probe = await getHabiticaPartyInfo({ userId: participant.userId, forceRefresh: true });
    if (probe?.code) { continue; }
    partyInfo = probe;
    break;
  }

  if (!partyInfo || partyInfo?.code) {
    if (suppressPauseOnMissingPartyInfo) {
      return { questVoting, partyInfo: null };
    }

    const updated = await QuestVoting.query().patchAndFetchById(questVoting.id, {
      updated_at: Date.now(),
      paused: true,
      leader_user_id: null,
      leader_habitica_user_id: null,
      leader_tool_resource_id: null,
    });

    return { questVoting: updated, partyInfo: null };
  }

  const newLeaderParticipant = participants.find(participant => participant.habiticaUserId === partyInfo.leaderHabiticaUserId);
  const updated = await QuestVoting.query().patchAndFetchById(questVoting.id, {
    updated_at: Date.now(),
    leader_user_id: newLeaderParticipant?.userId || null,
    leader_habitica_user_id: partyInfo.leaderHabiticaUserId || null,
    leader_tool_resource_id: newLeaderParticipant?.toolResourceId || null,
  });

  return {
    questVoting: updated,
    partyInfo,
  };
};

export const processPartyQuestState = async ({
  questVoting,
  source,
  suppressPauseOnMissingPartyInfo = false,
  fallbackPartyInfo = null,
  forceInitialBallotOpen = false,
}) => {
  const refreshedLeader = await refreshLeaderAssignmentIfNeeded({
    questVoting,
    suppressPauseOnMissingPartyInfo,
  });
  const currentQuestVoting = refreshedLeader.questVoting;
  let partyInfo = refreshedLeader.partyInfo;

  if (!partyInfo?.partyData && suppressPauseOnMissingPartyInfo && fallbackPartyInfo?.partyData) {
    partyInfo = fallbackPartyInfo;
  }

  if (!partyInfo?.partyData) {
    return { success: true, skipped: 'no-party-info' };
  }

  const currentQuestState = {
    key: partyInfo?.partyData?.quest?.key || null,
    active: !!partyInfo?.partyData?.quest?.active,
  };

  const previousQuestState = currentQuestVoting?.last_known_quest || null;
  let activeQuestVoting = currentQuestVoting;

  if (previousQuestState?.active && !currentQuestState.active) {
    const finalizeResult = await finalizeBallotAndStartQuest({ questVoting: activeQuestVoting });
    if (finalizeResult?.questVoting) {
      activeQuestVoting = finalizeResult.questVoting;
    }
  }

  const shouldForceInitialBallotOpen = forceInitialBallotOpen
    && !previousQuestState
    && !activeQuestVoting?.active_ballot;

  const shouldOpenNewBallot = shouldForceInitialBallotOpen
    || (!previousQuestState?.active && currentQuestState.active)
    || (!activeQuestVoting?.active_ballot && currentQuestState.active);

  if (shouldOpenNewBallot && !activeQuestVoting.paused) {
    const openBallotResult = await createBallotAndBroadcast({
      questVoting: activeQuestVoting,
      source,
    });

    if (openBallotResult?.questVoting) {
      activeQuestVoting = openBallotResult.questVoting;
    }
  }

  const finalQuestVoting = await QuestVoting.query().patchAndFetchById(activeQuestVoting.id, {
    updated_at: Date.now(),
    party_name: partyInfo?.name || activeQuestVoting.party_name,
    last_known_quest: currentQuestState,
  });

  return { success: true, questVoting: finalQuestVoting };
};

export const updateParticipantInQuestVoting = async ({
  linkedHabiticaUser,
  toolInstance,
  toolData,
  partyInfo,
  isLeader,
}) => {
  const now = Date.now();

  let questVoting = await QuestVoting.query()
    .where('party_habitica_id', partyInfo.partyId)
    .whereNull('deleted_at')
    .first();

  const participant = buildParticipantFromUser({
    linkedHabiticaUser,
    toolInstance,
    toolData,
    isLeader,
  });

  const previousLeaderUserId = questVoting?.leader_user_id;

  if (!questVoting) {
    questVoting = await QuestVoting.query().insertAndFetch({
      created_at: now,
      updated_at: now,
      party_habitica_id: partyInfo.partyId,
      party_name: partyInfo.name,
      leader_user_id: isLeader ? linkedHabiticaUser.user_id : null,
      leader_habitica_user_id: isLeader ? linkedHabiticaUser.habitica_user_id : null,
      leader_tool_resource_id: isLeader ? toolInstance.id : null,
      paused: false,
      secure_voting: toolData?.secureVoting !== undefined ? !!toolData.secureVoting : true,
      party_filters: {
        partyWideFilter: normalizePartyFilter(toolData?.partyWideFilter || 'all'),
      },
      participants: [ participant ],
      active_ballot: null,
      vote_links: [],
      vote_history: [],
      last_known_quest: null,
      last_vote_opened_at: null,
      last_vote_closed_at: null,
    });

    return {
      questVoting,
      isNewQuestVoting: true,
      previousLeaderUserId,
    };
  }

  const nextParticipants = upsertParticipant({
    questVoting,
    participant,
  }).map((item) => {
    return {
      ...item,
      isLeader: isLeader ? item.userId === linkedHabiticaUser.user_id : item.isLeader,
    };
  });

  const patchPayload = {
    updated_at: now,
    party_name: partyInfo.name,
    participants: nextParticipants,
  };

  if (isLeader) {
    patchPayload.leader_user_id = linkedHabiticaUser.user_id;
    patchPayload.leader_habitica_user_id = linkedHabiticaUser.habitica_user_id;
    patchPayload.leader_tool_resource_id = toolInstance.id;
    patchPayload.party_filters = {
      partyWideFilter: normalizePartyFilter(toolData?.partyWideFilter || questVoting?.party_filters?.partyWideFilter || 'all'),
    };

    if (toolData?.secureVoting !== undefined) {
      patchPayload.secure_voting = !!toolData.secureVoting;
    }
  }

  const updated = await QuestVoting.query().patchAndFetchById(questVoting.id, patchPayload);

  return {
    questVoting: updated,
    isNewQuestVoting: false,
    previousLeaderUserId,
  };
};

export const getQuestVotingStateForUser = async ({ userId }) => {
  const partyInfo = await getHabiticaPartyInfo({ userId, forceRefresh: false });
  if (partyInfo?.code) { return partyInfo; }

  const questVoting = await QuestVoting.query()
    .where('party_habitica_id', partyInfo.partyId)
    .whereNull('deleted_at')
    .first();

  if (!questVoting) {
    return {
      success: true,
      questVoting: null,
      partyInfo,
    };
  }

  const isParticipant = ensureArray(questVoting.participants).some(item => item?.userId === userId);

  return {
    success: true,
    questVoting,
    partyInfo,
    isParticipant,
    isLeader: questVoting?.leader_user_id === userId,
  };
};

export const editQuestVotingTool = async ({ userId, payload }) => {
  const sanitizedPayload = sanitizeProperties(payload || {}, {
    optionalKeys: [ 'filter_categories', 'leave_one_per_quest', 'party_wide_filter', 'secure_voting' ],
    parseBools: true,
    trimPayload: true,
    removeDisallowedKeys: true,
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  const linkedHabiticaUser = await getLinkedHabiticaUser({ userId, forceRefresh: false });
  if (linkedHabiticaUser?.code) { return linkedHabiticaUser; }

  const toolInstance = getUserQuestVotingTool(linkedHabiticaUser);
  if (!toolInstance?.id) {
    return returnOrSendResponse(404, {
      status: 'QUEST_VOTING_NOT_ACTIVE',
      message: 'Quest Voting is not active for this account.',
    });
  }

  const toolDataPatch = getToolDataFromInput({
    filterCategories: sanitizedProperties.filter_categories,
    leaveOnePerQuest: sanitizedProperties.leave_one_per_quest,
    partyWideFilter: sanitizedProperties.party_wide_filter,
    secureVoting: sanitizedProperties.secure_voting,
  });

  const modifyResult = await modifyToolInstanceData({
    userId,
    resourceId: toolInstance.id,
    toolData: {
      ...(toolInstance?.data || {}),
      ...toolDataPatch,
    },
    eventMessage: {
      messageText: '<small>Quest Voting settings were updated.</small>',
      shortMessage: 'Quest Voting settings updated.',
    },
  });
  if (modifyResult?.code) { return modifyResult; }

  const partyInfo = await getHabiticaPartyInfo({ userId, forceRefresh: false });
  if (partyInfo?.code) { return partyInfo; }

  let questVoting = await QuestVoting.query()
    .where('party_habitica_id', partyInfo.partyId)
    .whereNull('deleted_at')
    .first();

  if (!questVoting) {
    return returnOrSendResponse(404, {
      status: 'QUEST_VOTING_PARTY_NOT_FOUND',
      message: 'Quest Voting has not been initialized for this party yet.',
    });
  }

  const participants = ensureArray(questVoting.participants);
  const participantIndex = participants.findIndex(item => item?.userId === userId);

  if (participantIndex >= 0) {
    participants[participantIndex] = {
      ...participants[participantIndex],
      filterCategories: normalizeUserFilters(toolDataPatch.filterCategories || participants[participantIndex].filterCategories),
      leaveOnePerQuest: toolDataPatch.leaveOnePerQuest !== undefined
        ? !!toolDataPatch.leaveOnePerQuest
        : !!participants[participantIndex].leaveOnePerQuest,
      updatedAt: Date.now(),
    };
  }

  const patch = {
    updated_at: Date.now(),
    participants,
  };

  if (questVoting.leader_user_id === userId) {
    patch.party_filters = {
      partyWideFilter: normalizePartyFilter(toolDataPatch.partyWideFilter || questVoting?.party_filters?.partyWideFilter || 'all'),
    };

    if (toolDataPatch.secureVoting !== undefined) {
      patch.secure_voting = !!toolDataPatch.secureVoting;
    }
  }

  questVoting = await QuestVoting.query().patchAndFetchById(questVoting.id, patch);

  return {
    success: true,
    questVoting,
  };
};

export const removeParticipantFromQuestVoting = async ({ questVoting, userId }) => {
  const updatedParticipants = ensureArray(questVoting.participants)
    .filter(item => item?.userId !== userId);

  if (updatedParticipants.length === 0) {
    await QuestVoting.query().deleteById(questVoting.id);
    return {
      deletedQuestVoting: true,
      questVoting: null,
      participants: [],
    };
  }

  const nextLeader = questVoting.leader_user_id === userId
    ? updatedParticipants.find(item => item?.habiticaUserId === questVoting.leader_habitica_user_id) || null
    : null;

  const patch = {
    updated_at: Date.now(),
    participants: updatedParticipants,
  };

  if (questVoting.leader_user_id === userId) {
    patch.leader_user_id = nextLeader?.userId || null;
    patch.leader_habitica_user_id = nextLeader?.habiticaUserId || null;
    patch.leader_tool_resource_id = nextLeader?.toolResourceId || null;
    patch.paused = true;
  }

  const updatedQuestVoting = await QuestVoting.query().patchAndFetchById(questVoting.id, patch);

  return {
    deletedQuestVoting: false,
    questVoting: updatedQuestVoting,
    participants: updatedParticipants,
  };
};

export const setQuestVotingPauseState = async ({ userId, paused, unpauseMode }) => {
  const partyInfo = await getHabiticaPartyInfo({ userId, forceRefresh: false });
  if (partyInfo?.code) { return partyInfo; }

  const questVoting = await QuestVoting.query()
    .where('party_habitica_id', partyInfo.partyId)
    .whereNull('deleted_at')
    .first();

  if (!questVoting) {
    return returnOrSendResponse(404, {
      status: 'QUEST_VOTING_NOT_FOUND',
      message: 'No Quest Voting setup exists for your current party.',
    });
  }

  if (questVoting.leader_user_id !== userId) {
    return returnOrSendResponse(403, {
      status: 'NOT_PARTY_LEADER',
      message: 'Only the party leader can pause or unpause Quest Voting.',
    });
  }

  let updated = await QuestVoting.query().patchAndFetchById(questVoting.id, {
    updated_at: Date.now(),
    paused: !!paused,
  });

  if (!paused) {
    const shouldStartFreshBallot = unpauseMode === 'new-vote' || !updated?.active_ballot;

    if (shouldStartFreshBallot) {
      updated = await QuestVoting.query().patchAndFetchById(questVoting.id, {
        updated_at: Date.now(),
        active_ballot: null,
        vote_links: [],
      });

      await createBallotAndBroadcast({
        questVoting: updated,
        source: unpauseMode === 'new-vote' ? 'unpause-new-vote' : 'unpause-resume-last',
      });
    }
  }

  return {
    success: true,
    questVoting: updated,
  };
};

export const castQuestVotingVote = async ({ partyInternalId, selectionId, userId }) => {
  const sanitizedPayload = sanitizeProperties({ partyInternalId, selectionId, userId }, {
    requiredKeys: [ 'partyInternalId', 'selectionId' ],
    optionalKeys: [ 'userId' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isUUID('partyInternalId', 'party_id must be a valid UUID'),
      isUUID('selectionId', 'selection_id must be a valid UUID'),
      optional(isUUID('userId', 'userId must be a valid UUID')),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  const questVoting = await QuestVoting.query().findById(sanitizedProperties.partyInternalId);

  if (!questVoting) {
    return returnOrSendResponse(404, {
      status: 'QUEST_VOTING_NOT_FOUND',
      message: 'The vote link is invalid. The party record could not be found.',
    });
  }

  const voteLinks = ensureArray(questVoting.vote_links);
  const selectedIndex = voteLinks.findIndex(option => option?.id === sanitizedProperties.selectionId);

  if (selectedIndex < 0) {
    return returnOrSendResponse(404, {
      status: 'VOTE_SELECTION_INVALID',
      message: 'This vote selection link is invalid.',
    });
  }

  const selectedOption = voteLinks[selectedIndex];

  let resolvedHabiticaUserId = false;
  let resolvedUserId = false;

  if (questVoting.secure_voting) {
    if (!sanitizedProperties.userId) {
      return returnOrSendResponse(401, {
        status: 'QUEST_VOTE_LOGIN_REQUIRED',
        message: 'You must be logged in and linked to Habitica to vote in secure mode.',
      });
    }

    const linkedUser = await getLinkedHabiticaUser({ userId: sanitizedProperties.userId, forceRefresh: true });
    if (linkedUser?.code) {
      return returnOrSendResponse(401, {
        status: 'QUEST_VOTE_LINK_REQUIRED',
        message: 'You must link your Habitica account to vote in secure mode.',
      });
    }

    const linkedPartyId = linkedUser?.habitica_user_data?.party?._id;
    if (!linkedPartyId || linkedPartyId !== questVoting.party_habitica_id) {
      return returnOrSendResponse(403, {
        status: 'QUEST_VOTE_NOT_PARTY_MEMBER',
        message: 'Only members of this party can vote in secure mode.',
      });
    }

    resolvedHabiticaUserId = linkedUser.habitica_user_id;
    resolvedUserId = linkedUser.user_id;

    const hasExistingVote = voteLinks.some((option) => {
      return ensureArray(option.votes).some(vote => vote?.habiticaUserId === resolvedHabiticaUserId);
    });

    if (hasExistingVote) {
      return returnOrSendResponse(409, {
        status: 'QUEST_VOTE_ALREADY_CAST',
        message: 'You already voted in this ballot.',
      });
    }
  } else if (sanitizedProperties.userId) {
    const linkedUser = await getLinkedHabiticaUser({ userId: sanitizedProperties.userId, forceRefresh: false });
    if (!linkedUser?.code) {
      resolvedHabiticaUserId = linkedUser.habitica_user_id || false;
      resolvedUserId = linkedUser.user_id || false;
    }
  }

  const voteRecord = {
    id: crypto.randomUUID(),
    votedAt: Date.now(),
    habiticaUserId: resolvedHabiticaUserId || false,
    userId: resolvedUserId || false,
  };

  const nextVotes = [ ...ensureArray(selectedOption.votes), voteRecord ];
  voteLinks[selectedIndex] = {
    ...selectedOption,
    votes: nextVotes,
  };

  await QuestVoting.query().patchAndFetchById(questVoting.id, {
    updated_at: Date.now(),
    vote_links: voteLinks,
    active_ballot: {
      ...(questVoting.active_ballot || {}),
      options: voteLinks.filter(item => !item?.isHiddenRandom),
      hiddenOption: voteLinks.find(item => !!item?.isHiddenRandom) || null,
    },
  });

  return {
    success: true,
    questName: selectedOption.questName,
    message: `Your vote for ${ selectedOption.questName } has been counted.`,
  };
};

export const runQuestVotingLifecycleCheck = async ({ resourceId, source }) => {
  const row = await QuestVoting.query()
    .where('leader_tool_resource_id', resourceId)
    .whereNull('deleted_at')
    .first();

  if (!row) {
    return { success: true, skipped: 'quest-voting-row-not-found' };
  }

  return processPartyQuestState({ questVoting: row, source });
};
