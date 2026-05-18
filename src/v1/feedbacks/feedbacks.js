import Feedback from 'knex/models/Feedback';
import {
  sanitizeProperties,
  feedbackEmail,
  returnOrSendResponse,
  allowValidUUID,
} from 'utils';
import { getLoggedInUser } from 'internal/userController/userHelpers';
import { allowByPermissions } from 'internal/userController';
import { presence, isLength, isEmail, optional } from 'property-validator';


const feedbacks = {

  // Submit
  //
  // -- POST --
  // {API_URL}/v1/feedbacks/submit
  // -- PARAMS --
  // Most fields in the feedback model
  submit: async (req, res) => {
    const sanitizedProperties = sanitizeProperties(req.body, {
      requiredKeys: [ 'topic', 'message', 'email' ],
      optionalKeys: [ 'source' ],
      trimPayload: true,
      removeDisallowedKeys: true,
      parseInts: true,
      parseBools: true,
      propertyValidations: [
        presence('topic', 'The topic is required'),
        presence('message', 'The message is required'),
        isLength('message', { min: 1, max: 10000 }, 'The :paramName should be between :min and :max characters'),
        presence('email', 'The email is required'),
        isEmail('email', 'The email is invalid'),
        optional(isLength('source', { min: 1, max: 10000 }, 'The :paramName should be between :min and :max characters')),
      ],
    }, req, res);
    if (!sanitizedProperties.valid) { return; }

    const body = sanitizedProperties.properties;
    body.created_at = Date.now();
    body.user_id = await getLoggedInUser(req, [ 'id' ]);

    if (body?.message?.length > 5000) {
      return returnOrSendResponse(413, {
        status: 'TOO_MANY_CHARACTERS',
        message: 'The message cannot be more than 5,000 characters',
      }, req, res);
    }

    await Feedback.query()
      .insert(body)

      .then((feedback) => {
        res.send(feedback);
        feedbackEmail(body.topic, body.email, body.message, body.source);
      })
      .catch((err) => { throw [ err, 'feedbacks.submit' ]; });
  },


  // Get feedbacks
  //
  // -- GET --
  // {API_URL}/v1/auth/feedbacks/feedbacks/:page
  // -- PARAMS --
  // page: the page number to load
  allFeedbacks: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'access_feedback');
    if (!allowed) { return; }

    const page = req.params.page || 1;
    const pageSize = 50;

    const offset = pageSize * (page - 1);
    const limit = pageSize;

    await Feedback.query()
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .select([ 'id', 'created_at', 'topic', 'email', 'message', 'source' ])
      .limit(limit)
      .offset(offset)

      .then(message => res.send(message))
      .catch((err) => { throw [ err, 'feedbacks.allFeedbacks' ]; });
  },


  // Single Feedback
  //
  // -- POST --
  // {API_URL}/v1/auth/feedbacks/single-feedback/:id
  // -- PARAMS --
  // id: the ID of the feedback to retrieve
  // -- ERROR CODES --
  // INVALID_ID
  singleFeedback: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'access_feedback');
    if (!allowed) { return; }

    if (!allowValidUUID(req.params.id, req, res)) { return; }

    await Feedback.query()
      .where('id', '=', req.params.id)
      .withGraphFetched('user')
      .modifyGraph('user', (builder) => {
        builder.select([ 'id', 'first_name', 'last_name', 'email' ]);
      })

      .then(message => res.send(message[0]))
      .catch((err) => { throw [ err, 'feedbacks.singleFeedback' ]; });
  },
};

module.exports = feedbacks;
