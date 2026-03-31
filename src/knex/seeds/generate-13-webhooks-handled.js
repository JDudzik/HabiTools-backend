exports.seed = (knex) => {
  return knex('webhooks_handled').insert([
    {
      id: '00000001-0014-4000-b000-000000000000',
      request_id: 'pi_00001GGGGGGGGGGGGGGGGGGG',
      request_type: 'successful_payment_intent',
      created_at: Date.now(),
      metadata: null,
    },
    {
      id: '00000002-0014-4000-b000-000000000000',
      request_id: 'pi_00002GGGGGGGGGGGGGGGGGGG',
      request_type: 'successful_payment_intent',
      created_at: Date.now(),
      metadata: null,
    },
  ]);
};