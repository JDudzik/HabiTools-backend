import { startQuest } from './startQuest';


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

    cleanup: (_parameters, _cleanupData) => {},
  },
};
