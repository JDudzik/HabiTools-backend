import { runQuestVotingLifecycleCheck, disableQuestVotingTool } from './questVotingCore';

export const questVotingWebhookTaskConfigs = {
  'quest-voting-party-webhook': {
    options: {},

    execute: async (parameters, _webhookData) => {
      await runQuestVotingLifecycleCheck({
        resourceId: parameters.resource_id,
        source: 'webhook',
      });
      return { success: true };
    },

    create: (_parameters) => {},
    modify: (_parameters) => {},

    remove: async (parameters, cleanupData) => {
      if (!parameters?.user_id) { return; }

      if (cleanupData?.fromExpiration) {
        await disableQuestVotingTool({ userId: parameters.user_id });
      }
    },
  },
};
