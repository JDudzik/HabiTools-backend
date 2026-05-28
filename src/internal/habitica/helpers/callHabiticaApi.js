import { getHabiticaCredentials } from './getHabiticaCredentials';
import { sanitizeProperties } from 'utils/methods/sanitizeProperties';
import { returnOrSendResponse } from 'utils/methods/returnOrSendResponse';


const wait = delay => new Promise((resolve) => {
  setTimeout(resolve, delay);
});

const calculateRetryDelay = ({ attempt, retryConfig, response, fetchError }) => {
  const { maxRetries, baseDelayMs, retryOnRateLimit, retryOnNetworkError, retryOnStatusCodes } = retryConfig; 
  const calculatedDelay = baseDelayMs * Math.pow(1.9, attempt); // First attempt is ~500ms. 10th attempt is ~5 minutes.
  const jitter = Math.floor(Math.random() * 2700) + 300; // Random jitter between 300ms and 3000ms
  const calculatedBackoffDelay = calculatedDelay + jitter;

  if (attempt >= maxRetries) {
    return null;
  }

  if ((retryOnNetworkError && fetchError) || (response && retryOnStatusCodes.includes(response.status))) {
    return calculatedBackoffDelay;
  }

  if (retryOnRateLimit && response && response.status === 429) {
    const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10);
    const rateLimitDelay = (retryAfter > 0) ? (retryAfter * 1000) : 0;
    return rateLimitDelay + jitter;
  }

  return null;
};


/**
 * Helper function to call the Habitica API with proper authentication and error handling.
 * @param {Object} properties - The properties for the API call.
 * @param {string} properties.path - The API endpoint path (e.g., '/user').
 * @param {string} [properties.method='GET'] - The HTTP method to use.
 * @param {string} [properties.userId] - The user ID to fetch credentials for (if habiticaUserId is not provided).
 * @param {string} [properties.habiticaUserId] - The Habitica user ID to fetch credentials for (if userId is not provided).
 * @param {Object} [properties.body] - The request body to send (for POST/PUT requests).
 * @param {Object} [properties.credentialOverride] - Optional override for credentials, containing habiticaUserId and apiKey.
 * @param {Object} [properties.retryConfig] - Optional retry settings.
 * @param {number} [properties.retryConfig.maxRetries=10] - Maximum retry attempts after the initial request.
 * @param {number} [properties.retryConfig.baseDelayMs=1000] - Base delay used for incremental backoff.
 * @param {boolean} [properties.retryConfig.retryOnRateLimit=false] - Retries HTTP 429 responses by default.
 * @param {boolean} [properties.retryConfig.retryOnNetworkError=false] - Retries transient network/fetch failures.
 * @param {number[]} [properties.retryConfig.retryOnStatusCodes=[ 408, 425, 500, 502, 503, 504 ]] - HTTP status codes to retry (ex: [503]).
 * @returns {Promise<Object>} - The response data from the Habitica API.
 */
export const callHabiticaApi = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'path' ],
    optionalKeys: [ 'method', 'userId', 'habiticaUserId', 'body', 'credentialOverride', 'retryConfig' ],
    trimPayload: true,
    removeDisallowedKeys: true,
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  const sanitizedRetryConfigPayload = sanitizeProperties(sanitizedProperties.retryConfig || {}, {
    optionalKeys: [ 'maxRetries', 'baseDelayMs', 'retryOnRateLimit', 'retryOnNetworkError', 'retryOnStatusCodes' ],
    trimPayload: true,
    removeDisallowedKeys: true,
  });
  if (!sanitizedRetryConfigPayload.valid) { return sanitizedRetryConfigPayload.error; }
  const sanitizedRetryConfig = sanitizedRetryConfigPayload.properties;


  if (
    !sanitizedProperties.habiticaUserId 
    && !sanitizedProperties.userId
    && !(sanitizedProperties.credentialOverride?.habiticaUserId && sanitizedProperties.credentialOverride?.apiKey)
  ) {
    return returnOrSendResponse(400, {
      status: 'MISSING_CREDENTIALS',
      message: 'Either userId, habiticaUserId, or credentialOverride with habiticaUserId and apiKey must be provided.',
    });
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
    if (credentials?.code) { return returnOrSendResponse(credentials.code, credentials.responseContent); }
    
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
      'x-client': `${ process.env.HABITICA_APP_CLIENT }`,
    },
    ...(sanitizedProperties.body !== undefined ? { body: JSON.stringify(sanitizedProperties.body) } : {}),
  };

  const retryConfig = {
    maxRetries: sanitizedRetryConfig?.maxRetries ?? 10,
    baseDelayMs: sanitizedRetryConfig?.baseDelayMs ?? 500,
    retryOnRateLimit: sanitizedRetryConfig?.retryOnRateLimit === true,
    retryOnNetworkError: sanitizedRetryConfig?.retryOnNetworkError === true,
    retryOnStatusCodes: Array.isArray(sanitizedRetryConfig?.retryOnStatusCodes)
      ? sanitizedRetryConfig.retryOnStatusCodes
      : [ 408, 425, 500, 502, 503, 504 ], // Default to retrying common transient status codes
  };


  let attempt = 0;
  while (true) {
    const fetchResult = await fetch(url, payload)
      .then(response => ({ response }))
      .catch(fetchError => ({ fetchError }));

    const delay = calculateRetryDelay({
      attempt,
      retryConfig,
      response: fetchResult.response,
      fetchError: fetchResult.fetchError,
    });

    if (delay !== null) {
      attempt += 1;
      await wait(delay);
      continue;
    }

    if (fetchResult.fetchError) {
      const error = new Error(fetchResult.fetchError.message || 'Habitica API network error');
      error.originalError = fetchResult.fetchError;
      error.retryAttemptCount = attempt;
      error.fetchFailedPath = sanitizedProperties.path;
      return returnOrSendResponse(503, {
        status: 'HABITICA_API_NETWORK_ERROR',
        message: 'Network error while trying to reach Habitica API. Please try again later.',
      });
    }

    const response = fetchResult.response;
    const data = await response.json().catch(() => null);
    if (response.ok) {
      return data;
    }

    const error = new Error(data?.message || `Habitica API error: ${ response.status }`);
    error.statusCode = response.status;
    error.habiticaError = data;
    error.retryAttemptCount = attempt;
    error.fetchFailedPath = sanitizedProperties.path;

    return returnOrSendResponse(response.status, {
      status: data?.status || 'HABITICA_API_ERROR',
      message: data?.message || 'An error occurred while communicating with the Habitica API.',
    });
  }
};
