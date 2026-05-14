import { Model } from 'objection';

export default class HabiticaUserEncryptedKey extends Model {
  static tableName = 'habitica_user_encrypted_keys';

  static jsonSchema = {
    type: 'object',
    required: [ 'id', 'encrypted_api_key' ],
    properties: {
      id: { type: 'string' },
      encrypted_api_key: { type: 'string', minLength: 1, maxLength: 4096 },
    },
  };

  static relationMappings = {
    habitica_user: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/HabiticaUser`,
      join: {
        from: 'habitica_user_encrypted_keys.id',
        to: 'habitica_users.id',
      },
    },
  };
}