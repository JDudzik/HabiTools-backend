import { sanitizeProperties, isLength, returnOrSendResponse, handleApiAnalytic } from 'utils';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { getHabiticaPartyInfo } from 'internal/habitica/methods/getHabiticaPartyInfo';


const PARTY_BROADCAST_MESSAGE_MAX_LENGTH = 2200;


const normalizePartyMembers = ({ habiticaMembers, habiticaUserId, partyLeaderId }) => {
  return habiticaMembers.map(member => ({
    id: member?.id,
    username: member?.auth?.local?.username,
    display_name: member?.profile?.name || null,
    is_self: member?.id === habiticaUserId,
    is_leader: member?.id === partyLeaderId,
  }));
};

const getPartyMembersFromHabitica = async ({ habiticaUserId, userId }) => {
  const habiticaMembers = await callHabiticaApi({
    method: 'GET',
    path: '/groups/party/members?includeAllPublicFields=true',
    habiticaUserId,
    userId,
    retryOnNetworkError: true,
    retryOnRateLimit: true,
  });
  if (!habiticaMembers?.success) {
    return returnOrSendResponse(habiticaMembers?.code || 500, habiticaMembers?.responseContent || {
      status: 'HABITICA_PARTY_MEMBERS_FAILED',
      message: 'Unable to load Habitica party members.',
    });
  }

  return {
    habiticaMembers: Array.isArray(habiticaMembers.data) ? habiticaMembers.data : [],
  };
};


/**
 * Sends a party broadcast as a private message to each party member except the sender.
 * Only the current party leader can send party broadcasts.
 * @param {Object} properties
 * @param {string} properties.userId
 * @param {string} properties.messageText
 * @returns {Promise<Object>}
 */
export const sendHabiticaPartyBroadcast = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'userId', 'messageText' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isLength('messageText', { min: 1, max: PARTY_BROADCAST_MESSAGE_MAX_LENGTH }, `messageText must be between 1 and ${ PARTY_BROADCAST_MESSAGE_MAX_LENGTH } characters`),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  const partyInfoResult = await getHabiticaPartyInfo({ userId: sanitizedProperties.userId, forceRefresh: true });
  if (partyInfoResult?.code) { return partyInfoResult; }

  if (!partyInfoResult.isLeader) {
    return returnOrSendResponse(403, {
      status: 'NOT_PARTY_LEADER',
      message: 'Only the current party leader can send party broadcasts.',
    });
  }

  const partyMembersResult = await getPartyMembersFromHabitica({
    habiticaUserId: partyInfoResult.habiticaUserId,
    userId: sanitizedProperties.userId,
  });
  if (partyMembersResult?.code) { return partyMembersResult; }

  const normalizedMembers = normalizePartyMembers({
    habiticaMembers: partyMembersResult.habiticaMembers,
    habiticaUserId: partyInfoResult.habiticaUserId,
    partyLeaderId: partyInfoResult.leaderHabiticaUserId,
  });

  const membersToMessage = normalizedMembers.filter(member => !member?.is_self);

  for (const member of membersToMessage) {
    const privateMessageResult = await callHabiticaApi({
      method: 'POST',
      path: '/members/send-private-message',
      body: {
        toUserId: member.id,
        message: `### **Party Broadcast:**\n\n${ sanitizedProperties.messageText }`,
      },
      habiticaUserId: partyInfoResult.habiticaUserId,
      userId: sanitizedProperties.userId,
      retryOnNetworkError: true,
      retryOnRateLimit: true,
    });
    if (!privateMessageResult?.success) {
      return returnOrSendResponse(privateMessageResult?.code || 500, privateMessageResult?.responseContent || {
        status: 'HABITICA_PARTY_BROADCAST_FAILED',
        message: 'Failed to send the party broadcast private messages to Habitica.',
      });
    }
  }

  handleApiAnalytic(undefined, 'sent_party_broadcast', JSON.stringify({
    userId: sanitizedProperties.userId,
    habitica_email: partyInfoResult.linkedHabiticaUser?.habitica_user_data?.email,
    taggedUserCount: membersToMessage.length,
  }));

  return {
    success: true,
    partyId: partyInfoResult.partyId,
    mentionedCount: membersToMessage.length,
    postedMessage: null,
  };
};