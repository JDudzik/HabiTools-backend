import User from 'knex/models/User';
import { transaction } from 'objection';
import { getAndValidateUser } from '../../userHelpers/getAndValidateUser';
import Permission from 'knex/models/Permission';
import { allowByPermissions } from '../allowByPermissions';


export async function unassignPermission(config, req, res) {
  const { userId, permissionName, hasFullAccess } = config;

  const user = await getAndValidateUser(userId, req, res);
  if (!user) {
    return false;
  }

  const normalizedPermissionName = permissionName?.toLowerCase();

  const permission = await Permission.query()
    .where('name', normalizedPermissionName)
    .first()
    .catch((err) => { throw [ err, 'unassignPermission.findPermission' ]; });

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

  return await transaction(User.knex(), async (trx) => {
    const existingPermission = await user.$relatedQuery('permissions', trx)
      .where('name', normalizedPermissionName)
      .first();

    if (!existingPermission) {
      if (res) {
        res.status(404);
        res.json({
          status: 'PERMISSION_NOT_ASSIGNED_TO_USER',
          message: 'This user does not have the specified permission.',
        });
      }
      return false;
    }

    await user.$relatedQuery('permissions', trx)
      .unrelate()
      .where('name', normalizedPermissionName);

    return true;
  });
}