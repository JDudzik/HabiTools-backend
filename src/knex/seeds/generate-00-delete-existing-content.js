exports.seed = (knex) => {
  // It's important that these deletes stay in reverse-order from relationship declarations.
  // In most cases you can reverse the order of the seeds.
  // Just don't forget to include tables that aren't declared in the seeds (such as 'analytics').
  const newKnex = knex('event_messages').del()
    .then(() => knex('webhooks_handled').del())
    .then(() => knex('webhooks').del())
    .then(() => knex('crons').del())
    .then(() => knex('article_tags').del())
    .then(() => knex('article_contents').del())
    .then(() => knex('articles').del())
    .then(() => knex('knex_data_migrations').del())
    .then(() => knex('email_confirmations').del())
    .then(() => knex('results').del())
    .then(() => knex('questions').del())
    .then(() => knex('assessment_categories').del())
    .then(() => knex('assessments').del())
    .then(() => knex('analytics').del())
    .then(() => knex('errors').del())
    .then(() => knex('feedbacks').del())
    .then(() => knex('users_to_permissions').del())
    .then(() => knex('users_to_groups').del())
    .then(() => knex('user_passwords').del())
    .then(() => knex('user_subscriptions').del())
    .then(() => knex('users').del())
    .then(() => knex('groups_to_permissions').del())
    .then(() => knex('groups').del())
    .then(() => knex('permissions').del());

  return newKnex;
};
