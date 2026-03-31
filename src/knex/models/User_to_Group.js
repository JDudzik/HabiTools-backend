import { Model } from 'objection';

export default class User_to_Group extends Model {
  static tableName = 'users_to_groups';

  static jsonSchema = {
    type: 'object',
    required: [ 'user_id', 'group_id' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      user_id: { type: 'string' },
      group_id: { type: 'string' },
    },
  };
}
