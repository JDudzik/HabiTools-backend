import { uniq } from 'lodash';


export function mergedPermissions(userData) {
  if (!userData || !userData.groups || !userData.permissions) {
    throw new Error('Attempting to merge permissions: "userData" object must contain structure of "userData.[groups.permissions, permissions]"');
  }

  const allPermissions = [];
  userData.groups.forEach((group) => {
    group.permissions.forEach((permission) => {
      allPermissions.push(permission.name.toLowerCase());
    });
  });
  userData.permissions.forEach((permission) => {
    allPermissions.push(permission.name.toLowerCase());
  });

  return uniq(allPermissions);
}