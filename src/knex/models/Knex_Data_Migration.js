import { Model } from 'objection';

export default class Knex_Data_Migration extends Model {
  // Table name is the only required property.
  static tableName = 'knex_data_migrations';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'migration_time', 'name' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      name: { type: 'string', minLength: 1, maxLength: 255 },
      migration_time: { type: 'integer' },
    },
  };
}
