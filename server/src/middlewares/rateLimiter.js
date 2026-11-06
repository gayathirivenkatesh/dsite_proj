import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || config.RATE_LIMIT_WINDOW_MS;
  const max = options.max || config.RATE_LIMIT_MAX;
  const message = options.message || 'Too many requests, please try again later.';

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => (options.skipInTest !== false ? config.NODE_ENV === 'test' : false),
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          details: [],
        },
      });
    },
    ...options,
  });
}

export const generalRateLimiter = createRateLimiter();

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
});
