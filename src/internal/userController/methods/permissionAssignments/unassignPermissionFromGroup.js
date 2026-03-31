import { transaction } from 'objection';
import Group from 'knex/models/Group';
import Permission from 'knex/models/Permission';
import { allowByPermissions } from '../allowByPermissions';


export async function unassignPermissionFromGroup(config, req, res) {
  const { groupName, permissionName, hasFullAccess } = config;

  const normalizedGroupName = groupName?.toLowerCase();
  const normalizedPermissionName = permissionName?.toLowerCase();

  const group = await Group.query()
    .where('name', normalizedGroupName)
    .first()
    .catch((err) => { throw [ err, 'unassignPermissionFromGroup.findGroup' ]; });

  if (!group) {
    if (res) {
      res.status(404);
      res.json({
        status: 'NO_GROUP_NAME',
        message: 'The group provided does not exist',
      });
    }
    return false;
  }

  const permission = await Permission.query()
    .where('name', normalizedPermissionName)
    .first()
    .catch((err) => { throw [ err, 'unassignPermissionFromGroup.findPermission' ]; });

  if (!permission) {
    if (res) {
      res.status(404);
      res.json({
        status: 'NO_PERMISSION_NAME',
        message: 'The permission provided does not exist',
      });
    }
    return false;
  }

  if (!hasFullAccess && permission.permission_required_for_assignment) {
    const allowed = await allowByPermissions(req, res, permission.permission_required_for_assignment);
    if (!allowed) { return false; }
  }

  return await transaction(Group.knex(), async (trx) => {
    const existingPermission = await group.$relatedQuery('permissions', trx)
      .where('name', normalizedPermissionName)
      .first();

    if (!existingPermission) {
      if (res) {
        res.status(404);
        res.json({
          status: 'PERMISSION_NOT_ASSIGNED_TO_GROUP',
          message: 'This group does not have the specified permission.',
        });
      }
      return false;
    }

    await group.$relatedQuery('permissions', trx)
      .unrelate()
      .where('name', normalizedPermissionName);

    return true;
  });
}