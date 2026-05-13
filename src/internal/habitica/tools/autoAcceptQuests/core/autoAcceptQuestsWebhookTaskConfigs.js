import { acceptPendingQuest } from './acceptPendingQuest';
import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';


/**
 * The webhook task configurations for the Auto-Accept Quests tool, which includes a task to check for and accept pending quest invitations for linked Habitica accounts, and a cleanup function to tear down resources and notify the user if the webhook task is removed.
 */
export const autoAcceptQuestsWebhookTaskConfigs = {
  'auto-accept-quests': {
    options: {},

    execute: (parameters, _webhookData) => {
      return acceptPendingQuest({
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
          slugPrefix: 'auto-accept-quests',
          name: 'Auto Accept Quests',
          fromExpiration: cleanupData?.fromExpiration,
        },
      }).catch(() => {});
    },
  },
};
