import jwt from 'jwt-simple';
import { detectUserError, retrieveUser } from 'internal/userController';
import { handleApiAnalytic } from 'utils';
// import User from 'knex/models/User';


export const validateRequest = async (req, res, next) => {
  // When performing a cross domain request, you will receive
  // a preflighted request first. This is to check if the app
  // is safe.
  // We skip the token auth for [OPTIONS] requests.
  // if(req.method == 'OPTIONS') next();

  const token
    = (req.body && req.body.access_token)
    || (req.query && req.query.access_token)
    || (req.headers && req.headers['x-access-token'])
    || undefined;
  const key
    = (req.body && req.body.x_key)
    || (req.query && req.query.x_key)
    || (req.headers && req.headers['x-key'])
    || undefined;

  if (token && key) {
    try {
      const user = await retrieveUser({
        email: key,
        eager: {
          password: true,
          user_subscriptions: false,
          permissions: false,
        },
      });
      if (!user) {
        res.status(401);
        res.json({
          status: 'BAD_TOKEN_OR_KEY',
          message: 'Token or key provided failed verification',
        });
        return;
      }

      const userError = detectUserError(user);
      if (userError) {
        handleApiAnalytic(req, 'failed_user_authorization', userError.analyticText);
        res.status(userError.code);
        res.json({
          'status': userError.status,
          'message': userError.message,
        });
        return;
      }

      const decoded = jwt.decode(token, process.env.TOKEN_SALT + key.toLowerCase() + user.password.password_hash);

      if (decoded.exp <= Date.now()) {
        handleApiAnalytic(req, 'failed_user_authorization', 'Decoded token was expired');
        res.status(400);
        res.json({
          status: 'TOKEN_EXPIRED',
          message: 'The provided token has expired',
        });
        return;
      }

      return next();
    } catch (err) {
      if (err.message === 'Signature verification failed') {
        handleApiAnalytic(req, 'failed_user_authorization', `validateRequest: token or key provided failed verification: ${ key }`);
        res.status(401);
        res.json({
          status: 'BAD_TOKEN_OR_KEY',
          message: 'Token or key provided failed verification',
        });
      } else {
        res.status(500);
        res.json({
          status: 'UNKNOWN_01',
          message: 'Oops something went wrong',
        });
        throw [ err, 'validateRequest: failed in try-catch', { skipRes: true }];
      }
      return;
    }
  } else {
    handleApiAnalytic(req, 'failed_user_authorization', `Either the token or key was not provided. key: ${ !!key }, token: ${ !!token }`);
    res.status(401);
    res.json({
      status: 'UNPROVIDED_KEY_OR_TOKEN',
      message: 'Key and/or token was not provided',
    });
    return;
  }
};
