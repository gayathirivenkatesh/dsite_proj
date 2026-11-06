import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';

let server;

async function startServer() {
  try {
    await connectDB();

    const app = createApp();

    server = app.listen(config.PORT, () => {
      logger.info(`Vault API Server running on port ${config.PORT}`, {
        env: config.NODE_ENV,
        port: config.PORT,
      });
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Gracefully shutting down...`);
      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed');
          await disconnectDB();
          process.exit(0);
        });
      } else {
        await disconnectDB();
        process.exit(0);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { startServer };
