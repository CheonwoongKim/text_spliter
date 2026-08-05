import "server-only";

import crypto from 'crypto';

const rawEncryptionKey = process.env.ENCRYPTION_KEY || '';

if (Buffer.byteLength(rawEncryptionKey, 'utf8') < 32) {
  throw new Error('ENCRYPTION_KEY must contain at least 32 bytes');
}

const ALGORITHM = 'aes-256-gcm';
const KEY = crypto.createHash('sha256').update(rawEncryptionKey, 'utf8').digest();
const LEGACY_KEY = Buffer.from(rawEncryptionKey, 'utf8').subarray(0, 32);

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `v2:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  if (text.startsWith('v2:')) {
    const [, ivHex, authTagHex, encryptedText] = text.split(':');
    if (!ivHex || !authTagHex || encryptedText === undefined) {
      throw new Error('Invalid encrypted value format');
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      KEY,
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Backward compatibility for values written before authenticated encryption.
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  if (!encryptedText) throw new Error('Invalid legacy encrypted value format');
  const decipher = crypto.createDecipheriv('aes-256-cbc', LEGACY_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
