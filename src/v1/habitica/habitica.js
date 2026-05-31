import { getLoggedInUser } from 'internal/userController/userHelpers';
import {
  linkHabiticaUser,
  unlinkHabiticaUser,
  getLinkedHabiticaUser,
  getHabiticaContent,
  sendGlobalHabiticaNotification,
  refreshToolInstance,
  teardownToolResources,
  activateToolInstance,
  modifyToolInstanceData,
  startQuestStartTimer,
} from 'internal/habitica';
import { sanitizeProperties, isUUID, isInt, returnOrSendResponse } from 'utils';
import { allowByPermissions } from 'internal/userController';


// -- GET --
// {API_URL}/v1/auth/habitica
// Returns the linked Habitica account for the logged-in user.
export const getHabitica = async (req, res) => {
  const userId = await getLoggedInUser(req, [ 'id' ]);
  const result = await getLinkedHabiticaUser({ userId });
  if (result?.code) {
    res.status(result.code).json(result.responseContent);
    return;
  }
  if (!result) {
    res.status(404).json({ status: 'NOT_LINKED', message: 'No linked Habitica account found.' });
    return;
  }
  res.json({ habiticaUser: result });
};


// -- POST --
// {API_URL}/v1/auth/habitica/content
// -- BODY --
// dataItems: Object map of requested content blocks.
//   Standard blocks use true (example: { quests: true, mystery: true }).
//   Special blocks (gear, pets, mounts) use true or a callback query builder.
// language (optional): language code (defaults to 'en').
export const getHabiticaContentData = async (req, res) => {
  const allowed = await allowByPermissions(req, res, 'data_manipulation');
  if (!allowed) { return; }

  const result = await getHabiticaContent({
    dataItems: {
      gear: qb => qb.select('id', 'key', 'type', 'text').where('key', 'like', 'weapon%'),
    },
    language: 'en',
  });

  if (result?.code) {
    res.status(result.code).json(result.responseContent);
    return;
  }

  res.json(result);
};


// -- POST --
// {API_URL}/v1/auth/habitica/link
// -- BODY --
// habitica_user_id: The Habitica user UUID.
// api_key: The Habitica API key.
export const link = async (req, res) => {
  const userId = await getLoggedInUser(req, [ 'id' ]);
  const { habitica_user_id, api_key } = req.body;

  if (!habitica_user_id || !api_key) {
    res.status(400).json({ status: 'MISSING_FIELDS', message: 'habitica_user_id and api_key are required.' });
    return;
  }

  const result = await linkHabiticaUser({ req, userId, habiticaUserId: habitica_user_id, apiKey: api_key });
  if (result?.code) {
    res.status(result.code).json(result.responseContent);
    return;
  }
  res.status(201).json({ habiticaUser: result.habiticaUser });
};


// -- DELETE --
// {API_URL}/v1/auth/habitica/unlink
export const unlink = async (req, res) => {
  const userId = await getLoggedInUser(req, [ 'id' ]);
  const result = await unlinkHabiticaUser({ req, userId });
  if (result?.code) {
    res.status(result.code).json(result.responseContent);
    return;
  }
  res.json({ success: true });
};


// -- POST --
// {API_URL}/v1/auth/habitica/tools/auto-accept-quests
// Creates a new Auto Accept Quests Tool Instance.
export const activateAutoAcceptQuests = async (req, res) => {
  const userId = await getLoggedInUser(req, [ 'id' ]);

  const activatedResult = activateToolInstance({
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
    toolSlug: 'auto_start_quests',
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


// -- POST --
// {API_URL}/v1/auth/habitica/tools/party-pulse
// Creates a new Party Pulse Tool Instance.
// -- BODY --
// scoreDisplayDirection: A string defining the direction to display party member scores. Can be 'ascending' or 'descending'. Defaults to 'ascending'.
// export const activatePartyPulse = async (req, res) => {
//   const userId = await getLoggedInUser(req, [ 'id' ]);

//   return activateToolInstance({
//     req,
//     userId,
//     toolSlug: 'party_pulse',
//     toolName: 'Party Pulse',
//     toolData: {
//       lastPulseAt: null,
//       scoreDisplayDirection: 'ascending',
//       members: {},
//     },
//     crons: [{
//       taskName: 'party_pulse-cron',
//       immediateOnce: true,
//     }],
//     onSuccess: ({ toolInstance, crons }) => ({
//       success: true,
//       toolInstance,
//       cron: crons?.[0],
//     }),
//   });
//   // if (activatedResult?.code) {
//   //   res.status(activatedResult.code).json(activatedResult.responseContent);
//   //   return;
//   // }

//   // res.status(201).json(activatedResult);
// };

  
// -- PUT --
// {API_URL}/v1/auth/habitica/tools/refresh
// Extends the Tool Lease. Only valid for a non-expired instance.
export const refreshTool = async (req, res) => {
  const userId = await getLoggedInUser(req, [ 'id' ]);
  const { resource_id } = req.body;

  if (!resource_id) {
    res.status(400).json({ status: 'MISSING_FIELDS', message: 'resource_id is required.' });
    return;
  }

  const result = await refreshToolInstance({ userId, resourceId: resource_id });
  if (result.code) { return res.status(result.code).send(result.responseContent); }

  res.json(result);
};


// -- DELETE --
// {API_URL}/v1/auth/habitica/tools/teardown
// Deactivates and fully removes the tool Instance.
export const teardownTool = async (req, res) => {
  const userId = await getLoggedInUser(req, [ 'id' ]);
  const { resource_id, notification } = req.body;

  if (!resource_id) {
    res.status(400).json({ status: 'MISSING_FIELDS', message: 'resource_id is required.' });
    return;
  }

  const result = await teardownToolResources({
    userId,
    resourceId: resource_id,
    notification,
  });

  if (result?.code) {
    res.status(result.code).json(result.responseContent);
    return;
  }

  res.json({ success: true });
};


// -- POST --
// {API_URL}/v1/auth/habitica/global-notification
// -- BODY --
// messageText: required message body.
// shortMessage, eventName, eventSlug, priority, acknowledged: optional.
export const sendGlobalNotification = async (req, res) => {
  const allowed = await allowByPermissions(req, res, 'global_habitica_notification');
  if (!allowed) { return; }

  const result = await sendGlobalHabiticaNotification({
    ...req.body,
    req,
  });

  if (result?.code) {
    res.status(result.code).json(result.responseContent);
    return;
  }

  res.status(201).json(result);
};

