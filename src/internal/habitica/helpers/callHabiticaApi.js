import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { getHabiticaCredentials } from './getHabiticaCredentials';
import { sanitizeProperties } from 'utils/methods/sanitizeProperties';


/**
 * Helper function to call the Habitica API with proper authentication and error handling.
 * @param {Object} properties - The properties for the API call.
 * @param {string} properties.path - The API endpoint path (e.g., '/user').
 * @param {string} [properties.method='GET'] - The HTTP method to use.
 * @param {string} [properties.userId] - The user ID to fetch credentials for (if habiticaUserId is not provided).
 * @param {string} [properties.habiticaUserId] - The Habitica user ID to fetch credentials for (if userId is not provided).
 * @param {Object} [properties.body] - The request body to send (for POST/PUT requests).
 * @param {Object} [properties.credentialOverride] - Optional override for credentials, containing habiticaUserId and apiKey.
 * @returns {Promise<Object>} - The response data from the Habitica API.
 * @throws Will throw an error if the API call fails or if required properties are missing.
 */
export const callHabiticaApi = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'path' ],
    optionalKeys: [ 'method', 'userId', 'habiticaUserId', 'body', 'credentialOverride' ],
    trimPayload: true,
    removeDisallowedKeys: true,
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  if (
    !sanitizedProperties.habiticaUserId 
    && !(sanitizedProperties.credentialOverride?.habiticaUserId && sanitizedProperties.credentialOverride?.apiKey)
  ) {
    throw new Error('callHabiticaApi requires habiticaUserId or credentialOverride.');
  }


  let habiticaCredentials = {};
  if (sanitizedProperties.credentialOverride) {
    habiticaCredentials = {
      habiticaUserId: sanitizedProperties.credentialOverride.habiticaUserId,
      apiKey: sanitizedProperties.credentialOverride.apiKey,
    };
  } else {
    const credentials = await getHabiticaCredentials({
      habiticaUserId: sanitizedProperties.habiticaUserId,
      userId: sanitizedProperties.userId,
    });
    habiticaCredentials = {
      habiticaUserId: credentials.habiticaUserId,
      apiKey: credentials.apiKey,
    };
  }


  const url = `${ process.env.HABITICA_API_URL }${ sanitizedProperties.path }`;
  const payload = {
    method: sanitizedProperties.method || 'GET',
    headers: {
      'x-api-user': habiticaCredentials.habiticaUserId,
      'x-api-key': habiticaCredentials.apiKey,
      'Content-Type': 'application/json',
      'x-client': `${ process.env.HABITICA_APP_CLIENT }-${ process.env.BACKEND_HOST || 'app' }`,
    },
    ...(sanitizedProperties.body !== undefined ? { body: JSON.stringify(sanitizedProperties.body) } : {}),
  };
  const response = await fetch(url, payload);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && sanitizedProperties.userId) {
      createEventMessage({
        user_id: sanitizedProperties.userId,
        event_slug: 'api-key-invalid',
        event_name: 'HabiTools: API Key Invalid',
        message_text: 'Your Habitica API key connected to HabiTools is no longer valid. Please re-link your account.',
        short_message: 'HabiTools: API key invalid',
        should_notify_habitica_via_admin: true,
        priority: 3,
      }).catch(() => {});
    }
    
    const error = new Error(data?.message || `Habitica API error: ${ response.status }`);
    error.statusCode = response.status;
    error.habiticaError = data;

    throw [ error, `callHabiticaApi.failedResponse: ${ sanitizedProperties.path }` ];
  }

  return data;
};
