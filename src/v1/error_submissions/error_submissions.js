import Error from 'knex/models/Error';
import { restrictProperties, getLoggedInUser, allowValidUUID } from 'utils';
import { allowByPermissions } from 'internal/userController';
import deepTrim from 'deep-trim';


const error_submissions = {

  // Submit
  //
  // -- POST --
  // {API_URL}/v1/error-submissions/submit
  // -- PARAMS --
  // source, message, deleted_at
  submit: async (req, res) => {
    const body = restrictProperties(
      deepTrim(req.body),
      [ 'id', 'created_at', 'is_api_error', 'user_id' ],
    );
    body.created_at = Date.now();
    body.is_api_error = false;
    body.user_id = await getLoggedInUser(req, [ 'id' ]);
    body.message = body?.message?.substring(0, 8192);
    body.message_json = body?.message_json && JSON.stringify(body.message_json).substring(0, 8192);

    await Error.query()
      .insert(body)

      .then(error => res.send(error))
      .catch((err) => { throw [ err, 'error_submissions.submit' ]; });
  },


  // Get Errors
  //
  // -- GET --
  // {API_URL}/v1/auth/error-submissions/errors/:page
  // -- PARAMS --
  // page: the page number to load
  allErrors: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'access_error_logs');
    if (!allowed) { return; }

    const page = req.params.page || 1;
    const pageSize = 50;

    const offset = pageSize * (page - 1);
    const limit = pageSize;

    await Error.query()
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .select([ 'id', 'created_at', 'source', 'message', 'is_api_error' ])
      .limit(limit)
      .offset(offset)

      .then(message => res.send(message))
      .catch((err) => { throw [ err, 'error_submissions.allErrors' ]; });
  },


  // Single Error
  //
  // -- POST --
  // {API_URL}/v1/auth/error-submissions/single-error/:id
  // -- PARAMS --
  // id: the ID of the error to retrieve
  // -- ERROR CODES --
  // INADEQUATE_PERMISSION, INVALID_ID
  singleError: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'access_error_logs');
    if (!allowed) { return; }

    if (!allowValidUUID(req.params.id, req, res)) { return; }

    await Error.query()
      .where('id', '=', req.params.id)
      .withGraphFetched('user')
      .modifyGraph('user', (builder) => {
        builder.select([ 'id', 'first_name', 'last_name', 'email' ]);
      })

      .then(message => res.send(message[0]))
      .catch((err) => { throw [ err, 'error_submissions.singleError' ]; });
  },

};

module.exports = error_submissions;
