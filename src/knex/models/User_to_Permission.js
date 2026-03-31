import { Model } from 'objection';

export default class User_to_Permission extends Model {
  static tableName = 'users_to_permissions';

  static jsonSchema = {
    type: 'object',
    required: [ 'user_id', 'permission_id' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      user_id: { type: 'string' },
      permission_id: { type: 'string' },
    },
  };
}
