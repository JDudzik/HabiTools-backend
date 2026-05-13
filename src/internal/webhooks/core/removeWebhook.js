import Webhook from 'knex/models/Webhook';
import { taskConfigs } from '../core/taskConfigs';
import { allowValidUUID, returnOrSendResponse } from 'utils';
import { deleteWebhooks } from './deleteWebhooks';


export const removeWebhook = async (config) => {
  const { id, user_id, cleanupData } = config;
  if (id && !allowValidUUID(id)) { return; }
  if (user_id && !allowValidUUID(user_id)) { return; }

  const parameters = await Webhook.query()
    .modify((qb) => {
      if (id) {
        qb.where('id', id);
      }
      if (user_id) {
        qb.where('user_id', user_id);
      }
    })
    .first();

  if (!parameters) {
    return returnOrSendResponse(404, {
      status: 'WEBHOOK_NOT_FOUND',
      message: 'A webhook with the specified details does not exist.',
    });
  }

  const selectedTask = taskConfigs[parameters?.task_name];
  selectedTask?.remove?.(parameters, cleanupData);  

  const deleteResult = await deleteWebhooks({ id: parameters.id })
    .catch((err) => { throw [ err, 'removeWebhook.removeFromDatabase' ]; });

  return {
    success: (!!parameters || !!deleteResult?.success),
    webhook: parameters,
  };
};