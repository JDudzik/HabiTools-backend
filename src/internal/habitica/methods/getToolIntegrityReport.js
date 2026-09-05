import HabiticaTool from 'knex/models/HabiticaTool';
import Webhook from 'knex/models/Webhook';
import HabiticaUser from 'knex/models/HabiticaUser';
import { habiticaWebhookTaskConfigs } from 'internal/habitica/core/habiticaWebhookTaskConfigs';


const WEBHOOK_BASE_URL = process.env.HABITICA_WEBHOOK_URL_OVERRIDE || process.env.BACKEND_HOST;


const normalizeBaseUrl = (url) => {
  if (!url || typeof url !== 'string') { return ''; }
  return url.replace(/\/+$/, '');
};

const isHabitoolsManagedWebhook = (webhookUrl, normalizedBaseUrl) => {
  if (!webhookUrl || typeof webhookUrl !== 'string') { return false; }
  if (!normalizedBaseUrl) { return false; }
  return webhookUrl.startsWith(normalizedBaseUrl);
};


const getOrphanedToolWebhooks = async () => {
  const habiticaWebhookTaskNames = Object.keys(habiticaWebhookTaskConfigs || {});
  if (habiticaWebhookTaskNames.length < 1) {
    return [];
  }

  const normalizedBaseUrl = normalizeBaseUrl(WEBHOOK_BASE_URL);
  if (!normalizedBaseUrl) {
    return [];
  }

  const [ internalWebhooks, linkedHabiticaUsers ] = await Promise.all([
    Webhook.query()
      .alias('webhook')
      .leftJoin('habitica_tools as tool', 'tool.id', 'webhook.resource_id')
      .whereNull('webhook.deleted_at')
      .whereNotNull('webhook.resource_id')
      .whereIn('webhook.task_name', habiticaWebhookTaskNames)
      .select(
        'webhook.id',
        'webhook.user_id',
        'webhook.resource_id',
        'webhook.task_name',
        'webhook.url_id',
        'webhook.is_active',
        'webhook.expires_at',
        'webhook.created_at',
        'webhook.updated_at',
        'webhook.data',
        'tool.id as tool_id',
        'tool.deleted_at as tool_deleted_at',
      ),
    HabiticaUser.query()
      .alias('habitica_user')
      .leftJoin('habitica_user_data as hud', 'hud.id', 'habitica_user.id')
      .select(
        'habitica_user.id',
        'habitica_user.user_id',
        'habitica_user.habitica_user_id',
        'hud.webhooks as webhooks',
      ),
  ]);

  const internalWebhookMap = new Map();
  internalWebhooks.forEach((webhook) => {
    const habiticaWebhookId = webhook?.data?.habiticaWebhookId;
    if (!habiticaWebhookId) { return; }

    const existing = internalWebhookMap.get(habiticaWebhookId) || [];
    existing.push(webhook.toJSON());
    internalWebhookMap.set(habiticaWebhookId, existing);
  });

  const orphanedWebhooks = [];
  linkedHabiticaUsers.forEach((habiticaUser) => {
    const userWebhooks = Array.isArray(habiticaUser?.webhooks) ? habiticaUser.webhooks : [];
    userWebhooks.forEach((habiticaWebhook) => {
      const webhookId = habiticaWebhook?.id;
      if (!webhookId) { return; }

      const webhookUrl = habiticaWebhook?.url;
      if (!isHabitoolsManagedWebhook(webhookUrl, normalizedBaseUrl)) {
        return;
      }

      const linkedInternalWebhooks = internalWebhookMap.get(webhookId) || [];
      const hasLinkedTool = linkedInternalWebhooks.some(webhook => webhook?.tool_id && !webhook?.tool_deleted_at);

      if (hasLinkedTool) {
        return;
      }

      orphanedWebhooks.push({
        user_id: habiticaUser?.user_id || null,
        habitica_user_id: habiticaUser?.id || null,
        habitica_user_uuid: habiticaUser?.habitica_user_id || null,
        habitica_webhook_id: webhookId,
        habitica_webhook: habiticaWebhook,
        linked_internal_webhooks: linkedInternalWebhooks,
      });
    });
  });

  orphanedWebhooks.sort((a, b) => {
    const aUpdatedAt = new Date(a?.habitica_webhook?.updatedAt || a?.habitica_webhook?.createdAt || 0).getTime();
    const bUpdatedAt = new Date(b?.habitica_webhook?.updatedAt || b?.habitica_webhook?.createdAt || 0).getTime();
    return bUpdatedAt - aUpdatedAt;
  });

  return orphanedWebhooks;
};


const getExpiredUndeletedTools = async (now) => {
  const expiredTools = await HabiticaTool.query()
    .alias('tool')
    .joinRelated('habitica_user')
    .whereNull('tool.deleted_at')
    .whereNotNull('tool.expires_at')
    .where('tool.expires_at', '<=', now)
    .select(
      'tool.id',
      'tool.habitica_user_id',
      'tool.tool_slug',
      'tool.expires_at',
      'tool.last_refreshed_at',
      'tool.created_at',
      'tool.updated_at',
      'tool.data',
      'habitica_user.user_id as user_id',
      'habitica_user.habitica_user_id as habitica_user_uuid',
    )
    .orderBy('tool.expires_at', 'asc');

  return expiredTools.map(tool => tool.toJSON());
};


/**
 * Returns admin-facing integrity data for Habitica tools and their linked webhooks.
 */
export const getToolIntegrityReport = async () => {
  const now = Date.now();
  const [ orphanedWebhooks, expiredUndeletedTools ] = await Promise.all([
    getOrphanedToolWebhooks(),
    getExpiredUndeletedTools(now),
  ]);

  return {
    checked_at: now,
    orphaned_webhooks: orphanedWebhooks,
    expired_undeleted_tools: expiredUndeletedTools,
    orphaned_webhooks_count: orphanedWebhooks.length,
    expired_undeleted_tools_count: expiredUndeletedTools.length,
  };
};