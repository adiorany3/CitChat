import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function key() {
  const secret = process.env.APP_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw new Error('APP_SECRET must be 64 hexadecimal characters');
  return Buffer.from(secret, 'hex');
}

export function seal(value, purpose) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(purpose));
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}

export function open(value, purpose) {
  const data = Buffer.from(value, 'base64url');
  const cipher = createDecipheriv('aes-256-gcm', key(), data.subarray(0, 12));
  cipher.setAAD(Buffer.from(purpose));
  cipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString());
}

export function roomKey(room) {
  if (typeof room !== 'string' || !/^[a-zA-Z0-9_-]{3,64}$/.test(room)) throw new Error('Room must contain 3–64 letters, numbers, underscores or hyphens');
  return createHash('sha256').update(room).digest('hex');
}

export function username(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 32 || /[\x00-\x1f\x7f]/.test(value)) throw new Error('Username must contain 1–32 printable characters');
  return value.trim();
}

export function message(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) throw new Error('Message must contain 1–2000 characters');
  return value.trim();
}
