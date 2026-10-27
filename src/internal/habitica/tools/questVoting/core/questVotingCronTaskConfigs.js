import { runQuestVotingLifecycleCheck } from './questVotingCore';
import { handleQuestVotingExpirationCleanup } from './questVotingExpirationCleanup';


export const questVotingCronTaskConfigs = {
  'quest-voting-hourly-check': {
    schedule: 'SEC(0) MIN(0) * * * *',

    job: async (parameters, _cronData) => {
      await runQuestVotingLifecycleCheck({
        resourceId: parameters.resourceId,
        source: 'cron',
      });
    },

    cleanup: async (parameters, cleanupData) => {
      await handleQuestVotingExpirationCleanup({
        userId: parameters?.userId || parameters?.user_id,
        resourceId: parameters?.resourceId || parameters?.resource_id,
        fromExpiration: cleanupData?.fromExpiration,
      });
    },
  },
};
