const uuidPrimaryKey = require('../helpers/uuidPrimaryKey');


exports.up = (knex) => {
  return knex.schema
    .createTable('users', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('disabled_at').unsigned();
      table.string('first_name');
      table.string('last_name');
      table.string('email').unique();
      table.bigInteger('dob_utc').unsigned();
      table.string('gender');
      table.boolean('has_verified_email');
      table.integer('credits').unsigned();
      table.string('stripe_customer_id');
      table
        .uuid('coach_id')
        .references('id')
        .inTable('users');
    })
    .createTable('user_passwords', (table) => {
      table
        .uuid('id')
        .references('id')
        .inTable('users')
        .primary();
      table.bigInteger('created_at').unsigned();
      table.bigInteger('updated_at').unsigned();
      table.boolean('requires_reset');
      table.string('password_hash');
    })
    .createTable('user_subscriptions', (table) => {
      table
        .uuid('id')
        .references('id')
        .inTable('users')
        .primary();
      table.string('stripe_customer_id');
      table.boolean('is_sub_active');
      table.bigInteger('sub_purchased').unsigned();
      table.bigInteger('sub_created').unsigned();
      table.bigInteger('sub_expires').unsigned();
      table.bigInteger('updated_at').unsigned();
      table.string('entitlements');
    })
    .createTable('analytics', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('deleted_at').unsigned();
      table.string('action_name');
      table.string('action_value', 8192);
      table.string('source');
      table
        .uuid('user_id')
        .references('id')
        .inTable('users');
    })
    .createTable('errors', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('deleted_at').unsigned();
      table.string('source', 5001);
      table.string('message', 5001);
      table.string('message_json', 5001);
      table.boolean('is_api_error');
      table
        .uuid('user_id')
        .references('id')
        .inTable('users');
    })
    .createTable('feedbacks', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('deleted_at').unsigned();
      table.string('source');
      table.string('topic');
      table.string('email');
      table.string('message', 8192);
      table
        .uuid('user_id')
        .references('id')
        .inTable('users');
    })
    .createTable('knex_data_migrations', (table) => {
      uuidPrimaryKey(knex, table);
      table.string('name');
      table.bigInteger('migration_time').unsigned();
    })
    .createTable('permissions', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('deleted_at').unsigned();
      table.string('name');
      table.string('description');
      table.boolean('is_deletable');
      table.string('permission_required_for_assignment');
    })
    .createTable('users_to_permissions', (table) => {
      uuidPrimaryKey(knex, table);
      table
        .uuid('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .uuid('permission_id')
        .unsigned()
        .references('id')
        .inTable('permissions')
        .onDelete('CASCADE');
    })
    .createTable('groups', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('deleted_at').unsigned();
      table.string('name');
      table.string('description', 2048);
      table.boolean('is_deletable');
      table.string('permission_required_for_assignment');
    })
    .createTable('users_to_groups', (table) => {
      uuidPrimaryKey(knex, table);
      table
        .uuid('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .uuid('group_id')
        .unsigned()
        .references('id')
        .inTable('groups')
        .onDelete('CASCADE');
    })
    .createTable('groups_to_permissions', (table) => {
      uuidPrimaryKey(knex, table);
      table
        .uuid('group_id')
        .unsigned()
        .references('id')
        .inTable('groups')
        .onDelete('CASCADE');
      table
        .uuid('permission_id')
        .unsigned()
        .references('id')
        .inTable('permissions')
        .onDelete('CASCADE');
    })
    .createTable('email_confirmations', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('deleted_at').unsigned();
      table.bigInteger('completed_at').unsigned();
      table.string('type');
      table.string('token', 2048);
      table.json('metadata');
      table
        .uuid('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .uuid('requested_by_user_id')
        .references('id')
        .inTable('users');
    })
    .createTable('articles', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('deleted_at').unsigned();
      table.bigInteger('updated_at').unsigned();
      table.string('title');
      table.string('type');
      table.string('slug').unique();
      table.integer('version').unsigned();
      table.boolean('require_simple');
      table.boolean('disable_newlines');
      table.boolean('deletable');
      table
        .uuid('author_id')
        .references('id')
        .inTable('users');
    })
    .createTable('article_contents', (table) => {
      uuidPrimaryKey(knex, table);
      table.text('content', 'mediumtext');
    })
    .createTable('article_tags', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.string('tag');
      table
        .uuid('article_id')
        .references('id')
        .inTable('articles')
        .onDelete('CASCADE');
    })
    .createTable('webhooks', (table) => {
      uuidPrimaryKey(knex, table);
      table
        .uuid('user_id')
        .references('id')
        .inTable('users');
      table.string('url_id', 255).notNullable();
      table.uuid('resource_id').nullable();
      table.string('task_name', 255).notNullable();
      table.bigInteger('created_at').unsigned().notNullable();
      table.bigInteger('updated_at').unsigned().nullable();
      table.bigInteger('deleted_at').unsigned().nullable();
      table.integer('deletes_attempted').unsigned().nullable();
      table.boolean('is_active').defaultTo(true);
      table.json('options').nullable();
      table.bigInteger('expires_at').unsigned().nullable();
      table.json('data').nullable();
    })
    .createTable('webhooks_handled', (table) => {
      uuidPrimaryKey(knex, table);
      table.string('request_id', 255).notNullable();
      table.string('request_type', 255).notNullable();
      table.bigInteger('created_at').unsigned().notNullable();
      table.json('metadata').nullable();
    })
    .createTable('crons', (table) => {
      uuidPrimaryKey(knex, table);
      table
        .uuid('user_id')
        .references('id')
        .inTable('users');
      table.uuid('resource_id').nullable();
      table.bigInteger('created_at').unsigned().notNullable();
      table.bigInteger('updated_at').unsigned().nullable();
      table.bigInteger('deleted_at').unsigned().nullable();
      table.string('task_name', 255).notNullable();
      table.string('schedule', 255).notNullable();
      table.boolean('is_active').defaultTo(true);
      table.json('options').nullable();
      table.boolean('immediate_always').defaultTo(false);
      table.bigInteger('expires_at').unsigned().nullable();
      table.json('data').nullable();
    })
    .createTable('event_messages', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned().notNullable();
      table
        .uuid('user_id')
        .references('id')
        .inTable('users');
      table.uuid('resource_id').nullable();
      table.string('event_slug', 255);
      table.string('event_name', 255);
      table.text('message_text').notNullable();
      table.string('short_message', 255).nullable();
      table.boolean('should_notify').nullable();
      table.integer('priority').unsigned().notNullable()
        .checkIn([ 0, 1, 2, 3 ]); // 0="debug", 1="normal", 2="high", 3="severe"
      table.boolean('acknowledged').nullable();
    });
};


exports.down = (knex) => {
  return knex.schema
    .dropTableIfExists('event_messages')
    .dropTableIfExists('webhooks_handled')
    .dropTableIfExists('webhooks')
    .dropTableIfExists('crons')
    .dropTableIfExists('article_tags')
    .dropTableIfExists('article_contents')
    .dropTableIfExists('articles')
    .dropTableIfExists('email_confirmations')
    .dropTableIfExists('groups_to_permissions')
    .dropTableIfExists('users_to_groups')
    .dropTableIfExists('groups')
    .dropTableIfExists('users_to_permissions')
    .dropTableIfExists('permissions')
    .dropTableIfExists('knex_data_migrations')
    .dropTableIfExists('feedbacks')
    .dropTableIfExists('errors')
    .dropTableIfExists('analytics')
    .dropTableIfExists('user_passwords')
    .dropTableIfExists('user_subscriptions')
    .dropTableIfExists('users');
};
