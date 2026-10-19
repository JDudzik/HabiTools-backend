import { runQuestVotingLifecycleCheck } from './questVotingCore';
import { handleQuestVotingExpirationCleanup } from './questVotingExpirationCleanup';
import { handleApiAnalytic } from 'utils';


export const questVotingCronTaskConfigs = {
  'quest-voting-hourly-check': {
    schedule: 'RAND() MIN(0) * * * *',

    job: async (parameters, _cronData) => {
      handleApiAnalytic(undefined, 'QV:cron_triggered', { parameters });
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
