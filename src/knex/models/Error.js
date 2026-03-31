import { Model } from 'objection';

export default class Error extends Model {
  // Table name is the only required property.
  static tableName = 'errors';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'source', 'is_api_error' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      created_at: { type: 'integer' },
      deleted_at: { type: [ 'integer', 'null' ]},
      source: { type: 'string', maxLength: 5001 },
      message: { type: 'string', maxLength: 5001 },
      message_json: { type: 'string', maxLength: 5001 },
      is_api_error: { type: 'boolean' },
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
        from: 'errors.user_id',
        to: 'users.id',
      },
    },
  };
}
