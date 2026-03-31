import { Model } from 'objection';

export default class Feedback extends Model {
  // Table name is the only required property.
  static tableName = 'feedbacks';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'topic', 'email', 'message' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      created_at: { type: 'integer' },
      deleted_at: { type: [ 'integer', 'null' ]},
      source: { type: 'string', maxLength: 255 },
      topic: { type: 'string', minLength: 1, maxLength: 255 },
      email: { type: 'string', minLength: 1, maxLength: 255 },
      message: { type: 'string', minLength: 1, maxLength: 15000 },
      user_id: { type: [ 'string', 'null' ]},
    },
  };

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/User`,
      join: {
        from: 'feedbacks.user_id',
        to: 'users.id',
      },
    },
  };
}
