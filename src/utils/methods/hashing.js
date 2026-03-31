const crypto = require('crypto');

export function sha512(input, salt = process.env.TOKEN_SALT) {
  const method = 'sha512';
  const digestType = 'hex';

  try {
    return crypto
      .createHmac(method, salt)
      .update(input)
      .digest(digestType);
  } catch {
    return undefined;
  }
}
