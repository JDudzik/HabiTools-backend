import { activateToolInstance } from 'internal/habitica/methods/activateToolInstance';


const TOOL_SLUG = 'auto-accept-quests';

/**
 * Creates a new Auto Accept Quests tool instance for a user, including setting up the necessary webhooks and crons.
 * @param {Object} properties - The properties for creating the tool instance.
 * @param {string} properties.userId - The user ID of the owner of the tool instance.
 * @param {Object} [properties.req] - The Express request object, used for analytics. Optional if not creating through an API route.
 * @returns {Promise<Object>} - A success message with the new tool instance details, or an error response if the tool instance cannot be created.
 */
export const activateAutoAcceptQuestsTool = (properties) => {
  return activateToolInstance({
    req: properties.req,
    userId: properties.userId,
    toolSlug: TOOL_SLUG,
    toolName: 'Auto Accept Quests',
    webhooks: [
      {
        taskName: 'auto-accept-quests-webhook',
        externalWebhookBody: {
          type: 'questActivity',
          options: { questInvited: true },
        },
      },
    ],
    crons: [
      {
        taskName: 'auto-accept-quests-cron',
        immediateOnce: true,
      },
    ],
  });
};
