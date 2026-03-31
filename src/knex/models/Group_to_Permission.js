import { Model } from 'objection';

export default class Group_to_Permission extends Model {
  static tableName = 'groups_to_permissions';

  static jsonSchema = {
    type: 'object',
    required: [ 'group_id', 'permission_id' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      group_id: { type: 'string' },
      permission_id: { type: 'string' },
    },
  };
}
