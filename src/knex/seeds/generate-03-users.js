const crypto = require('crypto');
require('dotenv').config({ path: '../../.env' });


exports.seed = (knex) => {
  // //////////////////////////////////////
  // Users
  return knex('users').insert([
    {
      id: '00000001-0001-4000-a000-000000000000',
      created_at: Date.now(),
      first_name: 'J',
      last_name: 'D',
      email: process.env.ADMIN_USER_EMAIL,
      has_verified_email: true,
    },
    {
      id: '00000002-0001-4000-a000-000000000000',
      created_at: Date.now(),
      first_name: 'Test 1',
      last_name: 'foo',
      email: 'foo@bar.com',
      has_verified_email: true,
      stripe_customer_id: 'cus_00001ABCDEFG',
    },
    {
      id: '00000003-0001-4000-a000-000000000000',
      created_at: Date.now(),
      first_name: 'Test 2',
      last_name: 'last',
      email: 'bar@foo.com',
      has_verified_email: false,
      stripe_customer_id: 'cus_00003OPQRST',
    },
  ])


    // //////////////////////////////////////
    // User Passwords
    .then(() => knex('user_passwords').insert([
      {
        id: '00000001-0001-4000-a000-000000000000',
        created_at: Date.now(),
        updated_at: Date.now(),
        requires_reset: 0,
        password_hash: sha512(process.env.ADMIN_USER_PASS, process.env.TOKEN_SALT),
      },
      {
        id: '00000002-0001-4000-a000-000000000000',
        created_at: Date.now(),
        updated_at: Date.now(),
        requires_reset: 0,
        password_hash: sha512('qwerty', process.env.TOKEN_SALT),
      },
      {
        id: '00000003-0001-4000-a000-000000000000',
        created_at: Date.now(),
        updated_at: Date.now(),
        requires_reset: 0,
        password_hash: sha512('qwerty', process.env.TOKEN_SALT),
      },
    ]))


    // //////////////////////////////////////
    // Users to Groups
    .then(() => knex('users_to_groups').insert([
      {
        user_id: '00000001-0001-4000-a000-000000000000', // masterlink950@gmail.com
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2', // super_admin
      },
      {
        user_id: '00000001-0001-4000-a000-000000000000', // masterlink950@gmail.com
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23', // admin
      },
      {
        user_id: '00000002-0001-4000-a000-000000000000', // foo@bar.com
        group_id: '1e485ad5-adb8-48c4-8a87-660fe5462e55', // Test Group
      },
    ]))
  
  
    // //////////////////////////////////////
    // Users to Permissions
    .then(() => knex('users_to_permissions').insert([
      {
        user_id: '00000002-0001-4000-a000-000000000000', // foo@bar.com
        permission_id: '7b6c8233-b1bb-498b-8db8-2116bdd87146', // test
      },
    ]));
};


function sha512(input, salt) {
  const method = 'sha512';
  const digestType = 'hex';

  return crypto
    .createHmac(method, salt)
    .update(input)
    .digest(digestType);
}
