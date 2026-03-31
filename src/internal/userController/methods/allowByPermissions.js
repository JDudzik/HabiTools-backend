import { handleApiAnalytic } from 'utils';
import { permissionsCheck } from './permissionsCheck';

/**
 * Helper function to check if a user has the necessary permissions to access a route or perform an action. If the user does not have the required permissions, this function will handle the response to the client, so you can simply return after calling this function in those cases.
 * @param {Object} req - The request object from the route handler.
 * @param {Object} res - The response object from the route handler.
 * @param {String|Array} permissions - A permission or list of permissions to check for the user.
 * @param {String} mode - The mode of permission check, can be 'has', 'oneOf', or 'allOf'. Defaults to 'has'.
 * @returns {Boolean} - Returns true if the user has the required permissions, otherwise handles the response and returns undefined.
 */
export async function allowByPermissions(req, res, permissions, mode = 'has') {
  const normalizedPermissions = typeof permissions === 'string' ? [ permissions ] : permissions;
  const accepted = await permissionsCheck[mode](req, normalizedPermissions);
  if (!accepted) {
    handleApiAnalytic(req, 'failed_permission_check', `permissions: ${ normalizedPermissions.join(', ') }, mode: ${ mode }`);
    res.status(401);
    res.json({
      status: 'INADEQUATE_PERMISSION',
      message: 'User does not have adequate permission',
    });
    return;
  }
  return true;
}
