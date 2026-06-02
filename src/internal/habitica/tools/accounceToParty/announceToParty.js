import { sanitizeProperties, returnOrSendResponse } from 'utils';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';


const normalizePartyMembers = ({ habiticaMembers, habiticaUserId, partyLeaderId }) => {
  return habiticaMembers.map(member => ({
    id: member?.id,
    username: member?.auth?.local?.username || null,
    display_name: member?.profile?.name || null,
    is_self: member?.id === habiticaUserId,
    is_leader: member?.id === partyLeaderId,
  }));
};

const getPartyDataFromHabitica = async ({ habiticaUserId, userId }) => {
  const habiticaPartyInfo = await callHabiticaApi({
    method: 'GET',
    path: '/groups/party',
    habiticaUserId,
    userId,
    retryOnNetworkError: true,
    retryOnRateLimit: true,
  });
  if (!habiticaPartyInfo?.success) {
    return returnOrSendResponse(habiticaPartyInfo?.code || 500, habiticaPartyInfo?.responseContent || {
      status: 'HABITICA_PARTY_INFO_FAILED',
      message: 'Unable to load Habitica party information.',
    });
  }

  return {
    habiticaPartyInfo: habiticaPartyInfo.data,
  };
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
 * Fetches live Habitica party details for a linked user.
 * @param {Object} properties
 * @param {string} properties.userId
 * @returns {Promise<Object>}
 */
export const getHabiticaPartyInfo = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'userId' ],
    optionalKeys: [ 'forceRefresh' ],
    trimPayload: true,
    removeDisallowedKeys: true,
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  const linkedHabiticaUser = await getLinkedHabiticaUser({
    userId: sanitizedProperties.userId,
    forceRefresh: sanitizedProperties?.forceRefresh,
  });
  if (linkedHabiticaUser?.code) { return returnOrSendResponse(linkedHabiticaUser.code, linkedHabiticaUser.responseContent); }

  const habiticaUserId = linkedHabiticaUser.habitica_user_id;
  const partyData = await getPartyDataFromHabitica({
    habiticaUserId,
    userId: sanitizedProperties.userId,
  });
  if (partyData?.code) { return partyData; }

  const partyLeaderId = partyData.habiticaPartyInfo?.leader?.id || null;

  return {
    party: {
      party_id: partyData.habiticaPartyInfo?._id || null,
      name: partyData.habiticaPartyInfo?.name || null,
      leader_habitica_user_id: partyLeaderId,
      habitica_user_id: habiticaUserId,
      is_leader: partyLeaderId === habiticaUserId,
    },
  };
};


/**
 * Sends a party announcement in Habitica chat and appends @mentions for all party members except the sender.
 * Only the current party leader can send announcements.
 * @param {Object} properties
 * @param {string} properties.userId
 * @param {string} properties.messageText
 * @returns {Promise<Object>}
 */
export const sendHabiticaAnnounceToParty = async (properties) => {
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

  const partyInfoResult = await getHabiticaPartyInfo({ userId: sanitizedProperties.userId });
  if (partyInfoResult?.code) { return partyInfoResult; }

  if (!partyInfoResult.party?.is_leader) {
    return returnOrSendResponse(403, {
      status: 'NOT_PARTY_LEADER',
      message: 'Only the current party leader can send party announcements.',
    });
  }

  const partyMembersResult = await getPartyMembersFromHabitica({
    habiticaUserId: partyInfoResult.party.habitica_user_id,
    userId: sanitizedProperties.userId,
  });
  if (partyMembersResult?.code) { return partyMembersResult; }

  const normalizedMembers = normalizePartyMembers({
    habiticaMembers: partyMembersResult.habiticaMembers,
    habiticaUserId: partyInfoResult.party.habitica_user_id,
    partyLeaderId: partyInfoResult.party.leader_habitica_user_id,
  });

  const mentionHandles = normalizedMembers
    .filter(member => !member?.is_self)
    .map(member => member?.username)
    .filter(username => typeof username === 'string' && username.length > 0)
    .map(username => `@${ username }`);
  const dedupedMentionHandles = [ ...new Set(mentionHandles) ];

  const finalMessage = dedupedMentionHandles.length > 0
    ? `${ sanitizedProperties.messageText }\n\n---\n[Party Announcement via HabiTools](https://habitools.online/)\n\n#### ${ dedupedMentionHandles.join(' ') }`
    : sanitizedProperties.messageText;

    
  const postResult = await callHabiticaApi({
    method: 'POST',
    path: '/groups/party/chat',
    body: { message: finalMessage },
    habiticaUserId: partyInfoResult.party.habitica_user_id,
    userId: sanitizedProperties.userId,
    retryOnNetworkError: true,
    retryOnRateLimit: true,
  });
  if (!postResult?.success) {
    return returnOrSendResponse(postResult?.code || 500, postResult?.responseContent || {
      status: 'HABITICA_PARTY_ANNOUNCEMENT_FAILED',
      message: 'Failed to send the party announcement to Habitica.',
    });
  }

  return {
    success: true,
    party_id: partyInfoResult.party.party_id,
    mentioned_count: dedupedMentionHandles.length,
    posted_message: postResult.data || null,
  };
};