import { PostHog } from 'posthog-node';
import { getLoggedInUser } from 'internal/userController/userHelpers/getLoggedInUser';
import { retrieveUser } from 'internal/userController/userHelpers/retrieveUser';
import { sanitizeProperties } from './sanitizeProperties';
import { isLength, isPlainObject, optional, presence } from 'property-validator';

let posthogClient = undefined;


/**
 * Capture a PostHog event using the best available distinctId source.
 * @param {Object} config - Single configuration object for event capture.
 * @param {Object} [config.req] - Express request object used to resolve the logged-in user email.
 * @param {string} [config.userId] - User ID used to resolve an email from the database when email is not provided.
 * @param {string} [config.userEmail] - User email used directly as the PostHog distinctId.
 * @param {string} [config.distinctId] - Explicit distinctId override.
 * @param {string} config.event - PostHog event name.
 * @param {Object} [config.properties={}] - Event properties payload.
 * @param {Object} [config.captureOptions={}] - Additional PostHog capture options merged into the payload.
 * @returns {Promise<Object>} Capture result metadata including the distinctId used.
 */
export const posthogCapture = async (config) => {
  const sanitizedConfigPayload = sanitizeProperties(config, {
    requiredKeys: [ 'event' ],
    optionalKeys: [ 'userId', 'userEmail', 'distinctId', 'properties', 'captureOptions' ],
    trimPayload: false,
    removeDisallowedKeys: true,
    propertyValidations: [
      presence('event', 'The "event" parameter passed to posthogCapture is required.'),
      isLength('event', { min: 1 }, 'The "event" parameter passed to posthogCapture must be a non-empty string.'),
      optional(isLength('userId', { min: 1 }, 'The "userId" parameter passed to posthogCapture must be a non-empty string.')),
      optional(isLength('userEmail', { min: 1 }, 'The "userEmail" parameter passed to posthogCapture must be a non-empty string.')),
      optional(isLength('distinctId', { min: 1 }, 'The "distinctId" parameter passed to posthogCapture must be a non-empty string.')),
      optional(isPlainObject('properties', 'The "properties" parameter passed to posthogCapture must be a plain object.')),
      optional(isPlainObject('captureOptions', 'The "captureOptions" parameter passed to posthogCapture must be a plain object.')),
    ],
  });
  if (!sanitizedConfigPayload.valid) { return sanitizedConfigPayload.error; }

  const req = config?.req;
  const {
    userId,
    userEmail,
    distinctId: passedDistinctId,
    event,
    properties,
    captureOptions = {},
  } = sanitizedConfigPayload.properties;

  if (!posthogClient && process.env.POSTHOG_KEY && process.env.POSTHOG_HOST) {
    posthogClient = new PostHog(
      process.env.POSTHOG_KEY,
      { host: process.env.POSTHOG_HOST },
    );
  }

  if (!posthogClient) {
    console.debug('PostHog is not configured. Skipping capture:', {
      event,
      properties,
    });
    return {
      success: false,
      event,
      distinctId: passedDistinctId || userEmail,
    };
  }

  let distinctId = passedDistinctId || userEmail;

  if (!distinctId && req) {
    distinctId = await getLoggedInUser(req, [ 'email' ]);
  }

  if (!distinctId && userId) {
    const retrievedUser = await retrieveUser({
      id: userId,
      select: [ 'email' ],
      eager: { permissions: false, user_subscriptions: false },
    });

    distinctId = retrievedUser?.email;
  }

  await posthogClient.capture({
    ...captureOptions,
    distinctId,
    event,
    properties,
  });

  return {
    success: true,
    event,
    distinctId,
  };
};
