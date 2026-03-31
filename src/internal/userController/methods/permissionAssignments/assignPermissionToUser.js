import { transaction } from 'objection';
import Permission from 'knex/models/Permission';
import User from 'knex/models/User';
import { getAndValidateUser } from '../../userHelpers/getAndValidateUser';
import { allowByPermissions } from '../allowByPermissions';


export async function assignPermissionToUser(config, req, res) {
  const { userId, permissionName, hasFullAccess } = config;

  const permission = await Permission.query()
    .where('name', permissionName.toLowerCase())
    .first()
    .catch((err) => { throw [ err, 'assignPermissionToUser.findPermission' ]; });

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

  const user = await getAndValidateUser(userId, req, res);
  if (!user) {
    return false;
  }

  return await transaction(User.knex(), async (trx) => {
    const existingPermission = await user.$relatedQuery('permissions', trx)
      .findById(permission.id);

    if (existingPermission) {
      if (res) {
        res.status(400);
        res.json({
          status: 'PERMISSION_ALREADY_ASSIGNED_TO_USER',
          message: 'This user already has the specified permission.',
        });
      }
      return false;
    }

    await user.$relatedQuery('permissions', trx).relate(permission.id);
    return true;
  });
}