import { sanitizeProperties, returnOrSendResponse } from 'utils';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { getHabiticaPartyInfo } from 'internal/habitica/methods/getHabiticaPartyInfo';


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
 * Sends a party shout in Habitica chat and appends @mentions for all party members except the sender.
 * Only the current party leader can send party shouts.
 * @param {Object} properties
 * @param {string} properties.userId
 * @param {string} properties.messageText
 * @returns {Promise<Object>}
 */
export const sendHabiticaPartyShout = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'userId', 'messageText' ],
    trimPayload: true,
    removeDisallowedKeys: true,
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  if (!sanitizedProperties.messageText || typeof sanitizedProperties.messageText !== 'string') {
    return returnOrSendResponse(400, {
      status: 'INVALID_PROPERTY_VALUE',
      message: 'messageText must be a non-empty string.',
    });
  }

  const partyInfoResult = await getHabiticaPartyInfo({ userId: sanitizedProperties.userId, forceRefresh: true });
  if (partyInfoResult?.code) { return partyInfoResult; }

  if (!partyInfoResult.isLeader) {
    return returnOrSendResponse(403, {
      status: 'NOT_PARTY_LEADER',
      message: 'Only the current party leader can send party shouts.',
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

  const mentionHandles = normalizedMembers.map(member => `@${ member?.username }`);
  const finalMessage = `${ sanitizedProperties.messageText }\n\n[]()\n\n---\n\n*[Party Shout via HabiTools](https://habitools.online/)*\n\n*${ mentionHandles.join(' ') }*`;
  const postResult = await callHabiticaApi({
    method: 'POST',
    path: '/groups/party/chat',
    body: { message: finalMessage },
    habiticaUserId: partyInfoResult.habiticaUserId,
    userId: sanitizedProperties.userId,
    retryOnNetworkError: true,
    retryOnRateLimit: true,
  });
  if (!postResult?.success) {
    return returnOrSendResponse(postResult?.code || 500, postResult?.responseContent || {
      status: 'HABITICA_PARTY_SHOUT_FAILED',
      message: 'Failed to send the party shout to Habitica.',
    });
  }

  return {
    success: true,
    partyId: partyInfoResult.partyId,
    mentionedCount: mentionHandles.length,
    postedMessage: postResult.data || null,
  };
};