import { z } from 'zod';

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3001),

  // Database Configuration
  DATABASE_URL: z.string().url(),
  DATABASE_SSL: z.coerce.boolean().default(false),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().default(20),

  // Redis Configuration
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),

  // Kafka Configuration
  KAFKA_BROKERS: z.string().transform((val) => val.split(',')),
  KAFKA_CLIENT_ID: z.string().default('patient-service'),
  KAFKA_GROUP_ID: z.string().default('patient-service-group'),

  // JWT Configuration
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('1h'),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(900000), // 15 minutes

  // Service Configuration
  VERSION: z.string().default('1.0.0'),
  SERVICE_NAME: z.string().default('patient-service'),

  // HIPAA Compliance
  ENCRYPTION_KEY: z.string(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Config = z.infer<typeof envSchema>;

function loadConfig(): Config {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`- ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
}

export const config = loadConfig();