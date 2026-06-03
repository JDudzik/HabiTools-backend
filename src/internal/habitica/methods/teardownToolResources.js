import HabiticaTool from 'knex/models/HabiticaTool';
import Webhook from 'knex/models/Webhook';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { deleteWebhooks } from 'internal/webhooks/core/deleteWebhooks';
import { deleteCrons } from 'internal/cron/core/deleteCrons';
import { sanitizeProperties, isUUID, returnOrSendResponse } from 'utils';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';


const deleteExternalWebhooks = async (resourceId) => {
  const externalWebhooks = await Webhook.query()
    .where({ resource_id: resourceId })
    .whereNull('deleted_at')
    .catch((err) => { throw [ err, 'teardownToolResources.deleteExternalWebhooks' ]; });

  return Promise.all(externalWebhooks.map(async (webhook) => {
    const habiticaWebhookId = webhook?.data?.habiticaWebhookId;
    const habiticaUserId = webhook?.data?.habiticaUserId;

    if (!habiticaWebhookId || !habiticaUserId) { return false; }

    try {
      await callHabiticaApi({
        method: 'DELETE',
        path: `/user/webhook/${ habiticaWebhookId }`,
        habiticaUserId,
        retryConfig: {
          retryOnNetworkError: true,
          retryOnRateLimit: true,
        },
      });
      return true;
    } catch { return false; }
  }));
};


const deleteToolRecords = async (resourceId) => {
  const toolDeletes = await HabiticaTool.query()
    .where({ id: resourceId })
    .whereNull('deleted_at')
    .del()
    .catch((err) => { throw [ err, 'teardownToolResources.deleteToolRecords.patchTool' ]; });

  return toolDeletes;
};


/**
 * Tears down all resources associated with a Habitica tool, such as external webhooks, internal webhooks, and crons. Optionally sends a notification to the user about the teardown if a userId and notification details are provided.
 * @param {Object} properties - The properties for tearing down the tool resources.
 * @param {string} properties.resourceId - The ID of the tool whose resources are being torn down.
 * @param {Object} [properties.notification] - Optional notification details to send to the user about the teardown.
 * @param {string} properties.notification.slugPrefix - The prefix for the event slug (e.g. 'auto-accept-quests').
 * @param {string} properties.notification.name - The name of the tool (e.g. 'Auto-Accept Quests') to use in the notification message.
 * @param {boolean} [properties.notification.fromExpiration=false] - Whether the teardown is due to an expiration, which changes the notification message.
 * @param {string} [properties.userId] - The user ID to send the notification to if notification details are provided.
 * @returns {Promise<Object>} - A success message, or an error response if the resourceId is invalid or if there was an error during the teardown process.
 */
export const teardownToolResources = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'resourceId' ],
    optionalKeys: [ 'notification', 'userId' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isUUID('resourceId', 'resourceId must be a valid UUID'),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  let notification = sanitizedProperties?.notification;
  if (notification) {
    const sanitizedNotification = sanitizeProperties(notification, {
      requiredKeys: [ 'slugPrefix', 'name' ],
      optionalKeys: [ 'fromExpiration' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    });
    if (!sanitizedNotification.valid) { return sanitizedNotification.error; }
    notification = sanitizedNotification.properties;
  }

  await deleteExternalWebhooks(sanitizedProperties.resourceId);
  await deleteWebhooks({ resourceId: sanitizedProperties.resourceId });
  await deleteCrons({ resourceId: sanitizedProperties.resourceId, runCleanup: false });
  const toolDeletes = await deleteToolRecords(sanitizedProperties.resourceId);

  // We validate tool existence after deletions just in-case there's any stragglers that need to be removed.
  if (!toolDeletes) {
    return returnOrSendResponse(404, {
      status: 'TOOL_NOT_FOUND',
      message: 'No active tool instance found for the provided resourceId.',
    });
  }

  // If userId and notification details are provided, send a notification about the teardown.
  if (sanitizedProperties?.userId && notification?.slugPrefix && notification?.name) {
    await createEventMessage({
      userId: sanitizedProperties.userId,
      resourceId: sanitizedProperties.resourceId,
      eventSlug: notification?.fromExpiration ? `${ notification?.slugPrefix }-expired` : `${ notification?.slugPrefix }-disabled`,
      eventName: notification?.fromExpiration ? `${ notification?.name } Expired` : `${ notification?.name } Disabled`,
      messageText: notification?.fromExpiration
        ? `The ${ notification?.name } tool has expired because it wasn't refreshed. You can enable it again from the tool page.`
        : `${ notification?.name } has been disabled.`,
      shortMessage: notification?.fromExpiration
        ? `${ notification?.name } has expired.`
        : `${ notification?.name } has been disabled.`,
      shouldNotifyHabiticaViaAdmin: notification?.fromExpiration,
      shouldNotify: true,
      priority: 2,
    }).catch(() => {});
  }

  return true;
};