import { checkPartyActivity } from './checkPartyActivity';
import { teardownToolResources } from 'internal/habitica/methods/teardownToolResources';


/**
 * The cron task configurations for the Party Pulse tool
 */
export const autoAcceptQuestsCronTaskConfigs = {
  'party-pulse-cron': {
    schedule: 'RAND() RAND()/30 HOUR(0) * * *',

    job: async (parameters, _cronData) => {
      await checkPartyActivity({
        userId: parameters.userId,
        resourceId: parameters.resourceId,
        habiticaUserId: parameters.data?.habiticaUserId,
      });
    },

    cleanup: (parameters, cleanupData) => {
      teardownToolResources({
        userId: parameters.userId,
        resourceId: parameters.resourceId,
        notification: {
          slugPrefix: 'party-pulse',
          name: 'Party Pulse',
          fromExpiration: cleanupData?.fromExpiration,
        },
      }).catch(() => {});
    },
  },
};
