import { User } from '../models/user.model.js';
import { hashPassword, verifyPassword, hashToken } from '../utils/crypto.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';

// Pre-computed dummy argon2 hash for timing attack mitigation when user is not found
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ1Njc4OTAxMg$dGVzdGhhc2h2YWx1ZTEyMzQ1Njc4OTA';

export const authService = {
  async register({ email, password, ip = '', userAgent = '' }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError(
        'An account with this email address already exists',
        [],
        'EMAIL_ALREADY_EXISTS'
      );
    }

    const passwordHash = await hashPassword(password);
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken.token);

    const user = new User({
      email,
      passwordHash,
      role: 'USER', // Always default to USER, never accept role from registration payload
      refreshTokens: [
        {
          tokenHash,
          expiresAt: refreshToken.expiresAt,
          ip,
          userAgent,
        },
      ],
    });

    await user.save();

    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user,
      accessToken,
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt,
    };
  },

  async login({ email, password, ip = '', userAgent = '' }) {
    const user = await User.findOne({ email });

    if (!user) {
      // Execute dummy verify to avoid timing attack leakage of user existence
      await verifyPassword(DUMMY_HASH, password);
      throw new UnauthorizedError('Invalid email or password', [], 'INVALID_CREDENTIALS');
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password', [], 'INVALID_CREDENTIALS');
    }

    if (user.isDisabled) {
      throw new ForbiddenError(
        'This account has been disabled. Please contact an administrator.',
        [],
        'ACCOUNT_DISABLED'
      );
    }

    // Clean up expired tokens
    const now = new Date();
    user.refreshTokens = user.refreshTokens.filter((t) => t.expiresAt > now);

    // Generate new refresh token with rotation
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken.token);

    user.refreshTokens.push({
      tokenHash,
      expiresAt: refreshToken.expiresAt,
      ip,
      userAgent,
    });

    await user.save();

    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user,
      accessToken,
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt,
    };
  },

  async rotateRefreshToken({ rawRefreshToken, ip = '', userAgent = '' }) {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token required', [], 'UNAUTHORIZED');
    }

    const incomingHash = hashToken(rawRefreshToken);
    const user = await User.findOne({ 'refreshTokens.tokenHash': incomingHash });

    if (!user) {
      throw new UnauthorizedError('Invalid or revoked refresh token', [], 'INVALID_REFRESH_TOKEN');
    }

    if (user.isDisabled) {
      throw new ForbiddenError(
        'This account has been disabled. Please contact an administrator.',
        [],
        'ACCOUNT_DISABLED'
      );
    }

    const tokenRecord = user.refreshTokens.find((t) => t.tokenHash === incomingHash);
    const now = new Date();

    if (!tokenRecord || tokenRecord.expiresAt < now) {
      // Remove expired token
      user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== incomingHash);
      await user.save();
      throw new UnauthorizedError('Refresh token has expired', [], 'TOKEN_EXPIRED');
    }

    // Token rotation: remove old token and issue fresh token
    user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== incomingHash);

    const newRefreshToken = generateRefreshToken();
    user.refreshTokens.push({
      tokenHash: hashToken(newRefreshToken.token),
      expiresAt: newRefreshToken.expiresAt,
      ip,
      userAgent,
    });

    await user.save();

    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user,
      accessToken,
      newRefreshToken: newRefreshToken.token,
      refreshTokenExpiresAt: newRefreshToken.expiresAt,
    };
  },

  async logout({ rawRefreshToken }) {
    if (!rawRefreshToken) {
      return;
    }

    const tokenHash = hashToken(rawRefreshToken);
    await User.updateOne(
      { 'refreshTokens.tokenHash': tokenHash },
      { $pull: { refreshTokens: { tokenHash } } }
    );
  },

  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', [], 'NOT_FOUND');
    }
    if (user.isDisabled) {
      throw new ForbiddenError(
        'This account has been disabled. Please contact an administrator.',
        [],
        'ACCOUNT_DISABLED'
      );
    }
    return user;
  },
};
