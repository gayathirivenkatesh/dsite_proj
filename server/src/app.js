import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { sanitizeInput } from './middlewares/sanitize.js';
import { generalRateLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import apiRoutes from './routes/index.js';
import healthRoutes from './routes/health.routes.js';

export function createApp() {
  const app = express();

  // Disable X-Powered-By header
  app.disable('x-powered-by');

  // Correct trust proxy configuration for reverse proxies (Render, Railway, Docker, Nginx)
  app.set('trust proxy', 1);

  // Security headers with helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // API server; client handled separately
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Parse CORS allowlist from configuration
  const allowedOrigins = config.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body parsers with strict size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parser for refresh token cookies
  app.use(cookieParser());

  // Prevent HTTP Parameter Pollution
  app.use(hpp());

  // NoSQL operator injection sanitization
  app.use(sanitizeInput);

  // Health endpoint at root level
  app.use('/', healthRoutes);

  // General rate limiter on all /api routes
  app.use('/api', generalRateLimiter);

  // Mount API v1 routes
  app.use('/api/v1', apiRoutes);

  // 404 handler for undefined routes
  app.use((req, res, next) => {
    next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // Centralized standard error handler
  app.use(errorHandler);

  return app;
}

