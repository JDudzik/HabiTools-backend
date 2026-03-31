import Group from 'knex/models/Group';
import User from 'knex/models/User';
import { transaction } from 'objection';
import { getAndValidateUser } from '../../userHelpers/getAndValidateUser';
import { allowByPermissions } from '../allowByPermissions';


export async function assignGroupToUser(config, req, res) {
  const { userId, groupName, hasFullAccess } = config;

  const group = await Group.query()
    .where('name', groupName.toLowerCase())
    .first()
    .catch((err) => { throw [ err, 'assignGroupToUser.findGroup' ]; });

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
      .findById(group.id);

    if (existingGroup) {
      if (res) {
        res.status(400);
        res.json({
          status: 'GROUP_ALREADY_ASSIGNED_TO_USER',
          message: 'This user already has the specified group.',
        });
      }
      return false;
    }

    await user.$relatedQuery('groups', trx).relate(group.id);
    return true;
  }); 
}