import EventMessage from 'knex/models/Event_Message';
import HabiticaUser from 'knex/models/HabiticaUser';
import { sanitizeProperties, presence, optional, isUUID, handleApiAnalytic, handleApiError } from 'utils';
import { getHabiticaCredentials } from 'internal/habitica/helpers/getHabiticaCredentials';

const recentlySentHabiticaMessages = new Map(); // Map to track recently sent error messages for each user
const ERROR_MESSAGE_COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hour cooldown for sending the same message to the same user for the same event slug


// Note: This helper method exists to prevent a difficult circular dependency that would occur by utilizing the habitica methods.
// We don't want any kind of error handling in this method. Instead we want it to just silently fail.
const notifyHabiticaOfEventMessage = async (sanitizedProperties, retryCount = 0) => {
  const { userId, eventSlug, messageText, shouldNotifyHabitica, shouldNotifyHabiticaViaAdmin } = sanitizedProperties;
  if (!shouldNotifyHabitica && !shouldNotifyHabiticaViaAdmin) { return; }
  if (shouldNotifyHabitica && shouldNotifyHabiticaViaAdmin) {
    handleApiError(new Error('Both "shouldNotifyHabitica" and "shouldNotifyHabiticaViaAdmin" cannot be true at the same time.'), 'createEventMessage.notifyHabiticaOfEventMessage.invalidProperties');
    return;
  }

  if (retryCount > 20) {
    if (shouldNotifyHabitica) {
      handleApiAnalytic(undefined, 'too_many_failed_habitica_messages', JSON.stringify(sanitizedProperties));
    }
    if (shouldNotifyHabiticaViaAdmin) {
      const err = new Error(`Failed to send Habitica notification after ${ retryCount } retries. ${ JSON.stringify(sanitizedProperties) }`);
      handleApiError(err, 'createEventMessage.notifyHabiticaOfEventMessage.failed_admin_notification_loop');
    }
    return;
  }

  try {
    const receivingHabiticaUser = await HabiticaUser.query()
      .where({ user_id: userId })
      .select([ 'habitica_user_id' ])
      .first();
    if (!receivingHabiticaUser) { return; }

    const habiticaUserId = receivingHabiticaUser?.habitica_user_id;
    const shouldApplyCooldown = Boolean(habiticaUserId && eventSlug);
    const dedupeKey = shouldApplyCooldown ? `${ habiticaUserId }::${ eventSlug }` : null;

    if (dedupeKey) {
      const now = Date.now();
      const cutoff = now - ERROR_MESSAGE_COOLDOWN_MS;

      for (const [ key, sentAt ] of recentlySentHabiticaMessages.entries()) {
        if (sentAt < cutoff) {
          recentlySentHabiticaMessages.delete(key);
        }
      }

      const mostRecentSentAt = recentlySentHabiticaMessages.get(dedupeKey);
      if (mostRecentSentAt && (now - mostRecentSentAt) < ERROR_MESSAGE_COOLDOWN_MS) {
        return;
      }
    }

    let senderCredentials = undefined;
    try {
      senderCredentials = await getHabiticaCredentials({
        habiticaUserId: shouldNotifyHabiticaViaAdmin && process.env.HABITICA_ADMIN_FOR_NOTIFICATIONS,
        userId: shouldNotifyHabitica && sanitizedProperties.userId,
      });
    } catch (err) {
      if (shouldNotifyHabiticaViaAdmin && err.message.includes('No linked Habitica account found for the provided identifiers')) {
        const errWithContext = new Error('Admin Habitica account for Habitica notifications is not properly linked to a HabiTools account.');
        handleApiError(errWithContext, 'createEventMessage.notifyHabiticaOfEventMessage.invalidAdminCredentials');
        return;
      }
    }

    const url = `${ process.env.HABITICA_API_URL }/members/send-private-message`;
    const payload = {
      method: 'POST',
      headers: {
        'x-api-user': senderCredentials.habiticaUserId,
        'x-api-key': senderCredentials.apiKey,
        'Content-Type': 'application/json',
        'x-client': `${ process.env.HABITICA_APP_CLIENT }`,
      },
      body: JSON.stringify({
        toUserId: receivingHabiticaUser?.habitica_user_id,
        message: `## HabiTools Notification:\n${ messageText }`,
      }),
    };
    const response = await fetch(url, payload);
    if (response.ok && dedupeKey) {
      recentlySentHabiticaMessages.set(dedupeKey, Date.now());
    }

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10);
        const randomBuffer = Math.floor(Math.random() * 6000) + 2000; // Additional random buffer between 2000ms (2s) and 8000ms (8s)
        const delay = (retryAfter * 1000) + randomBuffer;
        setTimeout(() => {
          notifyHabiticaOfEventMessage(sanitizedProperties, retryCount + 1);
        }, delay);
      }
    }
  } catch (err) {
    handleApiError(err, 'createEventMessage.notifyHabiticaOfEventMessage.failed');
    // Silently fail on any errors.
    return;
  }
};

/**
 * Creates a new event message for a user, which can be used to notify the user of important events or updates. Optionally, the event message can trigger a notification to the user's Habitica account.
 * @param {Object} payload - The properties for creating the event message.
 * @param {string} payload.userId - The user ID of the recipient of the event message.
 * @param {string} payload.messageText - The main text content of the event message.
 * @param {integer} payload.priority - The priority level of the event message (0="debug", 1="normal", 2="high", 3="severe").
 * @param {string} [payload.resourceId] - An optional resource ID associated with the event.
 * @param {string} [payload.eventSlug] - An optional slug to categorize the event.
 * @param {string} [payload.eventName] - An optional human-readable name for the event.
 * @param {string} [payload.shortMessage] - An optional shorter version of the message text for notifications.
 * @param {boolean} [payload.shouldNotify] - Whether to trigger a notification within HabiTools for this event message.
 * @param {boolean} [payload.shouldNotifyHabitica] - Whether to send a private message notification to the user's Habitica account about this event.
 * @param {boolean} [payload.shouldNotifyHabiticaViaAdmin] - Whether to send a private message notification to the user's Habitica account using the admin account (useful if the user has not linked their own account or if their credentials are invalid).
 * @param {boolean} [payload.acknowledged] - Whether the event message has been acknowledged by the user (default: false).
 * @returns {Promise<Object>} - The created event message record, or an error response if validation fails.
 */
export const createEventMessage = async (payload) => {
  try {
    const sanitizedPayload = sanitizeProperties(payload, {
      requiredKeys: [ 'userId', 'messageText', 'priority' ],
      optionalKeys: [ 'resourceId', 'eventSlug', 'eventName', 'shortMessage', 'shouldNotify', 'shouldNotifyHabitica', 'shouldNotifyHabiticaViaAdmin', 'acknowledged' ],
      trimPayload: true,
      removeDisallowedKeys: true,
      parseInts: true,
      parseBools: true,
      propertyValidations: [
        presence('userId', 'The user ID is required'),
        optional(isUUID('resourceId', 'The resource ID must be a valid UUID')),
      ],
    });
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
    const sanitizedProperties = sanitizedPayload.properties;

    // Insert the new event message into the database
    const newMessage = await EventMessage.query().insert({
      user_id: sanitizedProperties.userId,
      resource_id: sanitizedProperties.resourceId || null,
      event_slug: sanitizedProperties.eventSlug,
      event_name: sanitizedProperties.eventName,
      message_text: sanitizedProperties.messageText,
      short_message: sanitizedProperties.shortMessage || null,
      should_notify: sanitizedProperties.shouldNotify || false,
      priority: sanitizedProperties.priority,
      acknowledged: sanitizedProperties.acknowledged || false,
      created_at: Date.now(),
    });

    if (sanitizedProperties.shouldNotifyHabitica || sanitizedProperties.shouldNotifyHabiticaViaAdmin) {
      // We add a random delay to prevent stampeding Habitica servers (eg: If an urgent message requires a notification sent to every user).
      const randomDelay = Math.floor(Math.random() * 4000) + 500; // Random delay between 500ms (0.5s) and 4500ms (4.5s)
      setTimeout(() => {
        notifyHabiticaOfEventMessage(sanitizedProperties);
      }, randomDelay);
    }

    return newMessage;
  } catch (err) {
    throw [ err, 'eventMessages.createEventMessage' ];
  }
};
