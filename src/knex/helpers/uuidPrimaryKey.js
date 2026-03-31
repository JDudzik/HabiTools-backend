const uuidPrimaryKey = (knex, table, columnName) => {
  table.uuid(columnName || 'id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
};

module.exports = uuidPrimaryKey;