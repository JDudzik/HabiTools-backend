import { transaction } from 'objection';
import User from 'knex/models/User';
import { getAndValidateUser } from '../../userHelpers/getAndValidateUser';
import Group from 'knex/models/Group';
import { allowByPermissions } from '../allowByPermissions';


export async function unassignGroupFromUser(config, req, res) {
  const { userId, groupName, hasFullAccess } = config;

  const normalizedGroupName = groupName?.toLowerCase();

  const group = await Group.query()
    .where('name', normalizedGroupName)
    .first()
    .catch((err) => { throw [ err, 'unassignGroupFromUser.findGroup' ]; });

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

  if (!hasFullAccess && group.permission_required_for_assignment) {
    const allowed = await allowByPermissions(req, res, group.permission_required_for_assignment);
    if (!allowed) { return false; }
  }

  const user = await getAndValidateUser(userId, req, res);
  if (!user) {
    return false;
  }

  return await transaction(User.knex(), async (trx) => {
    const existingGroup = await user.$relatedQuery('groups', trx)
      .where('name', normalizedGroupName)
      .first();

    if (!existingGroup) {
      if (res) {
        res.status(404);
        res.json({
          status: 'GROUP_NOT_ASSIGNED_TO_USER',
          message: 'This user does not have the specified group.',
        });
      }
      return false;
    }

    await user.$relatedQuery('groups', trx)
      .unrelate()
      .where('name', normalizedGroupName);

    return true;
  });
}
