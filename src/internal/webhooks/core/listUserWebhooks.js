import Webhook from 'knex/models/Webhook';
import { allowValidUUID, returnOrSendResponse } from 'utils';


export const listUserWebhooks = async (config) => {
  const { user_id, show_deleted, webhook_id } = config;
  if (user_id && !allowValidUUID(user_id)) { return; }
  if (webhook_id && !allowValidUUID(webhook_id)) { return; }

  const webhookList = await Webhook.query()
    .where('user_id', user_id)
    .modify((qb) => {
      if (!show_deleted && !webhook_id) {
        qb.whereNull('deleted_at');
      }
      if (webhook_id) {
        qb.where('id', webhook_id);
        qb.first();
      }
    });

  if (!webhookList || !Array.isArray(webhookList) || webhookList?.length === 0) {
    return returnOrSendResponse(404, {
      status: 'NO_WEBHOOKS_FOUND',
      message: 'No webhooks found for this user.',
    });
  }

  return webhookList;
};