import HabiticaTool from 'knex/models/HabiticaTool';
import Webhook from 'knex/models/Webhook';
import { setWebhook } from 'internal/webhooks/core/setWebhook';
import { setCron } from 'internal/cron/core/setCron';
import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { sanitizeProperties, isUUID, returnOrSendResponse, handleApiAnalytic } from 'utils';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TOOL_SLUG = 'auto-accept-quests';
const WEBHOOK_BASE_URL = process.env.HABITICA_WEBHOOK_URL_OVERRIDE || process.env.BACKEND_HOST;

/**
 * Creates a new Auto Accept Quests tool instance for a user, including setting up the necessary webhooks and crons.
 * @param {Object} properties - The properties for creating the tool instance.
 * @param {string} properties.user_id - The user ID of the owner of the tool instance.
 * @param {Object} [properties.req] - The Express request object, used for analytics. Optional if not creating through an API route.
 * @returns {Promise<Object>} - A success message with the new tool instance details, or an error response if the tool instance cannot be created.
 */
export const activateAutoAcceptQuestsTool = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'user_id' ],
    optionalKeys: [],
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isUUID('user_id', 'user_id must be a valid UUID'),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  const now = Date.now();
  const habiticaUser = await getLinkedHabiticaUser({ userId: sanitizedProperties.user_id });
  if (habiticaUser?.code) { return returnOrSendResponse(habiticaUser.code, habiticaUser.responseContent); }

  // Enforce one active Tool Instance per tool per user
  const existingTool = await HabiticaTool.query()
    .where({ habitica_user_id: habiticaUser.id, tool_slug: TOOL_SLUG })
    .whereNull('deleted_at')
    .where((qb) => {
      qb.whereNull('expires_at').orWhere('expires_at', '>', now);
    })
    .first();

  if (existingTool) {
    return returnOrSendResponse(409, {
      status: 'TOOL_ALREADY_ACTIVE',
      message: 'Auto Accept Quests is already active for your account.',
    });
  }

  const expiresAt = now + THIRTY_DAYS_MS;
  const toolInstance = await HabiticaTool.query().insertAndFetch({
    habitica_user_id: habiticaUser.id,
    tool_slug: TOOL_SLUG,
    created_at: now,
    updated_at: now,
    expires_at: expiresAt,
    last_refreshed_at: now,
    data: null,
  });

  // Create the internal webhook record first to obtain the url_id for the callback URL
  const internalWebhook = await setWebhook({
    user_id: sanitizedProperties.user_id,
    resource_id: toolInstance.id,
    task_name: TOOL_SLUG,
    expires_at: expiresAt,
    is_active: true,
    data: { habiticaUserId: habiticaUser.habitica_user_id },
    skipTaskSetup: true,
  });

  const callbackUrl = `${ WEBHOOK_BASE_URL }/v1/webhooks/trigger/${ internalWebhook.url_id }`;

  // Register the questActivity webhook on Habitica
  let habiticaWebhookId;
  try {
    const habiticaResult = await callHabiticaApi({
      method: 'POST',
      path: '/user/webhook',
      habiticaUserId: habiticaUser.habitica_user_id,
      body: {
        url: callbackUrl,
        enabled: true,
        type: 'questActivity',
        options: { questInvited: true },
      },
    });
    habiticaWebhookId = habiticaResult?.data?.id;
  } catch (error) {
    // Roll back internal records so state stays clean
    await Webhook.query()
      .where({ id: internalWebhook.id })
      .del();
    await HabiticaTool.query()
      .where({ id: toolInstance.id })
      .del();
    throw error;
  }

  // Persist the Habitica webhook ID so teardown can delete it later
  await Webhook.query()
    .where({ id: internalWebhook.id })
    .patch({ data: { ...(internalWebhook.data || {}), habiticaWebhookId }});

  // Create the hourly redundancy cron
  const internalCron = await setCron({
    userId: sanitizedProperties.user_id,
    resourceId: toolInstance.id,
    taskName: TOOL_SLUG,
    expiresAt,
    isActive: true,
    immediateOnce: true,
    data: { habiticaUserId: habiticaUser.habitica_user_id },
  });

  handleApiAnalytic(properties?.req, 'activated_tool', JSON.stringify({
    habitica_username: habiticaUser?.habitica_user_data?.username || null,
    habitica_email: habiticaUser?.habitica_user_data?.email || null,
    tool_slug: TOOL_SLUG,
  }));

  createEventMessage({
    user_id: sanitizedProperties.user_id,
    resource_id: toolInstance.id,
    event_slug: 'auto-accept-quests-activated',
    event_name: 'Tool Activated',
    message_text: 'The Auto Accept Quests tool has been activated.',
    short_message: 'Auto Accept Quests activated.',
    should_notify: true,
    priority: 1,
  }).catch(() => {});

  return {
    success: true,
    toolInstance: toolInstance,
    internalWebhook: internalWebhook,
    cronParameters: internalCron.parameters,
  };
};
