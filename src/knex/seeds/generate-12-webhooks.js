exports.seed = (knex) => {
  return knex('webhooks').insert([
    {
      id: '00000001-0013-4000-b000-000000000000',
      user_id: '00000001-0001-4000-a000-000000000000',
      created_at: Date.now(),
      deleted_at: null,
      url_id: '83d9dc55-42cc-49a5-aaf5-3b0862d6fc28d4697541-d802-49a4-b8cf-71dd3dddd262',
      task_name: 'example-webhook-logger',
      is_active: true,
      expires_at: Date.now() + 604800000, // Expires in 7 days
      data: { message: 'Webhook 1 data' },
    },
    {
      id: '00000002-0013-4000-b000-000000000000',
      created_at: Date.now(),
      deleted_at: Date.now(),
      url_id: '57a0c76c-da87-4076-b032-19bac10b34b487e0d700-e277-4de0-84d9-bd403584a8aa',
      task_name: 'example-webhook-logger',
      is_active: true,
      expires_at: null, // No expiration
      data: { message: 'Webhook 2 data' },
    },
    {
      id: '00000003-0013-4000-b000-000000000000',
      created_at: Date.now(),
      url_id: '57a0c76c-da87-4076-b032-19bac10b34b487e0d700-e277-4de0-84d9-bd403584a8aa',
      task_name: 'example-webhook-logger',
      is_active: true,
      expires_at: null, // No expiration
      data: { message: 'Webhook 3 data' },
    },
  ]);
};