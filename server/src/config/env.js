import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root or server directory if present
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .default(
      process.env.NODE_ENV === 'test'
        ? 'mongodb://127.0.0.1:27017/secure_vault_test'
        : 'mongodb://127.0.0.1:27017/secure_vault'
    ),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  JWT_SECRET: z.string().default('dev_access_jwt_secret_must_be_changed_in_prod_123456789'),
  REFRESH_SECRET: z.string().default('dev_refresh_jwt_secret_must_be_changed_in_prod_123456789'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(50 * 1024 * 1024), // 50MB
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Environment configuration validation failed:');
  parsed.error.issues.forEach((issue) => {
    console.error(` - [${issue.path.join('.')}]: ${issue.message}`);
  });
  process.exit(1);
}

export const config = Object.freeze(parsed.data);
