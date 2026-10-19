import QuestVoting from 'knex/models/QuestVoting';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';
import { returnOrSendResponse } from 'utils';
import questVotingFailedBallotLeaderDisabledMessage from 'internal/habitica/core/content/questVotingFailedBallotLeaderDisabledMessage';
// eslint-disable-next-line import/no-cycle
import {
  getUserQuestVotingTool,
  emitSharedEventMessage,
  removeParticipantFromQuestVoting,
} from '../core/questVotingCore';


import { sendPartyMessage } from '../helpers/sendPartyMessage';


export const disableQuestVotingTool = async ({ userId, partyId }) => {
  const linkedHabiticaUser = await getLinkedHabiticaUser({ userId, forceRefresh: false });
  if (linkedHabiticaUser?.code) { return linkedHabiticaUser; }

  const toolInstance = getUserQuestVotingTool(linkedHabiticaUser);
  if (!toolInstance?.id) {
    return returnOrSendResponse(404, {
      status: 'QUEST_VOTING_NOT_ACTIVE',
      message: 'Quest Voting is not active for this account.',
    });
  }

  const partyQuestVoting = await QuestVoting.query()
    .where('party_habitica_id', partyId || linkedHabiticaUser?.habitica_user_data?.party?._id)
    .whereNull('deleted_at')
    .first();

  if (partyQuestVoting) {
    await removeParticipantFromQuestVoting({ questVoting: partyQuestVoting, userId });

    await emitSharedEventMessage({
      questVoting: partyQuestVoting,
      eventSlug: 'quest-voting-roster-left',
      eventName: 'Roster Updated',
      messageText: `${ linkedHabiticaUser?.habitica_user_data?.username || 'A user' } disabled Quest Voting and left the roster.`,
      shortMessage: 'A user left the Quest Voting roster.',
      priority: 1,
    });

    if (partyQuestVoting.leader_user_id === userId) {
      await sendPartyMessage({
        userId,
        habiticaUserId: linkedHabiticaUser.habitica_user_id,
        message: questVotingFailedBallotLeaderDisabledMessage,
      });
    }
  }

  await teardownToolResources({
    userId,
    resourceId: toolInstance.id,
  });

  return { success: true };
};
