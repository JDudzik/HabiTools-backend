import { Model } from 'objection';

export default class User extends Model {
  // Table name is the only required property.
  static tableName = 'user_passwords';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'password_hash' ],
    properties: {
      // id:         { type: 'string' },
      created_at: { type: 'integer' },
      updated_at: { type: [ 'integer', 'null' ]},
      requires_reset:  { type: [ 'boolean', 'null' ]},
      password_hash: { type: 'string', maxLength: 3000 },
      user_id:   { type: 'string' },
    },
  };

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/User`,
      join: {
        from: 'user_passwords.id',
        to: 'users.id',
      },
    },
  };
}
