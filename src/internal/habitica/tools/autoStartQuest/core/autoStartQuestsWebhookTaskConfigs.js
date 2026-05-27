import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';
import { startQuestStartTimer } from './startQuestStartTimer';


/**
 * The webhook task configurations for the Auto-Start Quests tool.
 */
export const autoStartQuestsWebhookTaskConfigs = {
  'auto-start-quests-start-timer': {
    options: {},

    execute: (parameters, _webhookData) => {
      return startQuestStartTimer({
        userId: parameters.user_id,
        resourceId: parameters.resource_id,
        habiticaUserId: parameters.data?.habiticaUserId,
      });
    },

    create: (_parameters) => {},
    modify: (_parameters) => {},

    remove: (parameters, cleanupData) => {
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
