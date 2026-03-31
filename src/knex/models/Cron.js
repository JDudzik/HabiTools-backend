import { Model } from 'objection';

export default class Cron extends Model {
  // Table name is the only required property.
  static tableName = 'crons';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'task_name', 'schedule' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      user_id: { type: [ 'string', 'null' ]},
      resource_id: { type: [ 'string', 'null' ]},
      created_at: { type: 'integer' },
      updated_at: { type: [ 'integer', 'null' ]},
      deleted_at: { type: [ 'integer', 'null' ]},
      task_name: { type: 'string', minLength: 1, maxLength: 255 },
      schedule: { type: 'string', minLength: 1, maxLength: 255 },
      is_active: { type: [ 'boolean', 'null' ]},
      options: { type: [ 'object', 'null' ]},
      immediate_always: { type: [ 'boolean', 'null' ]},
      expires_at: { type: [ 'integer', 'null' ]},
      data: { type: [ 'object', 'null' ]},
    },
  };

  // This object defines the relations to other models.
  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/User`,
      join: {
        from: 'crons.user_id',
        to: 'users.id',
      },
    },
  };
}
