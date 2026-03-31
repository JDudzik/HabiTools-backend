import { sha512, returnOrSendResponse } from 'utils';
import User_Password from 'knex/models/User_Password';
import deepTrim from 'deep-trim';

const frontendHost = process.env.FRONTEND_HOST;

// Reset Password
const verificationData = {
  title: 'Reset Password',
  description: 'Used to reset password for the specified user',
  templateId: 8,
  confirmationLink: `${ frontendHost }/email-confirmations?type=reset-password`,
};

// Params:
// new_password: The new password to assign to the user
// -- ERROR CODES --
// UNPROVIDED_PASSWORD
const resolve = async (confirmation, req, res) => {
  const userId = confirmation.user_id;
  const newPassword = req.body.new_password;
  if (!newPassword) {
    return returnOrSendResponse(400, {
      status: 'UNPROVIDED_PASSWORD',
      message: 'Must provide a new password',
    }, req, res);
  }

  const newPasswordHash = sha512(deepTrim(req.body.new_password) || '');

  return await User_Password.query()
    .where('id', userId)
    .patch({ password_hash: newPasswordHash })

    .then(patched => patched)
    .catch((err) => { throw [ err, 'confirmationMethods.resetPassword' ]; });
};



export default {
  resolve,
  ...verificationData,
};