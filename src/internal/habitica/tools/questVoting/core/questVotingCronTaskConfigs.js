import { runQuestVotingLifecycleCheck } from './questVotingCore';
import { handleQuestVotingExpirationCleanup } from './questVotingExpirationCleanup';

export const questVotingCronTaskConfigs = {
  'quest-voting-hourly-check': {
    schedule: 'RAND() RAND(0,59) * * * *',

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
