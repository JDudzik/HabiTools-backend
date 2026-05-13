import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_BYTES = 32;
const IV_BYTES = 12;
const KEY_BYTES = 32;


const deriveKey = (salt) => {
  const masterSecret = process.env.HABITICA_ENCRYPTION_SECRET;
  if (typeof masterSecret !== 'string' || masterSecret.trim() === '') {
    throw [
      new Error('Missing required env var HABITICA_ENCRYPTION_SECRET for Habitica credential encryption'),
      'habiticaEncryption.deriveKey',
    ];
  }

  return crypto
    .createHmac('sha256', masterSecret)
    .update(salt).digest()
    .slice(0, KEY_BYTES);
};


// Encrypts a plaintext string using AES-256-GCM with a per-record derived key.
// Returns a colon-delimited hex string: salt:iv:authTag:ciphertext
const encrypt = (plaintext) => {
  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([ cipher.update(plaintext, 'utf8'), cipher.final() ]);
  const authTag = cipher.getAuthTag();

  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
};


// Decrypts a colon-delimited hex string produced by encryptHabiticaApiKey.
const decrypt = (encryptedString) => {
  const parts = encryptedString.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted API key format');
  }

  const [ saltHex, ivHex, authTagHex, ciphertextHex ] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const key = deriveKey(salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([ decipher.update(ciphertext), decipher.final() ]).toString('utf8');
};


export const habiticaEncryption = {
  encrypt,
  decrypt,
};