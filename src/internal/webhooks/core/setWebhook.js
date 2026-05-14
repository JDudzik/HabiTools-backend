import crypto from 'crypto';
import { taskConfigs } from './taskConfigs';
import Webhook from 'knex/models/Webhook';
import { allowValidUUID } from 'utils';


export const setWebhook = async (topParameters) => {
  const {
    id: passedId,
    user_id,
    resource_id,
    expires_at,
    task_name,
    is_active = true,
    options,
    data = {},
    skipTaskSetup = false,
  } = topParameters;

  const selectedTask = taskConfigs[task_name];
  if (!selectedTask) {
    throw [ new Error(`Incorrect task_name provided: ${ task_name }`), 'setWebhook.invalidTask' ];
  }

  if (passedId && !allowValidUUID(passedId)) { return; }
  const isModifyingWebhook = !!(passedId);

  const webhookEntry = {
    id: passedId || crypto.randomUUID(),
    user_id,
    url_id: isModifyingWebhook ? undefined : `${ task_name }-${ crypto.randomUUID() }-${ crypto.randomUUID() }`,
    resource_id,
    created_at: isModifyingWebhook ? undefined : Date.now(),
    updated_at: Date.now(),
    deleted_at: null,
    expires_at: expires_at || null,
    task_name,
    is_active: !!is_active,
    options, // We only save options that are explicitly provided.
    data,
  };

  const webhookData = await Webhook.query()
    .upsertGraphAndFetch(webhookEntry, { insertMissing: true })
    .catch((err) => { throw [ err, 'setWebhook.failedDatabase' ]; });

  const parameters = {
    ...webhookData,
    options: { ...selectedTask?.options, ...options },
    data: JSON.parse(JSON.stringify(data)),
  };

  try {
    if (!skipTaskSetup) {
      if (!isModifyingWebhook) {
        selectedTask?.create?.(parameters);
      } else {
        selectedTask?.modify?.(parameters);
      }
    }
  } catch (error) {
    throw [ error, 'setWebhook.failedEstablish' ];
  }
  


  return { ...parameters };
};