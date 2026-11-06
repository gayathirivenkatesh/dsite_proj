import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || config.RATE_LIMIT_WINDOW_MS;
  const max = options.max || config.RATE_LIMIT_MAX;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.NODE_ENV === 'test', // Allow high concurrency in automated tests
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
          details: [],
        },
      });
    },
    ...options,
  });
}

export const generalRateLimiter = createRateLimiter();
