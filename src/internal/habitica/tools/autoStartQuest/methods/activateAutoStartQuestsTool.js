import { activateToolInstance } from 'internal/habitica/methods/activateToolInstance';
import { startQuestStartTimer } from '../core/startQuestStartTimer';


/**
 * Creates a new Auto Start Quests tool instance for a user, including setting up the necessary webhooks and crons.
 * @param {Object} properties - The properties for creating the tool instance.
 * @param {string} properties.userId - The user ID of the owner of the tool instance.
 * @param {number} properties.waitHours - Number of hours to wait before starting an invited quest. Defaults to 24 hours if not provided.
 * @param {Object} [properties.req] - The Express request object, used for analytics. Optional if not creating through an API route.
 * @returns {Promise<Object>} - A success message with the new tool instance details, or an error response if the tool instance cannot be created.
 */
export const activateAutoStartQuestsTool = async (properties) => {
  const activatedResult = await activateToolInstance({
    req: properties.req,
    userId: properties.userId,
    toolSlug: 'auto_start_quests',
    toolName: 'Auto Start Quests',
    toolData: { waitHours: properties.waitHours ?? 24 },
    webhooks: [
      {
        taskName: 'auto-start-quests-start-timer',
        externalWebhookBody: {
          type: 'questActivity',
          options: {
            questInvited: true,
            questStarted: true,
          },
        },
      },
    ],
  });

  await startQuestStartTimer({
    userId: properties.userId,
    resourceId: activatedResult.toolInstance.id,
    habiticaUserId: activatedResult.habiticaUser.habitica_user_id,
  });
};
