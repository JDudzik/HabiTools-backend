import Email_Confirmation from 'knex/models/Email_Confirmation';
import UIDGenerator from 'uid-generator';

const uidgen = new UIDGenerator(512);

export const generateToken = async () => {
  const token = uidgen.generateSync();
  const duplicatedTokens = await Email_Confirmation.query()
    .where('token', token);

  if (duplicatedTokens.length >= 1) {
    return generateToken();
  }
  return token;
};
