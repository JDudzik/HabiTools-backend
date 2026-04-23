const uuidPrimaryKey = require('../helpers/uuidPrimaryKey');

exports.up = (knex) => {
  return knex.schema
    .createTable('habitica_users', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('created_at').unsigned();
      table
        .uuid('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('habitica_user_id').notNullable();
      table.string('encrypted_api_key', 4096).notNullable();
      table.boolean('is_primary').defaultTo(false);
    })
    .createTable('habitica_user_data', (table) => {
      table
        .uuid('id')
        .references('id')
        .inTable('habitica_users')
        .primary()
        .onDelete('CASCADE');
      table.bigInteger('last_updated').unsigned();
      table.string('username', 255);
      table.string('email', 255);
      table.json('achievements');
      table.json('items');
      table.json('party');
      table.json('webhooks');
      table.float('hp');
      table.float('mp');
      table.float('exp');
      table.float('gp');
      table.integer('lvl').unsigned();
      table.string('class', 255);
      table.integer('maxHealth').unsigned();
      table.integer('maxMP').unsigned();
      table.bigInteger('lastCron').unsigned();
    })
    .createTable('habitica_content', (table) => {
      uuidPrimaryKey(knex, table);
      table.bigInteger('last_updated').unsigned();
      table.string('language', 50).defaultTo('en');
      table.string('appVersion', 50);
      table.json('achievements');
      table.json('quests');
      table.json('questsByLevel');
      table.json('userCanOwnQuestCategories');
      table.json('itemList');
      table.json('spells');
      table.json('mystery');
      table.json('officialPinnedItems');
      table.json('bundles');
      table.json('categoryOptions');
      table.json('potion');
      table.json('armoire');
      table.json('events');
      table.json('repeatingEvents');
      table.json('classes');
      table.json('gearTypes');
      table.json('cardTypes');
      table.json('special');
      table.json('dropEggs');
      table.json('questEggs');
      table.json('eggs');
      table.json('timeTravelStable');
      table.json('dropHatchingPotions');
      table.json('premiumHatchingPotions');
      table.json('wackyHatchingPotions');
      table.json('hatchingPotions');
      table.json('food');
      table.json('appearances');
      table.json('backgrounds');
    })
    .createTable('habitica_content_gear', (table) => {
      table.string('id', 255).primary();
      table.bigInteger('last_updated').unsigned().notNullable();
      table.string('language', 50).notNullable().defaultTo('en');
      table.string('key', 255).notNullable().unique();
      table.string('set', 255);
      table.string('specialClass', 255);
      table.string('text', 255);
      table.string('notes', 8192);
      table.integer('value');
      table.string('season', 255);
      table.integer('str');
      table.string('type', 255);
      table.string('klass', 255);
      table.string('index', 255);
      table.integer('int');
      table.integer('per');
      table.integer('con');
      table.json('event');
      table.boolean('last');
      table.string('mystery', 255);
      table
        .uuid('habitica_content_id')
        .references('id')
        .inTable('habitica_content')
        .onDelete('CASCADE')
        .notNullable();
    })
    .createTable('habitica_content_pets', (table) => {
      table.string('id', 255).primary();
      table.bigInteger('last_updated').unsigned().notNullable();
      table.string('language', 50).notNullable().defaultTo('en');
      table.string('key', 255).notNullable().unique();
      table.string('type', 255);
      table.string('potion', 255);
      table.string('egg', 255);
      table.string('text', 255);
      table
        .uuid('habitica_content_id')
        .references('id')
        .inTable('habitica_content')
        .onDelete('CASCADE')
        .notNullable();
    })
    .createTable('habitica_content_mounts', (table) => {
      table.string('id', 255).primary();
      table.bigInteger('last_updated').unsigned().notNullable();
      table.string('language', 50).notNullable().defaultTo('en');
      table.string('key', 255).notNullable().unique();
      table.string('type', 255);
      table.string('potion', 255);
      table.string('egg', 255);
      table.string('text', 255);
      table
        .uuid('habitica_content_id')
        .references('id')
        .inTable('habitica_content')
        .onDelete('CASCADE')
        .notNullable();
    });
};

exports.down = (knex) => {
  return knex.schema
    .dropTableIfExists('habitica_content_mounts')
    .dropTableIfExists('habitica_content_pets')
    .dropTableIfExists('habitica_content_gear')
    .dropTableIfExists('habitica_content')
    .dropTableIfExists('habitica_user_data')
    .dropTableIfExists('habitica_users');
};
