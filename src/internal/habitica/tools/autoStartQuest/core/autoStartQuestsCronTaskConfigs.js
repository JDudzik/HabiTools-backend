import { startQuest } from './startQuest';
import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';


/**
 * The cron task configurations for the Auto-Start Quests tool.
 */
export const autoStartQuestsCronTaskConfigs = {
  'auto-start-quests-launch': {
    job: async (parameters, _cronData) => {
      await startQuest({
        userId: parameters.userId,
        resourceId: parameters.resourceId,
        habiticaUserId: parameters.data?.habiticaUserId,
        questKey: parameters.data?.questKey,
        questName: parameters.data?.questName,
        questUrl: parameters.data?.questUrl,
        removeThisCron: parameters.removeThisCron,
      });
    },

    cleanup: (parameters, cleanupData) => {
      teardownToolResources({
        userId: parameters.user_id,
        resourceId: parameters.resource_id,
        notification: {
          slugPrefix: 'auto-start-quests',
          name: 'Auto Start Quests',
          fromExpiration: cleanupData?.fromExpiration,
        },
      }).catch(() => {});
    },
  },
};
