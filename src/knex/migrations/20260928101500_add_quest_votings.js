const uuidPrimaryKey = require('../helpers/uuidPrimaryKey');

exports.up = (knex) => {
  return knex.schema.createTable('quest_votings', (table) => {
    uuidPrimaryKey(knex, table);

    table.bigInteger('created_at').unsigned().notNullable();
    table.bigInteger('updated_at').unsigned().nullable();
    table.bigInteger('deleted_at').unsigned().nullable();

    table.string('party_habitica_id', 255).notNullable().unique();
    table.string('party_name', 255).nullable();

    table
      .uuid('leader_user_id')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .nullable();

    table.string('leader_habitica_user_id', 255).nullable();

    table
      .uuid('leader_tool_resource_id')
      .references('id')
      .inTable('habitica_tools')
      .onDelete('SET NULL')
      .nullable();

    table.boolean('paused').notNullable().defaultTo(false);
    table.boolean('secure_voting').notNullable().defaultTo(true);

    table.json('party_filters').nullable();
    table.json('participants').notNullable().defaultTo('[]');
    table.json('active_ballot').nullable();
    table.json('vote_links').notNullable().defaultTo('[]');
    table.json('vote_history').notNullable().defaultTo('[]');
    table.json('last_known_quest').nullable();

    table.bigInteger('last_vote_opened_at').unsigned().nullable();
    table.bigInteger('last_vote_closed_at').unsigned().nullable();
  });
};

exports.down = (knex) => {
  return knex.schema.dropTableIfExists('quest_votings');
};
