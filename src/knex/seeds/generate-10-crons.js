exports.seed = (knex) => {
  return knex('crons').insert([
    {
      id: '00000001-0011-4000-a000-000000000000',
      user_id: '00000001-0001-4000-a000-000000000000',
      created_at: Date.now(),
      updated_at: Date.now(),
      task_name: 'example-logger',
      schedule: '0 0 * * * *', // Runs every hour
      is_active: false,
      options: { priority: 'high' },
      immediate_always: false,
      expires_at: Date.now() + 86400000, // Expires in 1 day
      data: { message: 'Active cron job', showParameters: true },
    },
    {
      id: '00000002-0011-4000-a000-000000000000',
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: Date.now(),
      task_name: 'example-logger',
      schedule: '*/5 * * * * *', // Runs every 5 seconds
      is_active: false,
      options: { maxRandomDelay: 1000 },
      immediate_always: false,
      expires_at: null, // No expiration
      data: { message: 'Inactive cron job', showParameters: true },
    },
  ]);
};
