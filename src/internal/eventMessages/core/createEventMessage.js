import EventMessage from 'knex/models/Event_Message';
import HabiticaUser from 'knex/models/HabiticaUser';
import { sanitizeProperties, presence, optional, isUUID, handleApiAnalytic, handleApiError } from 'utils';
import { getHabiticaCredentials } from 'internal/habitica/helpers/getHabiticaCredentials';

const recentlySentHabiticaMessages = new Map(); // Map to track recently sent error messages for each user
const ERROR_MESSAGE_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown for sending the same message to the same user for the same event slug


// Note: This helper method exists to prevent a difficult circular dependency that would occur by utilizing the habitica methods.
// We don't want any kind of error handling in this method. Instead we want it to just silently fail.
const notifyHabiticaOfEventMessage = async (sanitizedProperties, retryCount = 0) => {
  const { user_id, event_slug, message_text, should_notify_habitica, should_notify_habitica_via_admin } = sanitizedProperties;
  if (!should_notify_habitica && !should_notify_habitica_via_admin) { return; }

  if (retryCount > 20) {
    if (should_notify_habitica) {
      handleApiAnalytic(undefined, 'too_many_failed_habitica_messages', JSON.stringify(sanitizedProperties));
    }
    if (should_notify_habitica_via_admin) {
      const err = new Error(`Failed to send Habitica notification after ${ retryCount } retries. ${ JSON.stringify(sanitizedProperties) }`);
      handleApiError(err, 'createEventMessage.notifyHabiticaOfEventMessage.failed_admin_notification_loop');
    }
    return;
  }

  try {
    const receivingHabiticaUser = await HabiticaUser.query()
      .where({ user_id })
      .select([ 'habitica_user_id' ])
      .first();
    if (!receivingHabiticaUser) { return; }

    const habiticaUserId = receivingHabiticaUser?.habitica_user_id;
    const shouldApplyCooldown = Boolean(habiticaUserId && event_slug);
    const dedupeKey = shouldApplyCooldown ? `${ habiticaUserId }::${ event_slug }` : null;

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

    const senderCredentials = await getHabiticaCredentials({
      habiticaUserId: should_notify_habitica_via_admin && process.env.HABITICA_ADMIN_FOR_NOTIFICATIONS,
      userId: should_notify_habitica && sanitizedProperties.user_id,
    });

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
        message: `## HabiTools Notification:\n${ message_text }`,
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
 * @param {string} payload.user_id - The user ID of the recipient of the event message.
 * @param {string} payload.message_text - The main text content of the event message.
 * @param {integer} payload.priority - The priority level of the event message (0="debug", 1="normal", 2="high", 3="severe").
 * @param {string} [payload.resource_id] - An optional resource ID associated with the event.
 * @param {string} [payload.event_slug] - An optional slug to categorize the event.
 * @param {string} [payload.event_name] - An optional human-readable name for the event.
 * @param {string} [payload.short_message] - An optional shorter version of the message text for notifications.
 * @param {boolean} [payload.should_notify] - Whether to trigger a notification within HabiTools for this event message.
 * @param {boolean} [payload.should_notify_habitica] - Whether to send a private message notification to the user's Habitica account about this event.
 * @param {boolean} [payload.should_notify_habitica_via_admin] - Whether to send a private message notification to the user's Habitica account using the admin account (useful if the user has not linked their own account or if their credentials are invalid).
 * @param {boolean} [payload.acknowledged] - Whether the event message has been acknowledged by the user (default: false).
 * @returns {Promise<Object>} - The created event message record, or an error response if validation fails.
 */
export const createEventMessage = async (payload) => {
  try {
    const sanitizedPayload = sanitizeProperties(payload, {
      requiredKeys: [ 'user_id', 'message_text', 'priority' ],
      optionalKeys: [ 'resource_id', 'event_slug', 'event_name', 'short_message', 'should_notify', 'should_notify_habitica', 'should_notify_habitica_via_admin', 'acknowledged' ],
      trimPayload: true,
      removeDisallowedKeys: true,
      parseInts: true,
      parseBools: true,
      propertyValidations: [
        presence('user_id', 'The user ID is required'),
        optional(isUUID('resource_id', 'The resource ID must be a valid UUID')),
      ],
    });
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
    const sanitizedProperties = sanitizedPayload.properties;

    // Insert the new event message into the database
    const newMessage = await EventMessage.query().insert({
      user_id: sanitizedProperties.user_id,
      resource_id: sanitizedProperties.resource_id || null,
      event_slug: sanitizedProperties.event_slug,
      event_name: sanitizedProperties.event_name,
      message_text: sanitizedProperties.message_text,
      short_message: sanitizedProperties.short_message || null,
      should_notify: sanitizedProperties.should_notify || false,
      priority: sanitizedProperties.priority,
      acknowledged: sanitizedProperties.acknowledged || false,
      created_at: Date.now(),
    });

    if (sanitizedProperties.should_notify_habitica || sanitizedProperties.should_notify_habitica_via_admin) {
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
