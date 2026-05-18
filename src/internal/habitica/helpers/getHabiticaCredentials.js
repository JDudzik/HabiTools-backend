import HabiticaUser from 'knex/models/HabiticaUser';
import { sanitizeProperties } from 'utils/methods/sanitizeProperties';
import { habiticaEncryption } from './habiticaEncryption';

/**
 * Helper function to retrieve Habitica credentials (user ID and API key) for a given user or Habitica account.
 * @param {Object} properties - The properties for retrieving credentials.
 * @param {string} [properties.userId] - The user ID to fetch credentials for (if habiticaUserId is not provided).
 * @param {string} [properties.habiticaUserId] - The Habitica user ID to fetch credentials for (if userId is not provided).
 * @returns {Promise<Object>} - An object containing habiticaUserId and apiKey.
 * @throws Will throw an error if no linked Habitica account is found or if required properties are missing.
 */
export const getHabiticaCredentials = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    optionalKeys: [ 'userId', 'habiticaUserId' ],
    atLeastOneOptionalProp: true,
    trimPayload: true,
    removeDisallowedKeys: true,
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;


  const habiticaUser = await HabiticaUser.query()
    .modify((qb) => {
      if (sanitizedProperties.userId) {
        qb.where({ user_id: sanitizedProperties.userId });
      }
      if (sanitizedProperties.habiticaUserId) {
        qb.where({ habitica_user_id: sanitizedProperties.habiticaUserId });
      }
    })
    .select([ 'habitica_user_id' ])
    .withGraphFetched('habitica_user_encrypted_key')
    .first();

  if (!habiticaUser?.habitica_user_encrypted_key?.encrypted_api_key) {
    throw new Error('No linked Habitica account found for the provided identifiers.');
  }

  const apiKey = habiticaEncryption.decrypt(habiticaUser.habitica_user_encrypted_key.encrypted_api_key);
  return { habiticaUserId: habiticaUser.habitica_user_id, apiKey };
};
