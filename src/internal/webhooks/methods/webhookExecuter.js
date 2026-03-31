import Webhook from 'knex/models/Webhook';
import { removeWebhook } from '../core/removeWebhook';
import { taskConfigs } from '../core/taskConfigs';
import { returnOrSendResponse } from 'utils';


export const webhookExecuter = async (config) => {
  const { url_id, receivedWebhookData } = config;

  const parameters = await Webhook.query()
    .whereNull('deleted_at')
    .where('url_id', url_id)
    .first();

  if (!parameters) {
    return returnOrSendResponse(404, {
      status: 'WEBHOOK_NOT_FOUND',
      message: 'A webhook with the specified details does not exist.',
    });
  }

  const selectedTask = taskConfigs?.[parameters?.task_name];

  if ((parameters.expires_at && Date.now() > parameters.expires_at) || (!!parameters.deleted_at)) {
    await removeWebhook({
      id: parameters.id,
      cleanupData: receivedWebhookData,
    });
    return returnOrSendResponse(410, {
      status: 'WEBHOOK_EXPIRED',
      message: 'A webhook with the specified details does not exist.',
    });
  }

  if (!parameters.is_active) {
    return returnOrSendResponse(403, {
      status: 'WEBHOOK_INACTIVE',
      message: 'The webhook is currently inactive.',
    });
  }

  if (selectedTask?.execute) {
    return await selectedTask?.execute({
      ...parameters,
      // Options work on 3 layers that progressively override each other:
      //   Default task options: these can be modified from the taskConfigs and will effect ALL instance of that task.
      //   Parameters options: these are set when creating/modifying the webhook and stored in the database for only that instance.
      //   Received webhook data options: these are provided at execution time and only effect that execution.
      options: { ...selectedTask?.options, ...parameters?.options, ...receivedWebhookData?.options },
    }, receivedWebhookData);
  }
  
  return returnOrSendResponse(404, {
    status: 'WEBHOOK_NOT_FOUND',
    message: 'A webhook with the specified details does not exist.',
  });
};
