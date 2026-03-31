import { Model } from 'objection';

export default class Analytic extends Model {
  // Table name is the only required property.
  static tableName = 'analytics';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'action_name', 'action_value' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      created_at: { type: 'integer' },
      deleted_at: { type: [ 'integer', 'null' ]},
      action_name: { type: 'string', minLength: 1, maxLength: 255 },
      action_value: { type: [ 'string', 'integer' ], minLength: 1, maxLength: 8192 },
      source: { type: 'string', minLength: 1, maxLength: 255 },
      user_id: { type: [ 'string', 'null' ]},
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
        from: 'analytics.user_id',
        to: 'users.id',
      },
    },
  };
}
