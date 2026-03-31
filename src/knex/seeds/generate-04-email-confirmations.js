const UIDGenerator = require('uid-generator');

const uidgen = new UIDGenerator(256);

exports.seed = (knex) => {
  return knex('email_confirmations').insert([
    {
      created_at: Date.now(),
      completed_at: Date.now(),
      type: 'verify-email',
      token: uidgen.generateSync(),
      user_id: '00000001-0001-4000-a000-000000000000',
    },
  ]);
};
