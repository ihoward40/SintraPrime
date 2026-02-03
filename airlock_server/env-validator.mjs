import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  MANUS_SHARED_SECRET: z.string().min(32, 'Secret must be at least 32 characters'),
  MAKE_WEBHOOK_URL: z.string().url('Invalid webhook URL'),
  AIRLOCK_SHARED_SECRET: z.string().min(32, 'Secret must be at least 32 characters'),
  ACCEPT_ORIGIN: z.string().default('*'),
  MAX_BODY_BYTES: z.string().transform(Number).default('10485760'),
  ALLOW_DEV_ROUTES: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
});

export function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error.name === 'ZodError') {
      const issues = error.issues.map(
        (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
      );
      console.error('❌ Airlock environment validation failed:');
      console.error(issues.join('\n'));
      process.exit(1);
    }
    throw error;
  }
}
