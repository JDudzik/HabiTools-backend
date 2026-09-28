import { runQuestVotingLifecycleCheck } from './questVotingCore';
import { handleQuestVotingExpirationCleanup } from './questVotingExpirationCleanup';

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
      await handleQuestVotingExpirationCleanup({
        userId: parameters?.user_id || parameters?.userId,
        resourceId: parameters?.resource_id || parameters?.resourceId,
        fromExpiration: cleanupData?.fromExpiration,
      });
    },
  },
};
