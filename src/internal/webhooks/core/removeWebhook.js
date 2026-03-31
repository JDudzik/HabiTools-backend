import Webhook from 'knex/models/Webhook';
import { taskConfigs } from '../core/taskConfigs';
import { allowValidUUID, returnOrSendResponse } from 'utils';
import { handleApiError } from 'utils/methods/handleApiError';


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

  if (!parameters || parameters?.deletes_attempted > 3) {
    if (parameters?.deletes_attempted < 8) {
      handleApiError(
        new Error(`Failed to remove webhook after ${ parameters?.deletes_attempted } attempts. ID: ${ parameters?.id }, task_name: ${ parameters?.task_name }`),
        'removeWebhook.webhookFailedRemovals',
        { skipReq: true, skipRes: true },
      ); 
    }
    if (parameters?.deletes_attempted >= 8) {
      return { success: false };
    }
  }

  const selectedTask = taskConfigs[parameters?.task_name];
  selectedTask?.remove?.(parameters, cleanupData);  

  const recordsPatched = await Webhook.query()
    .patch({
      deleted_at: Date.now(),
      updated_at: Date.now(),
      deletes_attempted: parameters.deletes_attempted > 0 ? parameters.deletes_attempted + 1 : 1,
    })
    .where({ id: parameters.id })
    .catch((err) => { throw [ err, 'removeWebhook.removeFromDatabase' ]; });

  return {
    success: (!!parameters || recordsPatched > 0),
    webhook: parameters,
  };
};