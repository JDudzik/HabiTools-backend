import { runQuestVotingLifecycleCheck, disableQuestVotingTool } from './questVotingCore';


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
      if (!parameters?.user_id) { return; }

      if (cleanupData?.fromExpiration) {
        await disableQuestVotingTool({ userId: parameters.user_id });
      }
    },
  },
};
