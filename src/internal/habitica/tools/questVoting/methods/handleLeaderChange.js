import { getHabiticaPartyInfo } from 'internal/habitica/methods/getHabiticaPartyInfo';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
// eslint-disable-next-line import/no-cycle
import { disableQuestVotingTool } from './disableQuestVotingTool';
import { handleApiAnalytic } from 'utils';


const ensureArray = value => (Array.isArray(value) ? value : []);

export const handleLeaderChange = async ({
  questVoting,
  suppressPauseOnMissingPartyInfo = false,
}) => {
  if (!questVoting?.leader_user_id) { return { questVoting, partyInfo: null }; }

  const originalLeaderId = questVoting.leader_user_id;
  const partyInfo = await getHabiticaPartyInfo({ userId: originalLeaderId, forceRefresh: true });
  if (partyInfo?.code) {
    handleApiAnalytic(undefined, 'failed_party_leader_check', JSON.stringify({ partyInfo, questVoting }));
    return { questVoting, partyInfo: null };
  }

  const currentPartyId = partyInfo?.partyData?.id;
  const isCorrectParty = currentPartyId === questVoting.party_habitica_id;
  const isStillLeader = partyInfo?.leaderHabiticaUserId === questVoting.leader_habitica_user_id;

  // Only proceed if the leader is in the correct party AND still holds the leadership role
  if (isCorrectParty && isStillLeader) {
    return { questVoting, partyInfo };
  }

  // If they left the party, joined another, or are no longer the leader
  if (suppressPauseOnMissingPartyInfo) {
    return { questVoting, partyInfo: null };
  }

  const participants = ensureArray(questVoting.participants);
  const uniqueAffectedUsers = Array.from(new Set([ originalLeaderId, ...participants.map(p => p.userId) ]));

  for (const userId of uniqueAffectedUsers) {
    await disableQuestVotingTool({ userId, partyId: questVoting.party_habitica_id });
    await createEventMessage({
      userId,
      resourceId: questVoting.id,
      eventSlug: 'quest-voting-tool-disabled',
      eventName: 'Quest Voting Tool Disabled',
      messageText: 'Your **Quest Voting** tool had to be disabled, because the leadership of your party changed or the leader left. However, you can re-enable this tool at any time from the Quest Voting tool page.',
      shortMessage: 'Your quest voting tool has been disabled.',
      shouldNotifyHabiticaViaAdmin: true,
      shouldNotify: true,
      priority: 2,
    }).catch(() => {});
  }

  return { questVoting, partyInfo: null };
};