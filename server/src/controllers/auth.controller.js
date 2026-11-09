import { authService } from '../services/auth.service.js';
import { config } from '../config/env.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * When client and server are on different domains (production cross-site),
 * cookies must be SameSite=None; Secure so browsers forward them.
 * Locally (same-origin via Vite proxy, or both on localhost) SameSite=lax works fine.
 */
function getCookieOptions(expiresAt) {
  const isProduction = config.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
    expires: expiresAt,
  };
}

export const authController = {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const { user, accessToken, refreshToken, refreshTokenExpiresAt } = await authService.register(
        {
          name,
          email,
          password,
          ip,
          userAgent,
        }
      );

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions(refreshTokenExpiresAt));

      res.status(201).json({
        user,
        accessToken,
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const { user, accessToken, refreshToken, refreshTokenExpiresAt } = await authService.login({
        email,
        password,
        ip,
        userAgent,
      });

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions(refreshTokenExpiresAt));

      res.status(200).json({
        user,
        accessToken,
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      const ip = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const { accessToken, newRefreshToken, refreshTokenExpiresAt } =
        await authService.rotateRefreshToken({
          rawRefreshToken,
          ip,
          userAgent,
        });

      res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getCookieOptions(refreshTokenExpiresAt));

      res.status(200).json({
        accessToken,
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      await authService.logout({ rawRefreshToken });

      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/api/v1/auth',
      });

      res.status(200).json({
        message: 'Successfully logged out',
      });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      res.status(200).json({
        user,
      });
    } catch (err) {
      next(err);
    }
  },
};
