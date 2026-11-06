import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError } from './errors.js';
import { generateRandomToken } from './crypto.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const FIXED_ALGORITHM = 'HS256';

/**
 * Sign a short-lived access JWT (~15 minutes) with a fixed algorithm.
 */
export function generateAccessToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    },
    config.JWT_SECRET,
    {
      algorithm: FIXED_ALGORITHM,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );
}

/**
 * Verify access JWT strictly enforcing the fixed algorithm.
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET, {
      algorithms: [FIXED_ALGORITHM],
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token has expired', [], 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Invalid authorization token', [], 'INVALID_TOKEN');
  }
}

/**
 * Generate a new random refresh token with expiry timestamp.
 */
export function generateRefreshToken() {
  const token = generateRandomToken(40);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  return {
    token,
    expiresAt,
  };
}
