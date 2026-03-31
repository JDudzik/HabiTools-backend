import { bruteStopper } from 'utils';

const adminControls = require('./adminControls');
const adminPermissionControls = require('./adminPermissionControls');
const myUser = require('./myUser');


module.exports = (router) => {
  const openPath = '/users';
  const securedPath = '/auth/users';

  // Brute-force prevention
  bruteStopper(router, `${ openPath }/sign_up`, { freeRetries: 4, minWait: 2000 });
  bruteStopper(router, `${ openPath }/reset_password`, { freeRetries: 5, minWait: 300000 });
  bruteStopper(router, `${ openPath }/resend_verify_email`, { freeRetries: 10, minWait: 300000 });
  bruteStopper(router, `${ openPath }/email_available`, { freeRetries: 10, minWait: 300000 });

  // Open routes
  router.get(`${ openPath }/email_available`, myUser.emailAvailable);
  router.post(`${ openPath }/sign_up`, myUser.userSignUp);
  router.put(`${ openPath }/reset_password`, myUser.resetPassword);
  router.post(`${ openPath }/resend_verify_email`, myUser.resendVerifyEmail);


  // ///// Secured routes
  
  // Admin Controls
  router.post(`${ securedPath }/admin/create_user`, adminControls.createUser);
  router.get(`${ securedPath }/admin/search_users`, adminControls.searchUsers);
  router.put(`${ securedPath }/admin/update_user/:id`, adminControls.updateUser);
  router.put(`${ securedPath }/admin/disable_user/:id`, adminControls.disableUser);
  router.put(`${ securedPath }/admin/undisable_user/:id`, adminControls.undisableUser);
  router.put(`${ securedPath }/admin/assign_coach/:id`, adminControls.assignCoach);
  router.put(`${ securedPath }/admin/unassign_coach/:id`, adminControls.unassignCoach);
  router.put(`${ securedPath }/admin/require_password_reset/:id`, adminControls.passwordReset);
  router.delete(`${ securedPath }/admin/delete_user/:id`, adminControls.deleteUser);

  // Admin Permission Controls
  router.post(`${ securedPath }/admin/create_group`, adminPermissionControls.createGroup);
  router.delete(`${ securedPath }/admin/delete_group`, adminPermissionControls.deleteGroup);
  router.post(`${ securedPath }/admin/create_permission`, adminPermissionControls.createPermission);
  router.delete(`${ securedPath }/admin/delete_permission`, adminPermissionControls.deletePermission);
  router.get(`${ securedPath }/admin/get_groups`, adminPermissionControls.getGroups);
  router.get(`${ securedPath }/admin/get_permissions`, adminPermissionControls.getPermissions);
  router.put(`${ securedPath }/admin/assign_group_to_user`, adminPermissionControls.assignGroupToUser);
  router.put(`${ securedPath }/admin/unassign_group_from_user`, adminPermissionControls.unassignGroupFromUser);
  router.put(`${ securedPath }/admin/assign_permission_to_user`, adminPermissionControls.assignPermissionToUser);
  router.put(`${ securedPath }/admin/unassign_permission_from_user`, adminPermissionControls.unassignPermissionFromUser);
  router.put(`${ securedPath }/admin/assign_permission_to_group`, adminPermissionControls.assignPermissionToGroup);
  router.put(`${ securedPath }/admin/unassign_permission_from_group`, adminPermissionControls.unassignPermissionFromGroup);

  // My User
  router.get(`${ securedPath }/get_my_user`, myUser.getMyUser);
  router.put(`${ securedPath }/update_password`, myUser.updateMyPassword);
  router.put(`${ securedPath }/update_my_user`, myUser.updateMyUser);
  router.put(`${ securedPath }/update_my_email`, myUser.updateMyEmail);
  router.delete(`${ securedPath }/delete_my_user`, myUser.deleteMyUser);


  return router;
};
