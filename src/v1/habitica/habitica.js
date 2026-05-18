import { getLoggedInUser } from 'internal/userController/userHelpers';
import {
  linkHabiticaUser,
  unlinkHabiticaUser,
  getLinkedHabiticaUser,
  getHabiticaContent,
  createAutoAcceptQuestsTool,
  refreshToolInstance,
  teardownToolResources,
} from 'internal/habitica';
import { allowByPermissions } from 'internal/userController';


// -- GET --
// {API_URL}/v1/auth/habitica
// Returns the linked Habitica account for the logged-in user.
export const getHabitica = async (req, res) => {
  const user_id = await getLoggedInUser(req, [ 'id' ]);
  const result = await getLinkedHabiticaUser({ userId: user_id });
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
// dataItems: Array of strings of requested top-level Habitica content blocks.
// language (optional): language code (defaults to 'en').
export const getHabiticaContentData = async (req, res) => {
  const allowed = await allowByPermissions(req, res, 'data_manipulation');
  if (!allowed) { return; }

  const result = await getHabiticaContent({
    dataItems: req.body?.dataItems,
    language: req.body?.language,
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
  const user_id = await getLoggedInUser(req, [ 'id' ]);
  const { habitica_user_id, api_key } = req.body;

  if (!habitica_user_id || !api_key) {
    res.status(400).json({ status: 'MISSING_FIELDS', message: 'habitica_user_id and api_key are required.' });
    return;
  }

  const result = await linkHabiticaUser({ user_id, habitica_user_id, api_key });
  if (result?.code) {
    res.status(result.code).json(result.responseContent);
    return;
  }
  res.status(201).json({ habiticaUser: result.habiticaUser });
};


// -- DELETE --
// {API_URL}/v1/auth/habitica/unlink
export const unlink = async (req, res) => {
  const user_id = await getLoggedInUser(req, [ 'id' ]);
  const result = await unlinkHabiticaUser({ user_id });
  if (result?.code) {
    res.status(result.code).json(result.responseContent);
    return;
  }
  res.json({ success: true });
};


// -- POST --
// {API_URL}/v1/auth/habitica/tools/auto-accept-quests
// Creates a new Auto Accept Quests Tool Instance.
export const createAutoAcceptQuests = async (req, res) => {
  const user_id = await getLoggedInUser(req, [ 'id' ]);
  const result = await createAutoAcceptQuestsTool({ user_id });
  if (result?.code) {
    res.status(result.code).json(result.responseContent);
    return;
  }
  res.status(201).json(result);
};


// -- PUT --
// {API_URL}/v1/auth/habitica/tools/refresh
// Extends the Tool Lease. Only valid for a non-expired instance.
export const refreshTool = async (req, res) => {
  const user_id = await getLoggedInUser(req, [ 'id' ]);
  const { resource_id } = req.body;

  if (!resource_id) {
    res.status(400).json({ status: 'MISSING_FIELDS', message: 'resource_id is required.' });
    return;
  }

  const result = await refreshToolInstance({ userId: user_id, resourceId: resource_id });
  if (result.code) { return res.status(result.code).send(result.responseContent); }

  res.json(result);
};


// -- DELETE --
// {API_URL}/v1/auth/habitica/tools/teardown
// Deactivates and fully removes the tool Instance.
export const teardownTool = async (req, res) => {
  const user_id = await getLoggedInUser(req, [ 'id' ]);
  const { resource_id, notification } = req.body;

  if (!resource_id) {
    res.status(400).json({ status: 'MISSING_FIELDS', message: 'resource_id is required.' });
    return;
  }

  const result = await teardownToolResources({
    userId: user_id,
    resourceId: resource_id,
    notification,
  });

  if (result?.code) {
    res.status(result.code).json(result.responseContent);
    return;
  }

  res.json({ success: true });
};

