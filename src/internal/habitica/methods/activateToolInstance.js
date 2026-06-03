import HabiticaTool from 'knex/models/HabiticaTool';
import Webhook from 'knex/models/Webhook';
import { setCron } from 'internal/cron/core/setCron';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { setWebhook } from 'internal/webhooks/core/setWebhook';
import { sanitizeProperties, returnOrSendResponse, handleApiAnalytic } from 'utils';


const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const WEBHOOK_BASE_URL = process.env.HABITICA_WEBHOOK_URL_OVERRIDE || process.env.BACKEND_HOST;

const setupToolWebhook = async ({
  webhookConfig,
  toolInstance,
  userId,
  habiticaUser,
  expiresAt,
}) => {
  const internalWebhookData = webhookConfig?.internalData || {};

  const internalWebhook = await setWebhook({
    user_id: userId,
    resource_id: toolInstance.id,
    task_name: webhookConfig.taskName,
    expires_at: expiresAt,
    is_active: true,
    data: { habiticaUserId: habiticaUser.habitica_user_id, ...internalWebhookData },
    skipTaskSetup: true,
  });

  const callbackUrl = `${ WEBHOOK_BASE_URL }/v1/webhooks/trigger/${ internalWebhook.url_id }`;
  const habiticaResult = await callHabiticaApi({
    method: 'POST',
    path: '/user/webhook',
    habiticaUserId: habiticaUser.habitica_user_id,
    body: {
      url: callbackUrl,
      enabled: true,
      ...(webhookConfig?.externalWebhookBody || {}),
    },
    retryConfig: {
      retryOnNetworkError: true,
      retryOnRateLimit: true,
    },
  });

  if (habiticaResult?.code) {
    return returnOrSendResponse(habiticaResult.code, habiticaResult.responseContent);
  }

  const habiticaWebhookId = habiticaResult?.data?.id;

  await Webhook.query()
    .where({ id: internalWebhook.id })
    .patch({ data: { ...(internalWebhook.data || {}), habiticaWebhookId }});

  return {
    internalWebhook,
    habiticaWebhookId,
  };
};


/**
 * Creates a Habitica tool instance and wires the configured webhooks/crons for that tool.
 * @param {Object} config - Single configuration object for activation behavior.
 * @param {string} config.userId - User ID for the tool owner.
 * @param {string} config.toolSlug - Habitica tool slug.
 * @param {string} config.toolName - Human-readable tool name used for generated messages.
 * @param {Object} [config.toolData=null] - Initial static tool data object.
 * @param {Array<Object>} [config.webhooks=[]] - Webhook configs for the tool.
 * @param {Array<Object>} [config.crons=[]] - Cron configs for the tool.
 * @param {Object} [config.eventMessage] - Optional event message fields that override generated defaults.
 * @param {Function} [config.onSuccess] - Optional callback invoked after successful setup.
 * @returns {Promise<Object>} Result object or returnOrSendResponse payload.
 */
export const activateToolInstance = async (config) => {
  const req = config.req;
  const sanitizedConfigPayload = sanitizeProperties(config, {
    requiredKeys: [ 'userId', 'toolSlug', 'toolName' ],
    optionalKeys: [ 'toolData', 'webhooks', 'crons', 'eventMessage', 'onSuccess' ],
    trimPayload: true,
    removeDisallowedKeys: true,
  });
  if (!sanitizedConfigPayload.valid) { return sanitizedConfigPayload.error; }

  const {
    userId,
    toolSlug,
    toolName,
    toolData = null,
    webhooks = [],
    crons = [],
    eventMessage,
  } = sanitizedConfigPayload.properties;
  const now = Date.now();
  const habiticaUser = await getLinkedHabiticaUser({ userId });
  if (habiticaUser?.code) { return returnOrSendResponse(habiticaUser.code, habiticaUser.responseContent); }

  const existingTool = await HabiticaTool.query()
    .where({ habitica_user_id: habiticaUser.id, tool_slug: toolSlug })
    .whereNull('deleted_at')
    .where((qb) => {
      qb.whereNull('expires_at').orWhere('expires_at', '>', now);
    })
    .first();

  if (existingTool) {
    return returnOrSendResponse(409, {
      status: 'TOOL_ALREADY_ACTIVE',
      message: `${ toolName } is already active for your account.`,
    });
  }

  const expiresAt = now + THIRTY_DAYS_MS;
  const initialToolData = toolData;

  const toolInstance = await HabiticaTool.query().insertAndFetch({
    habitica_user_id: habiticaUser.id,
    tool_slug: toolSlug,
    created_at: now,
    updated_at: now,
    expires_at: expiresAt,
    last_refreshed_at: now,
    data: initialToolData ?? null,
  });

  const createdWebhooks = [];
  const createdCrons = [];

  try {
    for (const webhookConfig of webhooks) {
      const webhookResult = await setupToolWebhook({
        webhookConfig,
        toolInstance,
        userId,
        habiticaUser,
        expiresAt,
      });
      if (webhookResult?.code) {
        await teardownToolResources({ resourceId: toolInstance.id });
        return webhookResult;
      }

      createdWebhooks.push(webhookResult);
    }

    for (const cronConfig of crons) {
      const cronData = cronConfig?.data || {};

      const internalCron = await setCron({
        userId,
        resourceId: toolInstance.id,
        taskName: cronConfig.taskName,
        expiresAt,
        isActive: cronConfig?.isActive ?? true,
        immediateOnce: cronConfig?.immediateOnce ?? false,
        immediateAlways: cronConfig?.immediateAlways ?? false,
        schedule: cronConfig?.schedule,
        options: cronConfig?.options,
        data: { habiticaUserId: habiticaUser.habitica_user_id, ...cronData },
      });

      createdCrons.push({
        parameters: internalCron.parameters,
        task: {
          cronExpression: internalCron.task.cronExpression,
          timezone: internalCron.task.timezone,
        },
      });
    }
  } catch {
    await teardownToolResources({ resourceId: toolInstance.id });
    return returnOrSendResponse(500, {
      status: 'TOOL_ACTIVATION_FAILED',
      message: 'Failed to activate this tool instance. Please try again.',
    });
  }

  handleApiAnalytic(req, 'activated_tool', JSON.stringify({
    habitica_username: habiticaUser?.habitica_user_data?.username || null,
    habitica_email: habiticaUser?.habitica_user_data?.email || null,
    tool_slug: toolSlug,
  }));

  createEventMessage({
    userId,
    resourceId: toolInstance.id,
    priority: 1,
    eventSlug: `${ toolSlug }-activated`,
    eventName: 'Tool Activated',
    messageText: `The ${ toolName } tool has been activated.`,
    shortMessage: `${ toolName } activated.`,
    ...(eventMessage || {}),
  }).catch(() => {});

  return {
    success: true,
    resourceId: toolInstance.id,
    toolInstance,
    webhooks: createdWebhooks,
    crons: createdCrons,
    userId,
    habiticaUser,
    expiresAt,
  };
};
