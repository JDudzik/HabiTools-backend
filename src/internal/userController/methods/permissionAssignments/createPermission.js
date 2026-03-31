import Permission from 'knex/models/Permission';


export async function createPermission(config, _req, res) {
  const { permissionName, description, isDeletable, permissionRequiredForAssignment } = config;
  const normalizedPermissionName = permissionName?.toLowerCase();

  const existingPermission = await Permission.query()
    .where('name', normalizedPermissionName)
    .first()
    .catch((err) => { throw [ err, 'createPermission.findExisting' ]; });

  if (existingPermission) {
    if (res) {
      res.status(409);
      res.json({
        status: 'PERMISSION_ALREADY_EXISTS',
        message: 'The permission provided already exists',
      });
    }
    return false;
  }

  return await Permission.query()
    .insertAndFetch({
      created_at: Date.now(),
      name: normalizedPermissionName,
      description: description || '',
      is_deletable: isDeletable !== undefined ? isDeletable : true,
      permission_required_for_assignment: permissionRequiredForAssignment || null,
    })
    .catch((err) => { throw [ err, 'createPermission.insert' ]; });
}