import Group from 'knex/models/Group';


export async function deleteGroup(groupName, _req, res) {
  const normalizedGroupName = groupName?.toLowerCase();

  const existingGroup = await Group.query()
    .where('name', normalizedGroupName)
    .first()
    .catch((err) => { throw [ err, 'deleteGroup.findExisting' ]; });

  if (!existingGroup) {
    if (res) {
      res.status(404);
      res.json({
        status: 'NO_GROUP_NAME',
        message: 'The group provided does not exist',
      });
    }
    return false;
  }

  if (existingGroup.is_deletable === false) {
    if (res) {
      res.status(403);
      res.json({
        status: 'GROUP_NOT_DELETABLE',
        message: 'This group cannot be deleted',
      });
    }
    return false;
  }

  await Group.query()
    .deleteById(existingGroup.id)
    .catch((err) => { throw [ err, 'deleteGroup.deleteById' ]; });

  return true;
}