import Permission from 'knex/models/Permission';


export async function deletePermission(permissionName, _req, res) {
  const normalizedPermissionName = permissionName?.toLowerCase();

  const existingPermission = await Permission.query()
    .where('name', normalizedPermissionName)
    .first()
    .catch((err) => { throw [ err, 'deletePermission.findExisting' ]; });

  if (!existingPermission) {
    if (res) {
      res.status(404);
      res.json({
        status: 'NO_PERMISSION_NAME',
        message: 'The permission provided does not exist',
      });
    }
    return false;
  }

  if (existingPermission.is_deletable === false) {
    if (res) {
      res.status(403);
      res.json({
        status: 'PERMISSION_NOT_DELETABLE',
        message: 'This permission cannot be deleted',
      });
    }
    return false;
  }

  await Permission.query()
    .deleteById(existingPermission.id)
    .catch((err) => { throw [ err, 'deletePermission.deleteById' ]; });

  return true;
}