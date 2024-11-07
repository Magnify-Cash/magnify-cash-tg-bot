import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATION = 65535;
const ENCRYPTED_POSITION = SALT_LENGTH + IV_LENGTH;

export class GCM {
  constructor(private secret: string) {}

  getKey(salt: Buffer) {
    return crypto.pbkdf2Sync(
      this.secret,
      salt,
      ITERATION,
      KEY_LENGTH,
      'sha512',
    );
  }

  encrypt(plainText: string) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    const key = this.getKey(salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(String(plainText), 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, encrypted, tag]).toString('base64');
  }

  decrypt(cipherText: string) {
    const stringValue = Buffer.from(String(cipherText), 'base64');

    const salt = stringValue.slice(0, SALT_LENGTH);
    const iv = stringValue.slice(SALT_LENGTH, ENCRYPTED_POSITION);
    const encrypted = stringValue.slice(
      ENCRYPTED_POSITION,
      stringValue.length - TAG_LENGTH,
    );
    const tag = stringValue.slice(-TAG_LENGTH);

    const key = this.getKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
