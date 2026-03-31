import jwt from 'jwt-simple';
import { expiresIn } from './expiresIn';


export function calculateToken(user) {
  const expires = expiresIn(30);
  const token = jwt.encode({
    exp: expires,
  }, process.env.TOKEN_SALT + user.email.toLowerCase() + user.password.password_hash);

  return {
    token,
    expires,
  };
}