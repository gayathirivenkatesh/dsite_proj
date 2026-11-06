const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshToken',
  'secret',
  'authorization',
  'cookie',
]);

function redactSensitive(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 4) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1));
  }
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = redactSensitive(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatLog(level, message, meta) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
  };
  if (meta !== undefined) {
    entry.meta = redactSensitive(meta);
  }
  return JSON.stringify(entry);
}

const isTest = process.env.NODE_ENV === 'test';

export const logger = {
  info(message, meta) {
    if (!isTest) {
      process.stdout.write(`${formatLog('INFO', message, meta)}\n`);
    }
  },
  warn(message, meta) {
    if (!isTest) {
      process.stderr.write(`${formatLog('WARN', message, meta)}\n`);
    }
  },
  error(message, meta) {
    if (!isTest) {
      process.stderr.write(`${formatLog('ERROR', message, meta)}\n`);
    }
  },
  debug(message, meta) {
    if (!isTest && process.env.DEBUG) {
      process.stdout.write(`${formatLog('DEBUG', message, meta)}\n`);
    }
  },
};
