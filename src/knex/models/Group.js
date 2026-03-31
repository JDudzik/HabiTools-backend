import { Model } from 'objection';

export default class Group extends Model {
  static tableName = 'groups';

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
    permissions: {
      relation: Model.ManyToManyRelation,
      modelClass: `${ __dirname }/Permission`,
      join: {
        from: 'groups.id',
        through: {
          from: 'groups_to_permissions.group_id',
          to: 'groups_to_permissions.permission_id',
        },
        to: 'permissions.id',
      },
    },
  };
}
