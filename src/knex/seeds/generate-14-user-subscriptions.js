exports.seed = (knex) => {
  return knex('user_subscriptions').insert([
    {
      // Active for 30 days
      id: '00000002-0001-4000-a000-000000000000',
      stripe_customer_id: 'cus_00001ABCDEFG',
      updated_at: Date.now(),
      is_sub_active: true,
      sub_purchased: Date.now(),
      sub_created: Date.now(),
      sub_expires: Date.now() + 2592000, // 30 days later
      entitlements: JSON.stringify([ 'basic' ]),
    },
    {
      // Expired
      id: '00000003-0001-4000-a000-000000000000',
      stripe_customer_id: 'cus_00003OPQRST',
      updated_at: Date.now() - 63072000, // 2 years ago
      is_sub_active: false,
      sub_purchased: Date.now() - 63072000, // 2 years ago
      sub_created: Date.now() - 63072000, // 2 years ago
      sub_expires: Date.now() - 2592000, // Expired 30 days ago
      entitlements: JSON.stringify([]),
    },
  ]);
};