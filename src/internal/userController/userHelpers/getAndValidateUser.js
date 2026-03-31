import User from 'knex/models/User';
import {
  handleApiAnalytic,
  allowValidUUID,
} from 'utils';


export async function getAndValidateUser(userId, req, res) {
  if (!allowValidUUID(userId, req, res)) { return; }

  const user = await User.query()
    .where('id', userId)
    .first();

  if (!user) {
    if (res) {
      res.status(404);
      res.json({
        status: 'NO_USER_ID',
        message: 'There is no user matching the provided ID',
      });
    }

    return false;
  }

  if (user.disabled_at) {
    handleApiAnalytic(req, 'failed_assigning_permission', `userId ${ userId } is disabled`, { userId });
    if (res) {
      res.status(410);
      res.json({
        'status': 'USER_IS_DISABLED',
        'message': 'This user\'s account has been disabled',
      });
    }
    return false;
  }
  return user;
}