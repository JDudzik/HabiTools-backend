import Webhook from 'knex/models/Webhook';


const deleteWebhookRecords = async (webhookId) => {
  const recordsDeleted = await Webhook.query()
    .where({ id: webhookId })
    .whereNull('deleted_at')
    .del()
    .catch((err) => { throw [ err, 'deleteWebhooks.webhookDeleted' ]; });

  return recordsDeleted > 0;
};


export const deleteWebhooks = async ({ id, resourceId }) => {
  if (!id && !resourceId) {
    return {
      webhooks: [],
      localWebhookDeletes: [],
      found: false,
      success: false,
      webhook: null,
    };
  }

  const webhooks = await Webhook.query()
    .whereNull('deleted_at')
    .modify((qb) => {
      if (id) {
        qb.where('id', '=', id);
      } else if (resourceId) {
        qb.where('resource_id', '=', resourceId);
      }
    })
    .catch((err) => { throw [ err, 'deleteWebhooks.deleteWebhook.findWebhooks' ]; });

  const localWebhookDeletes = await Promise.all(webhooks.map(async (webhook) => {
    const success = await deleteWebhookRecords(webhook.id);
    return {
      webhookId: webhook.id,
      found: true,
      success,
    };
  }));

  return {
    webhooks,
    webhook: webhooks[0] || null,
    found: webhooks.length > 0,
    success: localWebhookDeletes.some(item => item.success),
  };
};