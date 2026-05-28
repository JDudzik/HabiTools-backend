import { sanitizeProperties, isUUID, isInt, returnOrSendResponse } from 'utils';
import { modifyToolInstanceData } from 'internal/habitica/methods/modifyToolInstanceData';
import { startQuestStartTimer } from '../core/startQuestStartTimer';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';


/**
 * Modifies data for an Auto Start Quests tool instance and any related cron/webhook records.
 * @param {Object} properties - The properties for modifying tool data.
 * @param {string} properties.userId - The user ID of the owner.
 * @param {string} properties.resourceId - The tool instance resource ID.
 * @param {number} properties.waitHours - New quest start wait window in hours.
 * @returns {Promise<Object>} - A success result with update counts or an error response.
 */
export const modifyAutoStartQuestsToolData = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'userId', 'resourceId', 'waitHours' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isUUID('userId', 'userId must be a valid UUID'),
      isUUID('resourceId', 'resourceId must be a valid UUID'),
      isInt('waitHours', { min: 0, max: 24 }, 'waitHours must be an integer between 0 and 24'),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  const habiticaUser = await getLinkedHabiticaUser({ userId: sanitizedProperties.userId });
  if (habiticaUser?.code) { return returnOrSendResponse(habiticaUser.code, habiticaUser.responseContent); }

  await modifyToolInstanceData({
    userId: sanitizedProperties.userId,
    resourceId: sanitizedProperties.resourceId,
    toolData: { waitHours: sanitizedProperties.waitHours },
  });

  // Run an initial check to start the timer if there is already an active quest when the tool is activated.
  return await startQuestStartTimer({
    userId: sanitizedProperties.userId,
    resourceId: sanitizedProperties.resourceId,
    habiticaUserId: habiticaUser.habitica_user_id,
  });
};