const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

exports.seed = async (knex) => {
  const now = Date.now();

  const USER_ID = '00000001-0001-4000-a000-000000000000';
  const HABITICA_USER_ID = '10000004-0017-4000-a000-000000000004';

  await knex('habitica_tools').insert([
    {
      id: '00000001-0018-4000-a000-000000000000',
      created_at: now - THIRTY_DAYS_MS,
      updated_at: now - THIRTY_DAYS_MS,
      deleted_at: null,
      habitica_user_id: HABITICA_USER_ID,
      tool_slug: 'auto-accept-quests',
      expires_at: now + THIRTY_DAYS_MS,
      last_refreshed_at: now - THIRTY_DAYS_MS,
      data: null,
    },
    {
      id: '00000002-0018-4000-a000-000000000000',
      created_at: now - (THIRTY_DAYS_MS * 3),
      updated_at: now - 86400000, // updated 1 day ago (when deleted)
      deleted_at: now - 86400000,
      habitica_user_id: HABITICA_USER_ID,
      tool_slug: 'auto-accept-quests',
      expires_at: now + (THIRTY_DAYS_MS * 2), // still had lease time remaining
      last_refreshed_at: now - (THIRTY_DAYS_MS * 2),
      data: null,
    },
    {
      id: '00000003-0018-4000-a000-000000000000',
      created_at: now - (THIRTY_DAYS_MS * 2),
      updated_at: now - (THIRTY_DAYS_MS * 2),
      deleted_at: null,
      habitica_user_id: HABITICA_USER_ID,
      tool_slug: 'auto-accept-quests',
      expires_at: now - 86400000, // expired 1 day ago
      last_refreshed_at: now - (THIRTY_DAYS_MS * 2),
      data: null,
    },
  ]);

  // ── Webhooks ───────────────────────────────────────────────
  await knex('webhooks').insert([
    {
      id: '00000001-0018-4000-b000-000000000000',
      user_id: USER_ID,
      resource_id: '00000001-0018-4000-a000-000000000000',
      created_at: now - THIRTY_DAYS_MS,
      updated_at: now - THIRTY_DAYS_MS,
      deleted_at: null,
      url_id: 'a1b2c3d4-0018-4000-b000-000000000001e5f6a7b8-0018-4000-b000-000000000001',
      task_name: 'auto-accept-quests',
      is_active: true,
      expires_at: now + THIRTY_DAYS_MS,
      data: { habiticaUserId: HABITICA_USER_ID, habiticaWebhookId: 'mock-habitica-webhook-id-001' },
    },
    {
      id: '00000002-0018-4000-b000-000000000000',
      user_id: USER_ID,
      resource_id: '00000002-0018-4000-a000-000000000000',
      created_at: now - (THIRTY_DAYS_MS * 3),
      updated_at: now - 86400000,
      deleted_at: now - 86400000,
      url_id: 'a1b2c3d4-0018-4000-b000-000000000002e5f6a7b8-0018-4000-b000-000000000002',
      task_name: 'auto-accept-quests',
      is_active: false,
      expires_at: now + (THIRTY_DAYS_MS * 2),
      data: { habiticaUserId: HABITICA_USER_ID, habiticaWebhookId: 'mock-habitica-webhook-id-002' },
    },
    {
      id: '00000003-0018-4000-b000-000000000000',
      user_id: USER_ID,
      resource_id: '00000003-0018-4000-a000-000000000000',
      created_at: now - (THIRTY_DAYS_MS * 2),
      updated_at: now - (THIRTY_DAYS_MS * 2),
      deleted_at: null,
      url_id: 'a1b2c3d4-0018-4000-b000-000000000003e5f6a7b8-0018-4000-b000-000000000003',
      task_name: 'auto-accept-quests',
      is_active: false,
      expires_at: now - 86400000,
      data: { habiticaUserId: HABITICA_USER_ID, habiticaWebhookId: 'mock-habitica-webhook-id-003' },
    },
  ]);

  // ── Crons ──────────────────────────────────────────────────
  await knex('crons').insert([
    {
      id: '00000001-0018-4000-c000-000000000000',
      user_id: USER_ID,
      resource_id: '00000001-0018-4000-a000-000000000000',
      created_at: now - THIRTY_DAYS_MS,
      updated_at: now - THIRTY_DAYS_MS,
      deleted_at: null,
      task_name: 'auto-accept-quests',
      schedule: '0 * * * *',
      is_active: true,
      immediate_always: false,
      expires_at: now + THIRTY_DAYS_MS,
      data: { habitica_user_id: HABITICA_USER_ID },
    },
    {
      id: '00000002-0018-4000-c000-000000000000',
      user_id: USER_ID,
      resource_id: '00000002-0018-4000-a000-000000000000',
      created_at: now - (THIRTY_DAYS_MS * 3),
      updated_at: now - 86400000,
      deleted_at: now - 86400000,
      task_name: 'auto-accept-quests',
      schedule: '0 * * * *',
      is_active: false,
      immediate_always: false,
      expires_at: now + (THIRTY_DAYS_MS * 2),
      data: { habitica_user_id: HABITICA_USER_ID },
    },
    {
      id: '00000003-0018-4000-c000-000000000000',
      user_id: USER_ID,
      resource_id: '00000003-0018-4000-a000-000000000000',
      created_at: now - (THIRTY_DAYS_MS * 2),
      updated_at: now - (THIRTY_DAYS_MS * 2),
      deleted_at: null,
      task_name: 'auto-accept-quests',
      schedule: '0 * * * *',
      is_active: false,
      immediate_always: false,
      expires_at: now - 86400000,
      data: { habitica_user_id: HABITICA_USER_ID },
    },
  ]);
};
