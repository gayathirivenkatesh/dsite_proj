import crypto from 'crypto';
import argon2 from 'argon2';

/**
 * Hash plain password using argon2 with recommended OWASP settings.
 */
export async function hashPassword(plainPassword) {
  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verify plain password against an argon2 hash.
 */
export async function verifyPassword(hash, plainPassword) {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically secure random token (URL-safe hex string).
 */
export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Compute SHA-256 hash of a token for secure database storage.
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

