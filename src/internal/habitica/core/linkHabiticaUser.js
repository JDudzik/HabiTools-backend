import HabiticaUser from 'knex/models/HabiticaUser';
import HabiticaUserData from 'knex/models/HabiticaUserData';
import HabiticaUserEncryptedKey from 'knex/models/HabiticaUserEncryptedKey';
import { sanitizeProperties, isUUID, returnOrSendResponse } from 'utils';
import { callHabiticaApi } from '../helpers/callHabiticaApi';
import { habiticaEncryption } from '../helpers/habiticaEncryption';


/**
 * Links a Habitica account to a Habitools user by validating the provided credentials, fetching initial user data from Habitica, and storing the link and user data in the database.
 * @param {Object} properties - The properties for linking the Habitica account.
 * @param {string} properties.user_id - The user ID of the Habitools user linking their account.
 * @param {string} properties.habitica_user_id - The Habitica user ID to link.
 * @param {string} properties.api_key - The Habitica API key for the account being linked.
 * @returns {Promise<Object>} - The linked Habitica user data, or an error response if credentials are invalid or if the user already has a linked account.
 */
export const linkHabiticaUser = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'user_id', 'habitica_user_id', 'api_key' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isUUID('user_id', 'user_id must be a valid UUID'),
      isUUID('habitica_user_id', 'habitica_user_id must be a valid UUID'),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  // Enforce exactly one linked account per Habitools user
  const existingLink = await HabiticaUser.query().where({ user_id: sanitizedProperties.user_id }).first();
  if (existingLink) {
    return returnOrSendResponse(409, {
      status: 'ALREADY_LINKED',
      message: 'You already have a linked Habitica account. Unlink it before adding a new one.',
    });
  }

  // Validate credentials and pull initial user data
  let userData;
  try {
    userData = await callHabiticaApi({
      method: 'GET',
      path: '/user',
      credentialOverride: {
        habiticaUserId: sanitizedProperties.habitica_user_id,
        apiKey: sanitizedProperties.api_key,
      },
    });
  } catch (err) {
    const status = err?.statusCode;
    if (status === 401) {
      return returnOrSendResponse(401, {
        status: 'INVALID_CREDENTIALS',
        message: 'Habitica credentials are invalid.',
      });
    }
    return returnOrSendResponse(503, {
      status: 'HABITICA_UNREACHABLE',
      message: 'Could not reach Habitica. Please try again.',
    });
  }

  if (!userData?.success || !userData?.data?._id) {
    return returnOrSendResponse(401, {
      status: 'INVALID_CREDENTIALS',
      message: 'Could not validate Habitica credentials.',
    });
  }

  // Confirm user ID matches what Habitica returned
  if (userData.data._id !== sanitizedProperties.habitica_user_id) {
    return returnOrSendResponse(401, {
      status: 'INVALID_CREDENTIALS',
      message: 'Habitica user ID does not match the provided credentials.',
    });
  }

  const encrypted_api_key = habiticaEncryption.encrypt(sanitizedProperties.api_key);

  const habiticaUser = await HabiticaUser.query().insertAndFetch({
    user_id: sanitizedProperties.user_id,
    habitica_user_id: sanitizedProperties.habitica_user_id,
    is_primary: true,
    created_at: Date.now(),
  });

  await HabiticaUserEncryptedKey.query().insert({
    id: habiticaUser.id,
    encrypted_api_key,
  });

  const rawUser = userData.data;
  const stats = rawUser?.stats || {};
  const auth = rawUser?.auth || {};

  await HabiticaUserData.query().insert({
    id: habiticaUser.id,
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
  });

  return { habiticaUser };
};
