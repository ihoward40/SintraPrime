import pino from 'pino';
import { env } from '../config/env-validator.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-manus-signature"]',
      'env.MANUS_SHARED_SECRET',
      'env.AIRLOCK_SHARED_SECRET',
      'env.SLACK_WEBHOOK_URL',
      '*.password',
      '*.token',
      '*.secret',
      '*.apiKey',
      '*.data_b64',
    ],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createChildLogger(name: string) {
  return logger.child({ module: name });
}
