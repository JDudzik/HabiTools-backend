import HabiticaUser from 'knex/models/HabiticaUser';
import HabiticaUserData from 'knex/models/HabiticaUserData';
import { sanitizeProperties, isUUID, isBoolean, optional, returnOrSendResponse, handleApiAnalytic } from 'utils';
import { callHabiticaApi } from '../helpers/callHabiticaApi';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;


const mapHabiticaUserDataForStorage = (rawUser) => {
  const stats = rawUser?.stats || {};
  const auth = rawUser?.auth || {};

  return {
    last_updated: Date.now(),
    username: auth?.local?.username || null,
    email: auth?.local?.email || null,
    achievements: rawUser?.achievements || null,
    items: rawUser?.items || null,
    party: rawUser?.party || null,
    webhooks: rawUser?.webhooks || null,
    hp: stats?.hp ?? null,
    mp: stats?.mp ?? null,
    exp: stats?.exp ?? null,
    gp: stats?.gp ?? null,
    lvl: stats?.lvl ?? null,
    class: stats?.class || null,
    maxHealth: stats?.maxHealth ?? null,
    maxMP: stats?.maxMP ?? null,
    lastCron: rawUser?.lastCron ? new Date(rawUser.lastCron).getTime() : null,
  };
};

/**
 * Fetches the linked Habitica user for a given user ID or Habitica user ID. Optionally forces a refresh of the local data from Habitica if it's stale.
 * @param {Object} properties - The properties for fetching the linked Habitica user.
 * @param {string} [properties.userId] - The user ID to fetch the linked Habitica user for (if habiticaUserId is not provided).
 * @param {string} [properties.habiticaUserId] - The Habitica user ID to fetch the linked Habitica user for (if userId is not provided).
 * @param {boolean} [properties.forceRefresh=false] - Whether to force a refresh of the local data from Habitica, even if it's not stale.
 * @returns {Promise<Object>} - The linked Habitica user data, or an error response if not found or if credentials are invalid.
 */
export const getLinkedHabiticaUser = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    optionalKeys: [ 'userId', 'habiticaUserId', 'forceRefresh' ],
    trimPayload: true,
    atLeastOneOptionalProp: true,
    parseBools: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      optional(isUUID('userId', 'userId must be a valid UUID')),
      optional(isUUID('habiticaUserId', 'habiticaUserId must be a valid UUID')),
      optional(isBoolean('forceRefresh', 'forceRefresh must be a boolean')),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  if (!sanitizedProperties.userId && !sanitizedProperties.habiticaUserId) {
    return returnOrSendResponse(400, {
      status: 'MISSING_REQUIRED_PROPERTY',
      message: 'Payload is missing a required property. Provide userId or habiticaUserId.',
    });
  }

  const habiticaUser = await HabiticaUser.query()
    .modify((qb) => {
      if (sanitizedProperties.userId) {
        qb.where({ user_id: sanitizedProperties.userId });
      }
      if (sanitizedProperties.habiticaUserId) {
        qb.where({ habitica_user_id: sanitizedProperties.habiticaUserId });
      }
    })
    .withGraphFetched('[habitica_user_data, habitica_tools]')
    .modifyGraph('habitica_tools', (builder) => {
      builder.whereNull('deleted_at').orderBy('created_at', 'desc');
    })
    .first();
    
  if (!habiticaUser) {
    return returnOrSendResponse(404, {
      status: 'HABITICA_USER_NOT_FOUND',
      message: 'No linked Habitica user found for the provided identifier(s).',
    });
  }


  // Refresh the local data if it's stale for 30 minutes or it's a forced-refresh.
  const now = Date.now();
  const lastUpdated = habiticaUser.habitica_user_data?.last_updated;
  const shouldRefreshFromHabitica = (
    sanitizedProperties.forceRefresh === true
    || !habiticaUser.habitica_user_data
    || !lastUpdated
    || (now - lastUpdated) > THIRTY_MINUTES_MS
  );

  if (shouldRefreshFromHabitica) {
    try {
      const remoteHabiticaUserData = await callHabiticaApi({
        method: 'GET',
        path: '/user',
        habiticaUserId: habiticaUser.habitica_user_id,
        userId: habiticaUser.user_id,
      });
      if (remoteHabiticaUserData?.code) { throw remoteHabiticaUserData.responseContent; }
  
      if (!remoteHabiticaUserData?.success || (remoteHabiticaUserData?.data?._id !== habiticaUser.habitica_user_id)) {
        return returnOrSendResponse(401, {
          status: 'INVALID_CREDENTIALS',
          message: 'Habitica user ID does not match the provided credentials.',
        });
      }
  
      const habiticaUserDataPayload = mapHabiticaUserDataForStorage(remoteHabiticaUserData.data);
  
      let persistedHabiticaUserData;
      if (habiticaUser.habitica_user_data) {
        persistedHabiticaUserData = await HabiticaUserData.query().patchAndFetchById(
          habiticaUser.id,
          habiticaUserDataPayload,
        );
      } else {
        persistedHabiticaUserData = await HabiticaUserData.query().insertAndFetch({
          id: habiticaUser.id,
          ...habiticaUserDataPayload,
        });
      }
  
      habiticaUser.habitica_user_data = persistedHabiticaUserData;
    } catch (err) {
      handleApiAnalytic(undefined, 'failed_refresh_habitica_user_data', JSON.stringify({
        habitica_username: habiticaUser?.habitica_user_data?.username || null,
        habitica_email: habiticaUser?.habitica_user_data?.email || null,
        last_updated: lastUpdated,
        error: err,
      }));
      if (err.status === 'DECRYPTION_FAILED') {
        await createEventMessage({
          userId: sanitizedProperties?.userId || habiticaUser?.user_id,
          eventSlug: 'unable_to_decrypt_habitica_credentials',
          eventName: 'Unable to Decrypt Habitica Credentials',
          messageText: `We were unable to decrypt your Habitica credentials. You may need to unlink and relink your Habitica account to fix this issue. You can manage your Habitica account from the [My Account page on HabiTools](${ process.env.FRONTEND_HOST }/my-account). If you continue to see this message after relinking, please contact support.`,
          shortMessage: 'Unable to decrypt Habitica credentials.',
          shouldNotify: true,
          shouldNotifyHabiticaViaAdmin: true,
          priority: 3,
        }).catch(() => {}); 
      }
      if (sanitizedProperties.forceRefresh) {
        return returnOrSendResponse(503, {
          status: 'HABITICA_UNREACHABLE',
          message: 'Unable to reach Habitica to refresh your data. Please try again later.',
        });
      }

      // Ignore any other errors here so that we can still return the existing local data if Habitica is unreachable.
    }
  }

  return habiticaUser.toJSON();
};
