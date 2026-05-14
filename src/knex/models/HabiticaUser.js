import { Model } from 'objection';

export default class HabiticaUser extends Model {
  static tableName = 'habitica_users';

  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'user_id', 'habitica_user_id' ],
    properties: {
      id:                 { type: 'string' },
      created_at:         { type: 'integer' },
      user_id:            { type: 'string' },
      habitica_user_id:   { type: 'string', minLength: 1, maxLength: 255 },
      is_primary:         { type: 'boolean' },
    },
  };

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/User`,
      join: {
        from: 'habitica_users.user_id',
        to: 'users.id',
      },
    },

    habitica_user_data: {
      relation: Model.HasOneRelation,
      modelClass: `${ __dirname }/HabiticaUserData`,
      join: {
        from: 'habitica_users.id',
        to: 'habitica_user_data.id',
      },
    },

    habitica_user_encrypted_key: {
      relation: Model.HasOneRelation,
      modelClass: `${ __dirname }/HabiticaUserEncryptedKey`,
      join: {
        from: 'habitica_users.id',
        to: 'habitica_user_encrypted_keys.id',
      },
    },

    habitica_tools: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/HabiticaTool`,
      join: {
        from: 'habitica_users.id',
        to: 'habitica_tools.habitica_user_id',
      },
    },
  };
}
