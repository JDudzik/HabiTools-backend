import HabiticaTool from 'knex/models/HabiticaTool';
import Webhook from 'knex/models/Webhook';
import Cron from 'knex/models/Cron';
import activeCrons from 'internal/cron/core/activeCrons';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { sanitizeProperties, isUUID, returnOrSendResponse } from 'utils';


const hasPlainObjectValues = (value) => {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
};


/**
 * Modifies data for a tool instance and all associated webhooks/crons linked by resourceId.
 * This method validates ownership by userId before applying updates.
 * @param {Object} properties - The properties for modifying tool-related data.
 * @param {string} properties.resourceId - The tool resource ID.
 * @param {string} properties.userId - The owner user ID.
 * @param {Object} [properties.toolData] - Data to merge into the HabiticaTool.data payload.
 * @param {Object} [properties.webhookData] - Data to merge into each related Webhook.data payload.
 * @param {Object} [properties.cronData] - Data to merge into each related Cron.data payload.
 * @param {Object} [properties.eventMessage] - Data to create an event message.
 * @param {boolean} [properties.skipEventMessage] - Whether to skip creating an event message.
 * @returns {Promise<Object>} - A success response with update counts or an error response.
 */
export const modifyToolInstanceData = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'resourceId', 'userId' ],
    optionalKeys: [ 'toolData', 'webhookData', 'cronData', 'eventMessage', 'skipEventMessage' ],
    trimPayload: true,
    atLeastOneOptionalProp: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isUUID('resourceId', 'resourceId must be a valid UUID'),
      isUUID('userId', 'userId must be a valid UUID'),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  const selectedTool = await HabiticaTool.query()
    .alias('tool')
    .joinRelated('habitica_user')
    .where('tool.id', sanitizedProperties.resourceId)
    .whereNull('tool.deleted_at')
    .where('habitica_user.user_id', sanitizedProperties.userId)
    .first();

  if (!selectedTool) {
    return returnOrSendResponse(404, {
      status: 'TOOL_NOT_FOUND',
      message: 'No active tool instance found for the provided resourceId.',
    });
  }

  const now = Date.now();
  const updatedSummary = {
    toolUpdated: false,
    webhooksUpdated: 0,
    cronsUpdated: 0,
  };

  // Updates to the tool's own data
  const hasToolData = hasPlainObjectValues(sanitizedProperties.toolData);
  if (hasToolData) {
    const finalToolData = { ...(selectedTool.data || {}), ...sanitizedProperties.toolData };
    await HabiticaTool.query()
      .patch({
        data: finalToolData,
        updated_at: now,
      })
      .where({ id: selectedTool.id });
    updatedSummary.toolUpdated = true;
  }

  // Updates to associated webhooks
  const hasWebhookData = hasPlainObjectValues(sanitizedProperties.webhookData);
  if (hasWebhookData) {
    const webhooks = await Webhook.query()
      .where({ user_id: sanitizedProperties.userId, resource_id: selectedTool.id })
      .whereNull('deleted_at');

    await Promise.all(webhooks.map((webhook) => {
      const mergedData = { ...webhook.data, ...sanitizedProperties.webhookData };
      return Webhook.query()
        .patch({ data: mergedData, updated_at: now })
        .where({ id: webhook.id });
    }));

    updatedSummary.webhooksUpdated = webhooks.length;
  }

  // Updates to associated crons
  const hasCronData = hasPlainObjectValues(sanitizedProperties.cronData);
  if (hasCronData) {
    const crons = await Cron.query()
      .where({ user_id: sanitizedProperties.userId, resource_id: selectedTool.id })
      .whereNull('deleted_at');

    const inactiveCronIds = [];

    for (const cron of crons) {
      const activeCron = activeCrons[cron.id];
      const mergedData = { ...cron.data, ...sanitizedProperties.cronData };

      if (activeCron?.parameters?.setThisCron) {
        await activeCron.parameters.setThisCron({
          ...activeCron.parameters,
          data: mergedData,
        });
      } else {
        inactiveCronIds.push({ id: cron.id, data: mergedData });
      }
    }

    // Update inactive crons in the database.
    await Promise.all(inactiveCronIds.map((cronData) => {
      return Cron.query()
        .patch({ data: cronData.data, updated_at: now })
        .where({ id: cronData.id });
    }));

    updatedSummary.cronsUpdated = crons.length;
  }

  if (!sanitizedProperties.skipEventMessage) {
    createEventMessage({
      user_id: sanitizedProperties.userId,
      resource_id: selectedTool.id,
      priority: 1,
      event_slug: `${ sanitizedProperties.resourceId }-modified`,
      event_name: 'Tool Updated',
      message_text: 'This tool\'s settings have been updated.',
      short_text: 'Tool updated.',
      ...(sanitizedProperties.eventMessage || {}),
    }).catch(() => {});
  }


  return {
    success: true,
    ...updatedSummary,
  };
};