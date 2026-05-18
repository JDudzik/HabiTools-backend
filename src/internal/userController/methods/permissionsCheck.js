import Permission from 'knex/models/Permission';
import { getLoggedInUser } from '../userHelpers/getLoggedInUser';
import { fetchUsersPermissions } from '../permissionHelpers';


const normalizePermissions = (permissions) => {
  const list = Array.isArray(permissions) ? permissions : [ permissions ];
  return list
    .filter(Boolean)
    .map(permission => permission.toLowerCase());
};

const debugValidatePermissionsExist = async (permissions) => {
  if (process.env.NODE_ENV !== 'development' || permissions.length <= 0) {
    return;
  }

  const distinctPermissions = [ ...new Set(permissions) ];
  const existingPermissions = await Permission.query()
    .whereIn('name', distinctPermissions)
    .select('name');
  const existingPermissionNames = existingPermissions.map(permission => permission.name);
  const missingPermissions = distinctPermissions.filter(permission => !existingPermissionNames.includes(permission));

  if (missingPermissions.length > 0) {
    throw new Error(`Attempting to check for permission(s): "${ missingPermissions.join(', ') }", but they do not exist in the database`);
  }
};

const getAllUserPermissions = async (req) => {
  const userEmail = await getLoggedInUser(req, [ 'email' ]);
  return fetchUsersPermissions(userEmail, 'email');
};


export const permissionsCheck = {
  has: async (req, requestedPermission) => {
    const [ finalPermission ] = normalizePermissions(requestedPermission);
    await debugValidatePermissionsExist([ finalPermission ]);

    const allPermissions = await getAllUserPermissions(req);
    return allPermissions.includes(finalPermission);
  },

  oneOf: async (req, requestedPermissions) => {
    const finalPermissions = normalizePermissions(requestedPermissions);
    await debugValidatePermissionsExist(finalPermissions);

    const allPermissions = await getAllUserPermissions(req);
    return finalPermissions.some(permission => allPermissions.includes(permission));
  },

  allOf: async (req, requestedPermissions) => {
    const finalPermissions = normalizePermissions(requestedPermissions);
    await debugValidatePermissionsExist(finalPermissions);

    const allPermissions = await getAllUserPermissions(req);
    return finalPermissions.every(permission => allPermissions.includes(permission));
  },

  hasNot: async (req, requestedPermission) => {
    const hasPermission = await permissionsCheck.has(req, requestedPermission);
    return !hasPermission;
  },
};
