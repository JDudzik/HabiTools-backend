import HabiticaTool from 'knex/models/HabiticaTool';
import Webhook from 'knex/models/Webhook';
import Cron from 'knex/models/Cron';
import activeCrons from 'internal/cron/core/activeCrons';
import { sanitizeProperties, isUUID, returnOrSendResponse } from 'utils';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;


/**
 * Refreshes a Habitica tool instance by updating its expiration metadata and the expiration of all associated resources such as webhooks and crons. Validates that the tool instance is active and not expired before performing the refresh.
 * @param {Object} properties - The properties for refreshing the tool instance.
 * @param {string} properties.resourceId - The ID of the tool instance to refresh.
 * @param {string} properties.userId - The user ID of the owner of the tool instance.
 * @returns {Promise<Object>} - A success message with the new expiration date, or an error response if the tool instance is not active or has already expired.
 */
export const refreshToolInstance = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'resourceId', 'userId' ],
    propertyValidations: [
      isUUID('resourceId', 'resourceId must be a valid UUID'),
      isUUID('userId', 'userId must be a valid UUID'),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const { resourceId, userId } = sanitizedPayload.properties;
  const now = Date.now();

  // Obtain the tool instance.
  const selectedTool = await HabiticaTool.query()
    .alias('tool')
    .joinRelated('habitica_user')
    .where('tool.id', resourceId)
    .whereNull('tool.deleted_at')
    .where('habitica_user.user_id', userId)
    .first();

  if (!selectedTool) {
    return returnOrSendResponse(409, {
      status: 'TOOL_NOT_ACTIVE',
      message: 'This tool instance is not active.',
    });
  }

  if (selectedTool.expires_at && selectedTool.expires_at <= now) {
    return returnOrSendResponse(410, {
      status: 'TOOL_EXPIRED',
      message: 'This tool instance has expired and cannot be refreshed. Please create a new instance to continue using this tool.',
    });
  }


  // Refresh the tool expiration metadata.
  const newExpiration = now + THIRTY_DAYS_MS;

  await HabiticaTool.query()
    .patch({
      expires_at: newExpiration,
      last_refreshed_at: now,
      updated_at: now,
    })
    .where({ id: selectedTool.id });


  // Refresh all associated webhook expirations when active webhooks exist.
  const webhooks = await Webhook.query()
    .where({
      user_id: userId,
      resource_id: selectedTool.id,
    })
    .whereNull('deleted_at');

  if (webhooks.length) {
    await Webhook.query()
      .patch({ expires_at: newExpiration, updated_at: now })
      .whereIn('id', webhooks.map(webhook => webhook.id));
  }


  // Refresh all associated cron expirations and keep in-memory active cron state in sync.
  const crons = await Cron.query()
    .where({
      user_id: userId,
      resource_id: selectedTool.id,
    })
    .whereNull('deleted_at')
    .where((qb) => {
      qb.whereNull('expires_at').orWhere('expires_at', '>', now);
    });

  if (crons.length) {
    const inactiveCronIds = [];

    for (const cron of crons) {
      const activeCron = activeCrons[cron.id];
      if (activeCron) {
        await activeCron.parameters.setThisCron({
          ...activeCron.parameters,
          expiresAt: newExpiration,
        });
      } else {
        inactiveCronIds.push(cron.id);
      }
    }

    if (inactiveCronIds.length) {
      await Cron.query()
        .patch({ expires_at: newExpiration, updated_at: now })
        .whereIn('id', inactiveCronIds);
    }
  }

  return { success: true, tool_id: selectedTool.id, expires_at: newExpiration };
};