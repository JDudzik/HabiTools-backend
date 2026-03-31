import User from 'knex/models/User';


const frontendHost = process.env.FRONTEND_HOST;

// Verify Email
const verificationData = {
  title: 'Verify Email',
  description: 'Used in verification of the users email address',
  templateId: 7,
  confirmationLink: `${ frontendHost }/email-confirmations?type=verify-email`,
};

// Params:
// N/A
const resolve = async (confirmation) => {
  const email = confirmation.metadata.email;
  return await User.query()
    .where('email', email)
    .whereNull('disabled_at')
    .patch({ has_verified_email: true })

    .then(patched => patched)
    .catch((err) => { throw [ err, 'confirmationMethods.verifyEmail' ]; });
};

export default {
  resolve,
  ...verificationData,
};