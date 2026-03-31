import { Model } from 'objection';

export default class Permission extends Model {
  static tableName = 'permissions';

  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'name', 'description' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      created_at: { type: 'integer' },
      deleted_at: { type: [ 'integer', 'null' ]},
      name: { type: 'string', maxLength: 3000 },
      description: { type: 'string', maxLength: 9999 },
      is_deletable: { type: [ 'boolean', 'null' ]},
      permission_required_for_assignment: { type: [ 'string', 'null' ], maxLength: 3000 },
    },
  };

  static relationMappings = {
    groups: {
      relation: Model.ManyToManyRelation,
      modelClass: `${ __dirname }/Group`,
      join: {
        from: 'permissions.id',
        through: {
          from: 'groups_to_permissions.permission_id',
          to: 'groups_to_permissions.group_id',
        },
        to: 'groups.id',
      },
    },
  };
}
