import { sanitizeProperties, returnOrSendResponse } from 'utils';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';


const getPartyDataFromHabitica = async ({ habiticaUserId, userId }) => {
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
    if (habiticaPartyInfo?.code === 404) {
      return returnOrSendResponse(habiticaPartyInfo?.code, {
        status: 'HABITICA_PARTY_NOT_FOUND',
        message: 'Unable to find the Habitica party',
      });
    }
    return returnOrSendResponse(habiticaPartyInfo?.code || 500, habiticaPartyInfo?.responseContent || {
      status: 'HABITICA_PARTY_INFO_FAILED',
      message: 'Unable to load Habitica party information.',
    });
  }

  return habiticaPartyInfo.data;
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
    retryOnNetworkError: true,
    retryOnRateLimit: true,
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

  const partyLeaderId = partyData?.leader?.id || null;

  return {
    partyId: partyData?._id || null,
    name: partyData?.name || null,
    leaderHabiticaUserId: partyLeaderId,
    habiticaUserId: habiticaUserId,
    isLeader: partyLeaderId === habiticaUserId,
    isQuestLeader: partyData?.quest?.leader === habiticaUserId || false,
    partyData: partyData || null,
    linkedHabiticaUser: linkedHabiticaUser,
  };
};