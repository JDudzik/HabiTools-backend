export function detectUserError(user) {
  // If there is no user object, then either the email or password_hash failed
  if (!user) {
    return {
      'code': 401,
      'status': 'INVALID_CREDENTIALS',
      'message': 'The credentials provided are incorrect',
      'analyticText': 'Invalid Credentials',
    };
  }

  // If the "delete_at" property has a value, then this user has been deleted.
  // TODO: Someday, handling deleted users will have to change pretty heavily...
  // Currently if a user is deleted, they still exist and that email is still reserved.
  // Possibly take deleted users an dump them to a new "deleted_users" table?
  if (user.deleted_at) {
    return {
      'code': 410,
      'status': 'USER_IS_DELETED',
      'message': 'This user\'s account has been removed',
      'analyticText': 'User is Deleted',
    };
  }

  // If this value is undefined or absent, then the user still needs to verify their email.
  // However, it is currently disabled so that users don't have to verify their email before being able to use the application.
  
  // if (!user.has_verified_email) {
  //   return {
  //     'code': 406,
  //     'status': 'UNVERIFIED_EMAIL',
  //     'message': 'The user\'s email has not been verified yet',
  //     'analyticText': 'User has Unverified Email',
  //   };
  // }
}