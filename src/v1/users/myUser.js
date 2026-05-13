import User from 'knex/models/User';
import User_Password from 'knex/models/User_Password';
import {
  restrictProperties,
  handleApiAnalytic,
  sha512,
  getLoggedInUser,
  returnOrSendResponse,
  verifyHcaptcha,
  sanitizeProperties,
} from 'utils';
import { createUser, retrieveUser, deleteUser, changeUserEmail } from 'internal/userController';
import { composeEmailConfirmation } from 'internal/emailConfirmations';
import deepTrim from 'deep-trim';
import stripeLib from 'stripe';

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new stripeLib(process.env.STRIPE_SECRET_KEY);
}


const users = {
  // Email Available
  //
  // -- GET --
  // {API_URL}/v1/users/email_available
  // -- PARAMS --
  // email: String
  // -- REQUIRED --
  // email
  // -- ERROR CODES --
  // EMAIL_ALREADY_EXISTS
  emailAvailable: async (req, res) => {
    const user = await retrieveUser({
      email: deepTrim(req.query.email),
      allowDisabled: true,
      eager: {
        user_subscriptions: false,
        permissions: false,
      },
    });

    if (user) {
      res.status(400);
      res.json({
        status: 'EMAIL_ALREADY_EXISTS',
        message: 'Email address already exists',
      });
      return;
    } 
    res.send('Email is available');
    return;
    
  },


  // Re-send Verify Email
  //
  // -- POST --
  // {API_URL}/v1/users/resend_verify_email
  // -- ERROR CODES --
  // INVALID_PROPERTIES, NO_USER_WITH_EMAIL, ALREADY_VERIFIED_EMAIL, USER_IS_DELETED
  resendVerifyEmail: async (req, res) => {
    const user = await retrieveUser({
      email: deepTrim(req.body.email),
      select: [ 'id', 'email', 'first_name', 'has_verified_email', 'disabled_at' ],
      eager: {
        user_subscriptions: false,
        permissions: false,
      },
    });

    if (!user) {
      res.status(400);
      res.send({ status: 'NO_USER_WITH_EMAIL', message: 'This user does not exist' });
      return;
    }
    if (user.has_verified_email) {
      res.status(410);
      res.send({ status: 'ALREADY_VERIFIED_EMAIL', message: 'This user has already verified their email address' });
      return;
    }
    if (user.disabled_at) {
      res.status(410);
      res.send({ 'status': 'USER_IS_DISABLED', 'message': 'This user\'s account has been disabled' });
      return;
    }

    const sanitizedUser = sanitizeProperties(user, {
      requiredKeys: [ 'id', 'email', 'first_name' ],
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedUser.valid) { return sanitizedUser.error; }
    const userData = sanitizedUser.properties;

    const composedConfirmation = await composeEmailConfirmation({
      type: 'verify-email',
      metadata: { email: userData.email },
      templateData: {
        to: [{
          name: userData.first_name,
          email: userData.email,
        }],
        params: {
          'NAME': userData.first_name,
        },
      },
    });

    if (composedConfirmation?.code) {
      return returnOrSendResponse(composedConfirmation.code, composedConfirmation.responseContent, req, res);
    }

    res.send({ status: 'VERIFICATION_EMAIL_SENT', email: userData.email });
  },


  // Sign-up
  //
  // -- POST --
  // {API_URL}/v1/users/sign_up
  // -- PARAMS --
  // password: String,
  // Most fields from User table
  // -- REQUIRED --
  // first_name, last_name, email, password
  // -- ERROR CODES --
  // (see "createUser" helper)
  userSignUp: async (req, res) => {
    const hcaptcha = await verifyHcaptcha(req.body?.hcaptchaToken);
    if (!hcaptcha) {
      return returnOrSendResponse(400, {
        status: 'HCAPTCHA_VERIFICATION_FAILED',
        message: 'hCaptcha verification failed',
      }, req, res);
    }

    const filteredProperties = restrictProperties(
      deepTrim(req.body),
      [ 'hcaptchaToken' ],
    );

    const created = await createUser(filteredProperties, false, req, res);
    if (!created) { return; }

    const composedConfirmation = await composeEmailConfirmation({
      type: 'verify-email',
      metadata: { email: created.email },
      templateData: {
        to: [{
          name: req.body.first_name,
          email: req.body.email,
        }],
        params: {
          'NAME': req.body.first_name,
        },
      },
    });

    if (composedConfirmation?.code) {
      return returnOrSendResponse(composedConfirmation.code, composedConfirmation.responseContent, req, res);
    }

    res.send({ status: 'VERIFICATION_EMAIL_SENT', email: created.email });
  },


  // Reset Password
  //
  // -- POST --
  // {API_URL}/v1/users/reset_password
  // -- PARAMS --
  // email: The user's email
  // -- ERROR CODES --
  // INVALID_EMAIL
  resetPassword: async (req, res) => {
    const email = deepTrim(req.body.email) || false;

    const user = await retrieveUser({
      email,
      select: [ 'id', 'first_name', 'email' ],
      eager: {
        user_subscriptions: false,
        permissions: false,
      },
    });

    if (!email || !user) {
      handleApiAnalytic(req, 'reset_password_bad_email', `${ email }`);
      res.send({ status: 'The password reset was sent if that email is in our system.' });
      return;
    }

    const hcaptcha = await verifyHcaptcha(req.body?.hcaptchaToken);
    if (!hcaptcha) {
      return returnOrSendResponse(400, {
        status: 'HCAPTCHA_VERIFICATION_FAILED',
        message: 'hCaptcha verification failed',
      }, req, res);
    }
    
    const composedConfirmation = await composeEmailConfirmation({
      type: 'reset-password',
      user_id: user.id,
      templateData: {
        to: [{
          name: user.first_name,
          email: user.email,
        }],
        params: {
          'NAME': user.first_name,
        },
      },
    });

    if (composedConfirmation?.code) {
      return returnOrSendResponse(composedConfirmation.code, composedConfirmation.responseContent, req, res);
    }

    res.send({ status: 'The password reset was sent if that email is in our system.' });
  },


  // Get My User
  //
  // -- GET --
  // {API_URL}/v1/auth/users/my_user
  getMyUser: async (req, res) => {
    const userId = await getLoggedInUser(req, [ 'id' ]);

    const user = await retrieveUser({
      id: userId,
      eager: {
        'habitica_user.[habitica_user_data, habitica_tools]': true,
      },
      // eagerSelects: [],
    });

    return res.send(user);
  },


  // Update Password
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/update_password
  // -- PARAMS --
  // old_password: The password being replaced
  // new_password: new password to add to the DB
  // -- ERROR CODES --
  // INCORRECT_UPDATE_DATA, PASSWORDS_CANNOT_MATCH, INCORRECT_PASSWORD
  updateMyPassword: async (req, res) => {
    const userId = await getLoggedInUser(req, [ 'id' ]);
    const options = {
      oldPassword: sha512(deepTrim(req.body.old_password) || ''),
      newPassword: sha512(deepTrim(req.body.new_password) || ''),
    };

    if (!options.oldPassword || !options.newPassword) {
      res.status(400);
      res.json({
        status: 'INCORRECT_UPDATE_DATA',
        message: 'Request does not contain correct data to update',
      });
      return;
    }

    if (options.oldPassword === options.newPassword) {
      // Compare provided new and old password instead of comparing directly to DB.
      // It could be dangerous to tell a client that the new password matches the stored password.
      res.status(409);
      res.json({
        status: 'PASSWORDS_CANNOT_MATCH',
        message: 'New password cannot be the same as the current password',
      });
      return;
    }
    const currentPassword = await User_Password.query()
      .select([ 'password_hash' ])
      .where('id', userId);

    const currentHash = currentPassword[0].password_hash;

    if (currentHash !== options.oldPassword) {
      res.status(401);
      res.json({
        status: 'INCORRECT_PASSWORD',
        message: 'Incorrect password',
      });
      return;
    }

    await User_Password.query()
      .where('id', userId)
      .andWhere('password_hash', options.oldPassword)
      .patch({ password_hash: options.newPassword })

      .then((patched) => {
        if (patched >= 1) {
          res.send('Password Changed');
          return;
        }
        throw [ new Error('No matching passwords were changed'), 'users.updatePassword.noReplacements' ];
      })
      .catch((err) => { throw [ err, 'users.updatePassword.catch' ]; });
  },

  // Update Email
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/update_my_email
  // -- PARAMS --
  // new_email: The new email to update to
  // password: The user's current password, used for verification
  // -- ERROR CODES --
  // INCORRECT_UPDATE_DATA, INCORRECT_PASSWORD, EMAIL_ALREADY_EXISTS
  updateMyEmail: async (req, res) => {
    const sanitizedUser = sanitizeProperties(req.body, {
      requiredKeys: [ 'new_email', 'password' ],
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedUser.valid) { return sanitizedUser.error; }
    const userData = sanitizedUser.properties;

    const { new_email, password } = userData;
    if (!new_email || !password) {
      res.status(400);
      res.json({
        status: 'INCORRECT_UPDATE_DATA',
        message: 'Request does not contain correct data to update',
      });
      return;
    }

    const userId = await getLoggedInUser(req, [ 'id' ]);
    return await changeUserEmail({ userId, newEmail: new_email, password }, req, res);
  },

  // Update My User
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/update_my_user
  // -- PARAMS --
  // first_name, last_name
  // -- ERROR CODES --
  // INCORRECT_UPDATE_DATA, NO_USER_ID, EMAIL_ALREADY_EXISTS
  updateMyUser: async (req, res) => {
    const userId = await getLoggedInUser(req, [ 'id' ]);

    const filteredProperties = restrictProperties(
      deepTrim(req.body),
      [ 'id', 'created_at', 'deleted_at', 'has_verified_email' ],
    );
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
      .patchAndFetchById(userId, properties)

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
        throw [ err, 'users.updateMyUser' ];
      });
  },

  // Delete My User
  //
  // -- DELETE --
  // {API_URL}/v1/auth/users/delete_my_user
  deleteMyUser: async (req, res) => {
    const userId = await getLoggedInUser(req, [ 'id' ]);
    const password = deepTrim(req.body.password) || '';

    if (!password) {
      handleApiAnalytic(req, 'failed_delete_my_user', 'Password provided was incorrect');
      res.status(401);
      res.json({
        'status': 'USER_DELETE_INVALID_PASSWORD',
        'message': 'The provided password is incorrect',
      });
      return;
    }

    const user = await retrieveUser({
      id: userId,
      password,
      allowDisabled: true,
      eager: {
        user_subscriptions: false,
        permissions: false,
      },
    });

    if (!user) {
      handleApiAnalytic(req, 'failed_delete_my_user', 'Provided password was incorrect');
      res.status(401);
      res.json({
        'status': 'USER_DELETE_INVALID_PASSWORD',
        'message': 'The provided password is incorrect',
      });
      return;
    }

    return deleteUser(userId, req, res);
  },
};


module.exports = users;
