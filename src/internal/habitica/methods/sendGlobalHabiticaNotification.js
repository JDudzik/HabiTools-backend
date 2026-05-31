import { sanitizeProperties, returnOrSendResponse, handleApiAnalytic } from 'utils';
import { searchUsers } from 'internal/userController/userHelpers/searchUsers';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';


/**
 * Sends a global Habitica notification (via admin sender) to every user with a linked Habitica account.
 * @param {Object} properties - Notification payload.
 * @param {string} properties.messageText - Markdown-compatible message body to send to Habitica users.
 * @param {string} [properties.shortMessage] - Short in-app summary for the event message.
 * @param {string} [properties.eventName] - Human-readable event name.
 * @param {string} [properties.eventSlug] - Optional event slug; defaults to a timestamped slug to avoid cooldown dedupe collisions.
 * @param {number} [properties.priority=2] - Event priority.
 * @param {boolean} [properties.acknowledged=true] - Whether to mark created event messages as acknowledged.
 * @param {Object} [properties.req] - Express request object for analytics context.
 * @returns {Promise<Object>} Summary of the global send attempt.
 */
export const sendGlobalHabiticaNotification = async (properties) => {
  const req = properties.req;
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'messageText' ],
    optionalKeys: [ 'shortMessage', 'eventName', 'eventSlug', 'priority', 'acknowledged' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    parseInts: true,
    parseBools: true,
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  const userList = await searchUsers({ minimal_results: true });
  if (!Array.isArray(userList)) {
    return returnOrSendResponse(500, {
      status: 'GLOBAL_HABITICA_NOTIFICATION_FAILED',
      message: 'Unable to retrieve users for global Habitica notification.',
    });
  }

  const linkedUsers = userList.filter(user => user?.id && user?.habitica_user?.habitica_user_id);

  const eventSlug = sanitizedProperties.eventSlug || `global_habitica_notification_${ Date.now() }`;
  Promise.allSettled(linkedUsers.map((user) => {
    return createEventMessage({
      userId: user.id,
      eventSlug,
      eventName: sanitizedProperties.eventName || 'Important Message from HabiTools',
      messageText: sanitizedProperties.messageText,
      shortMessage: sanitizedProperties.shortMessage || 'Important Message from HabiTools',
      shouldNotifyHabiticaViaAdmin: true,
      shouldNotify: true,
      priority: sanitizedProperties.priority ?? 2,
      acknowledged: sanitizedProperties.acknowledged ?? false,
    });
  }))
    .then((sendResults) => {
      const failedCount = sendResults.filter((result) => {
        if (result.status === 'rejected') { return true; }
        return Boolean(result.value?.code);
      }).length;

      const successCount = sendResults.length - failedCount;

      handleApiAnalytic(req, 'global_habitica_notification', JSON.stringify({
        event_slug: eventSlug,
        total_users_searched: userList.length,
        linked_habitica_users: linkedUsers.length,
        success_count: successCount,
        failed_count: failedCount,
      }));
    })
    .catch(() => {});

  return {
    event_slug: eventSlug,
    sent_count: linkedUsers.length,
  };
};