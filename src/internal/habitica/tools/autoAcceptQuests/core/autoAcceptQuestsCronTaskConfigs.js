import { acceptPendingQuest } from './acceptPendingQuest';
import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';

/**
 * The cron task configurations for the Auto-Accept Quests tool, which includes a scheduled task to check for and accept pending quest invitations for linked Habitica accounts, and a cleanup function to tear down resources and notify the user if the cron task is removed or expires.
 */
export const autoAcceptQuestsCronTaskConfigs = {
  'auto-accept-quests-cron': {
    schedule: 'RAND() RAND() RAND(0,2)-23/3 * * *',

    job: async (parameters, _cronData) => {
      await acceptPendingQuest({
        userId: parameters.userId,
        resourceId: parameters.resourceId,
        habiticaUserId: parameters.data?.habiticaUserId,
        source: 'cron',
      });
    },

    cleanup: (parameters, cleanupData) => {
      teardownToolResources({
        userId: parameters.userId,
        resourceId: parameters.resourceId,
        notification: {
          slugPrefix: 'auto-accept-quests',
          name: 'Auto Accept Quests',
          fromExpiration: cleanupData?.fromExpiration,
        },
      }).catch(() => {});
    },
  },
};
