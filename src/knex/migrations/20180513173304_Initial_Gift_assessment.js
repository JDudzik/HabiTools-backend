const uuidPrimaryKey = require('../helpers/uuidPrimaryKey');

exports.up = (knex) => {
  return knex.schema
    .createTable('assessments', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('deleted_at').unsigned();
      table.string('title');
      table.string('description', 2048);
      table.string('assessment_type');
      table.integer('questions_per_category').unsigned();
      table.boolean('is_hidden');
    })
    .createTable('assessment_categories', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('deleted_at').unsigned();
      table.string('name').unsigned();
      table
        .uuid('assessment_id')
        .references('id')
        .inTable('assessments');
    })
    .createTable('questions', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('deleted_at').unsigned();
      table.string('category');
      table.string('text', 2048);
      table
        .uuid('assessment_id')
        .references('id')
        .inTable('assessments');
    })
    .createTable('results', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table.bigInteger('deleted_at').unsigned();
      table.bigInteger('start_utc').unsigned();
      table.bigInteger('end_utc').unsigned();
      table
        .uuid('assessment_id')
        .references('id')
        .inTable('assessments');
      table
        .uuid('user_id')
        .references('id')
        .inTable('users');
      table
        .uuid('coach_id')
        .references('id')
        .inTable('users');
      table.json('scores');
    });
};


exports.down = (knex) => {
  return knex.schema
    .dropTableIfExists('results')
    .dropTableIfExists('questions')
    .dropTableIfExists('assessment_categories')
    .dropTableIfExists('assessments');
};
