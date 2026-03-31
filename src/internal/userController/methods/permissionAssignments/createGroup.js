import Group from 'knex/models/Group';


export async function createGroup(config, _req, res) {
  const { groupName, description, isDeletable, permissionRequiredForAssignment } = config;
  const normalizedGroupName = groupName?.toLowerCase();

  const existingGroup = await Group.query()
    .where('name', normalizedGroupName)
    .first()
    .catch((err) => { throw [ err, 'createGroup.findExisting' ]; });

  if (existingGroup) {
    if (res) {
      res.status(409);
      res.json({
        status: 'GROUP_ALREADY_EXISTS',
        message: 'The group provided already exists',
      });
    }
    return false;
  }

  return await Group.query()
    .insertAndFetch({
      created_at: Date.now(),
      name: normalizedGroupName,
      description: description || '',
      is_deletable: isDeletable !== undefined ? isDeletable : true,
      permission_required_for_assignment: permissionRequiredForAssignment || null,
    })
    .catch((err) => { throw [ err, 'createGroup.insert' ]; });
}