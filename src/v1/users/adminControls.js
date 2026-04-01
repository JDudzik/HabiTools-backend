import User from 'knex/models/User';
// import User_Password from 'knex/models/User_Password';
import {
  restrictProperties,
  allowValidUUID,
} from 'utils';
import {
  allowByPermissions,
  searchUsers,
  createUser,
  deleteUser,
} from 'internal/userController';
import deepTrim from 'deep-trim';
import stripeLib from 'stripe';

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new stripeLib(process.env.STRIPE_SECRET_KEY);
}


const adminControls = {

  // Create User
  //
  // -- POST --
  // {API_URL}/v1/auth/users/admin/create_user
  // -- PARAMS --
  // password: String,
  // Most fields from User table
  // -- REQUIRED --
  // first_name, last_name, email, password
  // -- ERROR CODES --
  // (see "createUser" helper), INADEQUATE_PERMISSION
  createUser: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'super_admin_create_user');
    if (!allowed) { return; }

    const created = await createUser(deepTrim(req.body), true, req, res);
    if (!created) { return; }

    await User.query()
      .where('id', created.id)
      .patch({ has_verified_email: true });

    res.send(created);
  },


  // Search Users
  //
  // -- GET --
  // {API_URL}/v1/auth/users/admin/search_users
  // -- PARAMS --
  // id:              ID of a User,
  // first_name:      String,
  // last_name:       String,
  // email:           String,
  // minimal_results: Only select minimal data for each returned user,
  // allow_disabled:   Also display users that have been disabled,
  // enabled_permissions:  Array of permissions to verify users DO have,
  // disabled_permissions: Array of permissions to verify users do NOT have,
  // -- ERROR CODES --
  // INVALID_ID, INADEQUATE_PERMISSION
  searchUsers: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'user_retrieval');
    if (!allowed) { return; }

    const userList = await searchUsers(deepTrim(req.query), req, res);
    return res.send(userList);
  },


  // Delete User
  //
  // -- DELETE --
  // {API_URL}/v1/auth/users/admin/delete_user/:ID
  // ID: The ID of a User
  // -- ERROR CODES --
  // NO_USER_ID, INVALID_ID, INADEQUATE_PERMISSION
  deleteUser: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'user_composition');
    if (!allowed) { return; }

    if (!allowValidUUID(req.params.id, req, res)) { return; }
    
    return deleteUser(req.params.id, req, res);
  },


  // Disable User
  //
  // -- DELETE --
  // {API_URL}/v1/auth/users/admin/disable_user/:ID
  // ID: The ID of a User
  // -- ERROR CODES --
  // NO_USER_ID, INVALID_ID
  disableUser: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'user_composition');
    if (!allowed) { return; }

    if (!allowValidUUID(req.params.id, req, res)) { return; }

    await User.query()
      .patchAndFetchById(req.params.id, { disabled_at: Date.now() })

      .then((result) => {
        if (!result) {
          // If "result" is undefined, it means the provided ID doesn't exist in the table
          res.status(400);
          res.json({
            status: 'NO_USER_ID',
            message: 'No User with the provided ID exists',
          });
          return;
        }
        res.send(result);
      })
      .catch((err) => { throw [ err, 'users.disableUser' ]; });
  },


  // Undisable User
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/admin/undisable_user/:ID
  // ID: The ID of a User
  // -- ERROR CODES --
  // NO_USER_ID, INVALID_ID, INADEQUATE_PERMISSION
  undisableUser: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'user_composition');
    if (!allowed) { return; }

    if (!allowValidUUID(req.params.id, req, res)) { return; }

    await User.query()
      .patchAndFetchById(req.params.id, { disabled_at: null })

      .then((result) => {
        if (!result) {
          // If "result" is undefined, it means the provided ID doesn't exist in the table
          res.status(400);
          res.json({
            status: 'NO_USER_ID',
            message: 'No User with the provided ID exists',
          });
          return;
        }
        res.send(result);
      })
      .catch((err) => { throw [ err, 'users.undisableUser' ]; });
  },


  // Require Password Reset
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/admin/require_password_reset/:ID
  // ID: The ID the target user
  // -- ERROR CODES --
  // NO_USER_ID, INVALID_ID, INADEQUATE_PERMISSION
  passwordReset: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'user_composition');
    if (!allowed) { return; }

    if (!allowValidUUID(req.params.id, req, res)) { return; }

    await User.query()
      .where('id', req.params.id)
      .withGraphFetched('password')
      .modifyGraph('password', (builder) => {
        builder.patch({ requires_reset: true });
      })
      .first()

      .then((result) => {
        if (!result) {
          res.status(400);
          res.json({
            status: 'NO_USER_ID',
            message: 'No User with the provided ID exists',
          });
          return;
        }
        res.send(result);
      })
      .catch((err) => { throw [ err, 'users.passwordReset' ]; });
  },


  // Update User
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/admin/update_user/:ID
  // ID: The ID of a User
  // -- PARAMS --
  // first_name, last_name
  // -- ERROR CODES --
  // INCORRECT_UPDATE_DATA, NO_USER_ID, EMAIL_ALREADY_EXISTS, INVALID_ID, INADEQUATE_PERMISSION
  updateUser: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'user_composition');
    if (!allowed) { return; }

    if (!allowValidUUID(req.params.id, req, res)) { return; }

    const filteredProperties = restrictProperties(deepTrim(req.body), [ 'id', 'created_at', 'deleted_at', 'has_verified_email' ]);
    if (Object.keys(filteredProperties).length < 1) {
      res.status(400);
      res.json({
        status: 'INCORRECT_UPDATE_DATA',
        message: 'Request does not contain correct data to update',
      });
      return;
    }

    const properties = {
      first_name: filteredProperties.first_name,
      last_name:  filteredProperties.last_name,
    };

    await User.query()
      .patchAndFetchById(req.params.id, properties)

      .then((result) => {
        if (!result) {
          // If "result" is undefined, it means the provided ID doesn't exist in the table
          res.status(400);
          res.json({
            status: 'NO_USER_ID',
            message: 'No User with the provided ID exists',
          });
          return;
        }
        res.send(result);

        if (stripe && result.stripe_customer_id) {
          stripe.customers.update(
            result.stripe_customer_id,
            {
              name: `${ filteredProperties.first_name } ${ filteredProperties.last_name }`,
              email: filteredProperties.email,
            },
          );
        }
      })
      .catch((err) => {
        if (err.errno === 19) {
          // errno 19 is when an email already exists within the database
          res.status(409);
          res.json({
            status: 'EMAIL_ALREADY_EXISTS',
            message: 'Email address already exists',
          });
          return;
        }
        throw [ err, 'users.updateUser' ];
      });
  },
};



module.exports = adminControls;
