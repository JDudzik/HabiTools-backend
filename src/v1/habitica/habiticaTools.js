import { getLoggedInUser } from 'internal/userController/userHelpers';
import {
  activateToolInstance,
  modifyToolInstanceData,
  startQuestStartTimer,
  getLinkedHabiticaUser,
} from 'internal/habitica';
import { sanitizeProperties, isUUID, isInt, returnOrSendResponse } from 'utils';


// -- POST --
// {API_URL}/v1/auth/habitica/tools/auto-accept-quests
// Creates a new Auto Accept Quests Tool Instance.
export const activateAutoAcceptQuests = async (req, res) => {
  const userId = await getLoggedInUser(req, [ 'id' ]);

  const activatedResult = await activateToolInstance({
    req,
    userId,
    toolSlug: 'auto-accept-quests',
    toolName: 'Auto Accept Quests',
    webhooks: [{
      taskName: 'auto-accept-quests-webhook',
      externalWebhookBody: {
        type: 'questActivity',
        options: { questInvited: true },
      },
    }],
    crons: [{
      taskName: 'auto-accept-quests-cron',
      immediateOnce: true,
    }],
  });
  if (activatedResult?.code) {
    res.status(activatedResult.code).json(activatedResult.responseContent);
    return;
  }

  res.status(201).json(activatedResult);
};


// -- POST --
// {API_URL}/v1/auth/habitica/tools/auto-start-quests
// Creates a new Auto Start Quests Tool Instance.
// -- BODY --
// wait_hours: The number of hours to wait.
export const activateAutoStartQuests = async (req, res) => {
  const sanitizedPayload = sanitizeProperties(req.body, {
    requiredKeys: [ 'wait_hours' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isInt('wait_hours', { min: 0, max: 24 }, 'wait_hours must be an integer between 0 and 24'),
    ],
  });
  if (!sanitizedPayload.valid) { return returnOrSendResponse(sanitizedPayload.error.code, sanitizedPayload.error.responseContent, req, res); }
  const sanitizedProperties = sanitizedPayload.properties;

  const userId = await getLoggedInUser(req, [ 'id' ]);
  const activatedResult = await activateToolInstance({
    req,
    userId,
    toolSlug: 'auto-start-quests',
    toolName: 'Auto Start Quests',
    toolData: { waitHours: sanitizedProperties.wait_hours ?? 24 },
    webhooks: [{
      taskName: 'auto-start-quests-start-timer',
      externalWebhookBody: {
        type: 'questActivity',
        options: {
          questInvited: true,
          questStarted: true,
        },
      },
    }],
  });
  if (activatedResult?.code) {
    res.status(activatedResult.code).json(activatedResult.responseContent);
    return;
  }

  await startQuestStartTimer({
    userId,
    resourceId: activatedResult.toolInstance.id,
    habiticaUserId: activatedResult.habiticaUser.habitica_user_id,
  });

  res.status(201).json(activatedResult);
};


// -- PUT --
// {API_URL}/v1/auth/habitica/tools/auto-start-quests/edit
// Modifies an existing Auto Start Quests Tool Instance.
// -- BODY --
// resource_id: Required resource ID for the target tool instance.
// wait_hours: Replacement for the tool wait-hours value.
export const modifyAutoStartQuestsTool = async (req, res) => {
  const sanitizedPayload = sanitizeProperties(req.body, {
    requiredKeys: [ 'resource_id', 'wait_hours' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isUUID('resource_id', 'resource_id must be a valid UUID'),
      isInt('wait_hours', { min: 0, max: 24 }, 'wait_hours must be an integer between 0 and 24'),
    ],
  });
  if (!sanitizedPayload.valid) { return returnOrSendResponse(sanitizedPayload.error.code, sanitizedPayload.error.responseContent, req, res); }
  const sanitizedProperties = sanitizedPayload.properties;

  const userId = await getLoggedInUser(req, [ 'id' ]);
  const result = await modifyToolInstanceData({
    userId,
    resourceId: sanitizedProperties.resource_id,
    toolData: { waitHours: sanitizedProperties.wait_hours },
    eventMessage: {
      messageText: `The Auto Start Quests tool has been updated with a new wait time of ${ sanitizedProperties.wait_hours } hours.`,
      shortMessage: 'Auto Start Quests tool was updated.',
    },
  });
  if (result?.code) { return returnOrSendResponse(result.code, result.responseContent, req, res); }

  // Run an initial check to start the timer if there is already an active quest when the tool is activated.
  const habiticaUser = await getLinkedHabiticaUser({ userId });
  if (habiticaUser?.code) { return returnOrSendResponse(habiticaUser.code, habiticaUser.responseContent, req, res); }
  await startQuestStartTimer({
    userId,
    resourceId: sanitizedProperties.resource_id,
    habiticaUserId: habiticaUser.habitica_user_id,
  });

  res.json({ success: true, result });
};
