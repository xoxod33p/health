import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export interface PasswordHashResult {
  passwordHash: string;
  salt: string;
}

export function hashPassword(password: string, providedSalt?: string): PasswordHashResult {
  const salt = providedSalt ?? randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return {
    passwordHash: derivedKey.toString('hex'),
    salt,
  };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { passwordHash } = hashPassword(password, salt);
  const hashBuffer = Buffer.from(hash, 'hex');
  const passwordBuffer = Buffer.from(passwordHash, 'hex');
  if (hashBuffer.length !== passwordBuffer.length) return false;
  return timingSafeEqual(hashBuffer, passwordBuffer);
}
