import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SINTRAPRIME_REPO_PATH: z.string().optional(),
  SINTRAPRIME_RUNS_DIR: z.string().default('runs'),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  SLACK_CHANNEL: z.string().optional(),
  SEVERITY_THRESHOLD: z.string().transform(Number).default('3'),
  NODE_PATH: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(
        (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
      );
      console.error('❌ Environment validation failed:');
      console.error(issues.join('\n'));
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();
