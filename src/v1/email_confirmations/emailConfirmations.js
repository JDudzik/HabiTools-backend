import { resolveEmailConfirmation, isConfirmationValid } from 'internal/emailConfirmations';

const emailConfirmations = {

  // Resolve Confirmation
  //
  // -- PUT --
  // {API_URL}/v1/email_confirmations/resolve/:type/:token
  // -- PARAMS --
  // type: the specific type of confirmation
  // token: the token UID key generated for this confirmation
  resolve: async (req, res) => {
    const type = req.params.type;
    const token = req.params.token;
    return await resolveEmailConfirmation(type, token, req, res);
  },

  // Verify Confirmation
  //
  // -- GET --
  // {API_URL}/v1/email_confirmations/verifty/:type/:token
  // -- PARAMS --
  // type: the specific type of confirmation
  // token: the token UID key generated for this confirmation
  verify: async (req, res) => {
    const type = req.params.type;
    const token = req.params.token;
    return await isConfirmationValid(type, token, req, res);
  },
};

module.exports = emailConfirmations;
