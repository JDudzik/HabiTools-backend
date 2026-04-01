import Analytic from 'knex/models/Analytic';
import { restrictProperties, getLoggedInUser, allowValidUUID } from 'utils';
import { allowByPermissions } from 'internal/userController';

const analytics = {

  // Submit
  //
  // -- POST --
  // {API_URL}/v1/analytics/submit
  // -- PARAMS --
  // Most fields in the Analytic model
  submit: async (req, res) => {
    const body = restrictProperties(req.body, [ 'id', 'created_at', 'user_id' ]);
    body.created_at = Date.now();
    body.user_id = await getLoggedInUser(req, [ 'id' ]);

    await Analytic.query()
      .insert(body)

      .then(analytic => res.send(analytic))
      .catch((err) => { throw [ err, 'analytics.submit' ]; });
  },


  // Get logs
  //
  // -- GET --
  // {API_URL}/v1/auth/analytics/logs/:page
  // -- PARAMS --
  // page: The page of logs to display
  // hide_api: Optional query parameter to hide API hit logs
  allLogs: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'access_analytic_logs');
    if (!allowed) { return; }
  
    const page = req.params.page || 1;
    const pageSize = 50;
  
    const offset = pageSize * (page - 1);
    const limit = pageSize;
  
    const query = Analytic.query()
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .select([ 'id', 'created_at', 'action_name', 'action_value', 'source' ])
      .limit(limit)
      .offset(offset);
  
    // Add clause to hide rows with `action_name` as `api_hit` if `hide_api` is true
    if (req.query.hide_api === 'true') {
      query.whereNot('action_name', '=', 'api_hit');
    }
  
    await query
      .then(message => res.send(message))
      .catch((err) => { throw [ err, 'analytics.allLogs' ]; });
  },


  // Single Log
  //
  // -- POST --
  // {API_URL}/v1/auth/analytics/single-log/:id
  // -- PARAMS --
  // id: the ID of the log to retrieve
  singleLog: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'access_analytic_logs');
    if (!allowed) { return; }

    if (!allowValidUUID(req?.params?.id, req, res)) { return; }

    await Analytic.query()
      .where('id', '=', req.params.id)
      .withGraphFetched('user')
      .modifyGraph('user', (builder) => {
        builder.select([ 'id', 'first_name', 'last_name', 'email' ]);
      })

      .then(message => res.send(message[0]))
      .catch((err) => { throw [ err, 'analytics.singleLog' ]; });
  },

};

module.exports = analytics;
