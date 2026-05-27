// This is a mapping of webhook tasks with their configurations.
// Anytime a new function is created that should be available as a webhook,
// it needs to be added here along with sensible default configuration.
// Each function MUST have methods for 'execute', 'create', 'modify', and 'remove'.

import { autoAcceptQuestsWebhookTaskConfigs } from 'internal/habitica/tools/autoAcceptQuests/core/autoAcceptQuestsWebhookTaskConfigs';
import { autoStartQuestsWebhookTaskConfigs } from 'internal/habitica/tools/autoStartQuest/core/autoStartQuestsWebhookTaskConfigs';


export const taskConfigs = {
  'example-webhook-logger': {
    options: { showParameters: true, showWebhookData: true },
    execute: (parameters, webhookData) => {
      const loggerResult = {
        saved_param_message: parameters.data?.message || undefined,
        webhook_message: webhookData?.data?.message || undefined,
        parameters: parameters.options?.showParameters ? parameters : undefined,
        webhookData: parameters.options?.showWebhookData ? webhookData : undefined,
      };
      console.debug('Executing example-webhook-logger webhook with result:', loggerResult);
    },
    create: (parameters) => {
      // This is where we will send configuration request to the external service.
      // As well as any internal setup needed.
      console.debug('Creating example-webhook-logger webhook with parameters:', parameters);
    },
    modify: (parameters) => {
      // This is where we will send modification request to the external service.
      console.debug('Modifying example-webhook-logger webhook:', parameters);
    },
    remove: (parameters, cleanupData) => {
      // This is where we will send deletion request to the external service.
      // As well as any internal cleanup needed.
      console.debug('Example-webhook-logger cleanup parameters:', parameters);
      console.debug('Example-webhook-logger cleanup cleanupData:', cleanupData);
      return { parameters, cleanupData };
    },
  },
  ...autoAcceptQuestsWebhookTaskConfigs,
  ...autoStartQuestsWebhookTaskConfigs,
};