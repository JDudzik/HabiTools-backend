import { Model } from 'objection';

export default class Email_Confirmation extends Model {
  // Table name is the only required property.
  static tableName = 'email_confirmations';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'type', 'token' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      created_at: { type: 'integer' },
      deleted_at: { type: [ 'integer', 'null' ]},
      completed_at: { type: [ 'integer', 'null' ]},
      type: { type: 'string', minLength: 1, maxLength: 255 },
      token: { type: 'string', minLength: 1, maxLength: 255 },
      metadata: { type: [ 'object', 'null' ]},
      user_id: { type: [ 'string', 'null' ]},
      requested_by_user_id: { type: [ 'string', 'null' ]},
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
        from: 'email_confirmations.user_id',
        to: 'users.id',
      },
    },

    requested_user: {
      relation: Model.BelongsToOneRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/User`,
      join: {
        from: 'email_confirmations.requested_by_user_id',
        to: 'users.id',
      },
    },
  };
}
