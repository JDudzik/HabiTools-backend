import { runQuestVotingLifecycleCheck } from './questVotingCore';
import { handleQuestVotingExpirationCleanup } from './questVotingExpirationCleanup';
import { handleApiAnalytic } from 'utils';


export const questVotingWebhookTaskConfigs = {
  'quest-voting-party-webhook': {
    options: {},

    execute: async (parameters, webhookData) => {
      handleApiAnalytic(undefined, 'QV:webhook_triggered', { parameters, webhookData });
      if (webhookData.webhookType === 'questActivity' && webhookData?.type === 'questInvited') {
        await runQuestVotingLifecycleCheck({
          resourceId: parameters.resource_id,
          source: 'webhook',
        });
      }
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
