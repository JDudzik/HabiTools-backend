import { listUserWebhooks } from 'internal/webhooks/core/listUserWebhooks';
import { removeWebhook } from 'internal/webhooks/core/removeWebhook';
import { setWebhook } from 'internal/webhooks/core/setWebhook';
import { webhookExecuter } from 'internal/webhooks/methods/webhookExecuter';
import { getLoggedInUser } from 'utils';


// List User Webhooks
//
// -- GET --
// {API_URL}/v1/auth/webhooks/list
// -- ERROR CODES --
export const list = async (req, res) => {
  const user_id = await getLoggedInUser(req, [ 'id' ]);
  const { webhook_id } = req.params;
  const result = await listUserWebhooks({ user_id, webhook_id });

  if (result?.code) {
    return res.status(result.code).send(result.responseContent);
  }
  return res.status(200).send(result);
};

// Trigger Webhook
//
// -- POST --
// {API_URL}/v1/webhooks/trigger/:url_id
// -- PARAMS --
// url_id: The unique identifier for the webhook URL.
// receivedWebhookData: The data received from the webhook trigger.
// -- ERROR CODES --
export const trigger = async (req, res) => {
  const { url_id } = req.params;
  const receivedWebhookData = req.body;
  const result = await webhookExecuter({ url_id, receivedWebhookData });

  if (result?.code) {
    return res.status(result.code).send(result.responseContent);
  }
  return res.status(200).send({ success: true, result });
};


// Set Webhook
//
// -- POST --
// {API_URL}/v1/webhooks/set
// -- PARAMS --
// id: The ID of the webhook (in case of modification),
// urlId: The unique URL identifier for the webhook, if not provided, a new one will be generated.
// resourceId: The ID of the resource the webhook is associated with.
// expiresAt: The expiration date of the webhook.
// taskName: The name of the task to execute for this webhook.
// isActive: Whether the webhook is active or not.
// options: Additional options for the webhook task.
// data: The execution specific data for this instance of the webhook.
// skipTaskSetup: Whether to skip running create or modify task setup functions.
// -- ERROR CODES --
export const set = async (req, res) => {
  const user_id = await getLoggedInUser(req, [ 'id' ]);
  const webhookParameters = { ...req.body, user_id };
  const result = await setWebhook(webhookParameters);

  if (result?.code) {
    return res.status(result.code).send(result.responseContent);
  }
  return res.status(200).send(result);
};


// Remove Webhook
//
// -- DELETE --
// {API_URL}/v1/webhooks/remove/:webhook_id
// -- PARAMS --
// webhook_id: The unique identifier for the webhook to remove.
// -- ERROR CODES --
export const remove = async (req, res) => {
  const { webhook_id } = req.params;
  const cleanupData = req.body;
  const user_id = await getLoggedInUser(req, [ 'id' ]);
  const result = await removeWebhook({ id: webhook_id, user_id, cleanupData });

  if (result?.code) {
    return res.status(result.code).send(result.responseContent);
  }
  return res.status(200).send(result);
};