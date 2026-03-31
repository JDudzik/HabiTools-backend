import { sanitizeProperties, allowValidUUID, getLoggedInUser } from 'utils';
import {
  allowByPermissions,
  permissionsCheck,
  assignGroupToUser,
  assignPermissionToGroup,
  assignPermissionToUser,
  createGroup as createGroupMethod,
  createPermission as createPermissionMethod,
  deleteGroup as deleteGroupMethod,
  deletePermission as deletePermissionMethod,
  getGroups as getGroupsMethod,
  getPermissions as getPermissionsMethod,
  unassignGroupFromUser,
  unassignPermission,
  unassignPermissionFromGroup,
} from 'internal/userController';

const FULL_ACCESS_PERMISSIONS = [
  'super_admin_permission_control',
  'admin_permission_composition',
];

const FULL_ASSIGNMENT_PERMISSIONS = [
  ...FULL_ACCESS_PERMISSIONS,
  'admin_permission_assignment',
];

const VIEW_ACCESS_PERMISSIONS = [
  ...FULL_ASSIGNMENT_PERMISSIONS,
  'access_permissions_view', 
];


const adminPermissionControls = {
  // ///////////// //
  // Group Methods //
  // ////////////////


  // Get Groups
  //
  // -- GET --
  // {API_URL}/v1/auth/users/admin/get_groups
  // -- PARAMS --
  // search_text: String (optional)
  getGroups: async (req, res) => {
    const allowed = await allowByPermissions(req, res, VIEW_ACCESS_PERMISSIONS, 'oneOf');
    if (!allowed) { return; }

    const userEmail = await getLoggedInUser(req, [ 'email' ]);

    const sanitizedPayload = sanitizeProperties(req.query, {
      optionalKeys: [ 'search_text' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { search_text } = sanitizedPayload.properties;
    const groups = await getGroupsMethod({
      searchText: search_text,
      userEmail,
      hasFullAccess: await permissionsCheck.oneOf(req, FULL_ASSIGNMENT_PERMISSIONS),
    });

    return res.send(groups);
  },


  // Create Group
  //
  // -- POST --
  // {API_URL}/v1/auth/users/admin/create_group
  // -- PARAMS --
  // group_name: String,
  // description: String (optional)
  // is_deletable: Boolean (optional, defaults to true)
  // permission_required_for_assignment: String (optional)
  createGroup: async (req, res) => {
    const allowed = await allowByPermissions(req, res, FULL_ACCESS_PERMISSIONS, 'oneOf');

    if (!allowed) { return; }

    const sanitizedPayload = sanitizeProperties(req.body, {
      requiredKeys: [ 'group_name' ],
      optionalKeys: [ 'description', 'is_deletable', 'permission_required_for_assignment' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { group_name, description, is_deletable, permission_required_for_assignment } = sanitizedPayload.properties;
    const created = await createGroupMethod({
      groupName: group_name,
      description,
      isDeletable: is_deletable,
      permissionRequiredForAssignment: permission_required_for_assignment,
      hasFullAccess: await permissionsCheck.oneOf(req, FULL_ASSIGNMENT_PERMISSIONS),
    }, req, res);
    if (!created) { return; }

    return res.send(created);
  },


  // Delete Group
  //
  // -- DELETE --
  // {API_URL}/v1/auth/users/admin/delete_group
  // -- PARAMS --
  // group_name: String
  deleteGroup: async (req, res) => {
    const allowed = await allowByPermissions(req, res, FULL_ACCESS_PERMISSIONS, 'oneOf');
    if (!allowed) { return; }

    const sanitizedPayload = sanitizeProperties(req.body, {
      requiredKeys: [ 'group_name' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { group_name } = sanitizedPayload.properties;
    const success = await deleteGroupMethod(group_name, req, res);
    if (!success) { return; }

    return res.send('success');
  },


  // Assign Group To User
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/admin/assign_group_to_user
  // -- PARAMS --
  // id: UUID
  // group_name: String
  assignGroupToUser: async (req, res) => {
    const allowed = await allowByPermissions(req, res, VIEW_ACCESS_PERMISSIONS, 'oneOf');
    if (!allowed) { return; }

    const sanitizedPayload = sanitizeProperties(req.body, {
      requiredKeys: [ 'id', 'group_name' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { id, group_name } = sanitizedPayload.properties;
    if (!allowValidUUID(id, req, res)) { return; }

    const success = await assignGroupToUser({
      userId: id,
      groupName: group_name,
      hasFullAccess: await permissionsCheck.oneOf(req, FULL_ASSIGNMENT_PERMISSIONS),
    }, req, res);
    if (!success) { return; }

    return res.send('success');
  },


  // Unassign Group From User
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/admin/unassign_group_from_user
  // -- PARAMS --
  // id: UUID
  // group_name: String
  unassignGroupFromUser: async (req, res) => {
    const allowed = await allowByPermissions(req, res, VIEW_ACCESS_PERMISSIONS, 'oneOf');
    if (!allowed) { return; }

    const sanitizedPayload = sanitizeProperties(req.body, {
      requiredKeys: [ 'id', 'group_name' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { id, group_name } = sanitizedPayload.properties;
    if (!allowValidUUID(id, req, res)) { return; }

    const success = await unassignGroupFromUser({
      userId: id,
      groupName: group_name,
      hasFullAccess: await permissionsCheck.oneOf(req, FULL_ASSIGNMENT_PERMISSIONS),
    }, req, res);
    if (!success) { return; }

    return res.send('success');
  },


  // Assign Permission To Group
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/admin/assign_permission_to_group
  // -- PARAMS --
  // group_name: String
  // permission_name: String
  assignPermissionToGroup: async (req, res) => {
    const allowed = await allowByPermissions(req, res, VIEW_ACCESS_PERMISSIONS, 'oneOf');
    if (!allowed) { return; }

    const sanitizedPayload = sanitizeProperties(req.body, {
      requiredKeys: [ 'group_name', 'permission_name' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { group_name, permission_name } = sanitizedPayload.properties;
    const success = await assignPermissionToGroup({
      groupName: group_name,
      permissionName: permission_name,
      hasFullAccess: await permissionsCheck.oneOf(req, FULL_ASSIGNMENT_PERMISSIONS),
    }, req, res);
    if (!success) { return; }

    return res.send('success');
  },


  // Unassign Permission From Group
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/admin/unassign_permission_from_group
  // -- PARAMS --
  // group_name: String
  // permission_name: String
  unassignPermissionFromGroup: async (req, res) => {
    const allowed = await allowByPermissions(req, res, VIEW_ACCESS_PERMISSIONS, 'oneOf');
    if (!allowed) { return; }

    const sanitizedPayload = sanitizeProperties(req.body, {
      requiredKeys: [ 'group_name', 'permission_name' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { group_name, permission_name } = sanitizedPayload.properties;
    const success = await unassignPermissionFromGroup({
      groupName: group_name,
      permissionName: permission_name,
      hasFullAccess: await permissionsCheck.oneOf(req, FULL_ASSIGNMENT_PERMISSIONS),
    }, req, res);
    if (!success) { return; }

    return res.send('success');
  },



  // ////////////////// //
  // Permission Methods //
  // ////////////////// //


  // Get Permissions
  //
  // -- GET --
  // {API_URL}/v1/auth/users/admin/get_permissions
  // -- PARAMS --
  // search_text: String (optional)
  getPermissions: async (req, res) => {
    const allowed = await allowByPermissions(req, res, VIEW_ACCESS_PERMISSIONS, 'oneOf');
    if (!allowed) { return; }

    const userEmail = await getLoggedInUser(req, [ 'email' ]);

    const sanitizedPayload = sanitizeProperties(req.query, {
      optionalKeys: [ 'search_text' ],
      trimPayload: true,
      removeDisallowedKeys: true,
      hasFullAccess: await permissionsCheck.oneOf(req, FULL_ASSIGNMENT_PERMISSIONS),
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { search_text } = sanitizedPayload.properties;
    const permissions = await getPermissionsMethod({
      searchText: search_text,
      userEmail,
    });

    return res.send(permissions);
  },


  // Create Permission
  //
  // -- POST --
  // {API_URL}/v1/auth/users/admin/create_permission
  // -- PARAMS --
  // permission_name: String,
  // description: String (optional)
  // is_deletable: Boolean (optional, defaults to true)
  // permission_required_for_assignment: String (optional)
  createPermission: async (req, res) => {
    const allowed = await allowByPermissions(req, res, FULL_ACCESS_PERMISSIONS, 'oneOf');
    if (!allowed) { return; }

    const sanitizedPayload = sanitizeProperties(req.body, {
      requiredKeys: [ 'permission_name' ],
      optionalKeys: [ 'description', 'is_deletable', 'permission_required_for_assignment' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { permission_name, description, is_deletable, permission_required_for_assignment } = sanitizedPayload.properties;
    const created = await createPermissionMethod({
      permissionName: permission_name,
      description,
      isDeletable: is_deletable,
      permissionRequiredForAssignment: permission_required_for_assignment,
    }, req, res);
    if (!created) { return; }

    return res.send(created);
  },


  // Delete Permission
  //
  // -- DELETE --
  // {API_URL}/v1/auth/users/admin/delete_permission
  // -- PARAMS --
  // permission_name: String
  deletePermission: async (req, res) => {
    const allowed = await allowByPermissions(req, res, FULL_ACCESS_PERMISSIONS, 'oneOf');
    if (!allowed) { return; }

    const sanitizedPayload = sanitizeProperties(req.body, {
      requiredKeys: [ 'permission_name' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { permission_name } = sanitizedPayload.properties;
    const success = await deletePermissionMethod(permission_name, req, res);
    if (!success) { return; }

    return res.send('success');
  },


  // Assign Permission To User
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/admin/assign_permission_to_user
  // -- PARAMS --
  // id: UUID
  // permission_name: String
  assignPermissionToUser: async (req, res) => {
    const allowed = await allowByPermissions(req, res, VIEW_ACCESS_PERMISSIONS, 'oneOf');
    if (!allowed) { return; }

    const sanitizedPayload = sanitizeProperties(req.body, {
      requiredKeys: [ 'id', 'permission_name' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { id, permission_name } = sanitizedPayload.properties;
    if (!allowValidUUID(id, req, res)) { return; }

    const success = await assignPermissionToUser({
      userId: id,
      permissionName: permission_name,
      hasFullAccess: await permissionsCheck.oneOf(req, FULL_ASSIGNMENT_PERMISSIONS),
    }, req, res);
    if (!success) { return; }

    return res.send('success');
  },


  // Unassign Permission From User
  //
  // -- PUT --
  // {API_URL}/v1/auth/users/admin/unassign_permission_from_user
  // -- PARAMS --
  // id: UUID
  // permission_name: String
  unassignPermissionFromUser: async (req, res) => {
    const allowed = await allowByPermissions(req, res, VIEW_ACCESS_PERMISSIONS, 'oneOf');
    if (!allowed) { return; }

    const sanitizedPayload = sanitizeProperties(req.body, {
      requiredKeys: [ 'id', 'permission_name' ],
      trimPayload: true,
      removeDisallowedKeys: true,
    }, req, res);
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

    const { id, permission_name } = sanitizedPayload.properties;
    if (!allowValidUUID(id, req, res)) { return; }

    const success = await unassignPermission({
      userId: id,
      permissionName: permission_name,
      hasFullAccess: await permissionsCheck.oneOf(req, FULL_ASSIGNMENT_PERMISSIONS),
    }, req, res);
    if (!success) { return; }

    return res.send('success');
  },
};


module.exports = adminPermissionControls;