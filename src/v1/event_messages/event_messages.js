import {
  createEventMessage,
  deleteEventMessage,
  acknowledgeEventMessages,
  unacknowledgeEventMessages,
  selectEventMessages,
} from 'internal/eventMessages';
import { getLoggedInUser } from 'internal/userController/userHelpers';
import { allowByPermissions } from 'internal/userController';


// Create
//
// -- POST --
// {API_URL}/v1/event_messages/create
// -- PARAMS --
// userId: ID of the user creating the message (automatically set from the logged-in user).
// messageText: The text of the message.
// priority: Priority level of the message (e.g., low, medium, high).
// resourceId: ID of the resource associated with the message (optional).
// eventSlug: Slug of the event associated with the message (optional).
// eventName: Name of the event associated with the message (optional).
// shortMessage: Short version of the message (optional).
// shouldNotify: Whether to notify the user about this message (default is false).
// acknowledged: Whether the message has been acknowledged by the user (default is false).
// -- ERROR CODES --
// INCORRECT_INSERT_DATA, UNPERMITTED_PROPERTY, MISSING_REQUIRED_PROPERTY, REQUIRES_ONE_OPTIONAL_PROPERTY, INVALID_PROPERTY_VALUE
export const create = async (req, res) => {
  const allowed = await allowByPermissions(req, res, 'data_manipulation');
  if (!allowed) { return; }
  // Validations happen inside the main function.
  const createdMessage = await createEventMessage({
    ...req.body,
    userId: await getLoggedInUser(req, [ 'id' ]),
  });
  if (createdMessage.code) {
    return res.status(createdMessage.code).send(createdMessage.responseContent);
  }

  return res.status(201).send(createdMessage);
};


// List
//
// -- GET --
// {API_URL}/v1/event_messages/list
// -- PARAMS --
// filters:         Filters to apply to the query.
//   message_id:      Filter by message ID (exact match).
//   resource_id:     Filter by resource ID.
//   event_slug:      Filter by event slug.
//   should_notify:   Filter by notification flag.
//   priority:        Filter by priority level.
//   min_priority:    Filter by minimum priority level.
//   max_priority:    Filter by maximum priority level.
//   acknowledged:    Filter by acknowledgment status.
// pagination:     Pagination options.
//   page:            The page number to retrieve (default is 1).
//   page_size:        The number of items per page (default is 10).
// -- ERROR CODES --
// INCORRECT_INSERT_DATA, UNPERMITTED_PROPERTY, MISSING_REQUIRED_PROPERTY, REQUIRES_ONE_OPTIONAL_PROPERTY, INVALID_PROPERTY_VALUE
export const list = async (req, res) => {
  const result = await selectEventMessages({
    ...req.query,
    filters: {
      ...req.query.filters,
      user_id: await getLoggedInUser(req, [ 'id' ]),
    },
  });
  if (result.code) { return res.status(result.code).send(result.responseContent); }

  return res.json(result);
};


// Acknowledge
//
// -- PATCH --
// {API_URL}/v1/event_messages/acknowledge
// -- PARAMS --
// message_ids: Array of message IDs to acknowledge.
// -- ERROR CODES --
// INCORRECT_INSERT_DATA, UNPERMITTED_PROPERTY, MISSING_REQUIRED_PROPERTY, REQUIRES_ONE_OPTIONAL_PROPERTY, INVALID_PROPERTY_VALUE
export const acknowledge = async (req, res) => {
  const result = await acknowledgeEventMessages({
    message_ids: req.body.message_ids,
    user_id: await getLoggedInUser(req, [ 'id' ]),
  });

  if (result.code) { return res.status(result.code).send(result.responseContent); }
  res.send(result);
};


// Unacknowledge
//
// -- PATCH --
// {API_URL}/v1/event_messages/unacknowledge
// -- PARAMS --
// message_ids: Array of message IDs to unacknowledge
// -- ERROR CODES --
// INCORRECT_INSERT_DATA, UNPERMITTED_PROPERTY, MISSING_REQUIRED_PROPERTY, REQUIRES_ONE_OPTIONAL_PROPERTY, INVALID_PROPERTY_VALUE
export const unacknowledge = async (req, res) => {
  const result = await unacknowledgeEventMessages({
    message_ids: req.body.message_ids,
    user_id: await getLoggedInUser(req, [ 'id' ]),
  });

  if (result.code) { return res.status(result.code).send(result.responseContent); }
  res.send(result);
};


// Delete
//
// -- DELETE --
// {API_URL}/v1/event_messages/delete/:id
// -- PARAMS --
// id: The ID of the message to delete
// -- ERROR CODES --
// INCORRECT_INSERT_DATA, UNPERMITTED_PROPERTY, MISSING_REQUIRED_PROPERTY, REQUIRES_ONE_OPTIONAL_PROPERTY, INVALID_PROPERTY_VALUE
export const deleteMessage = async (req, res) => {
  const result = await deleteEventMessage({
    message_id: req.params.message_id,
    user_id: await getLoggedInUser(req, [ 'id' ]),
  });

  if (result.code) { return res.status(result.code).send(result.responseContent); }
  res.send(result);
};