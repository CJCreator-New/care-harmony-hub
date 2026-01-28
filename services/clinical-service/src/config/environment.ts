import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.number().default(3003),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  KAFKA_BROKERS: z.string(),
  KAFKA_CLIENT_ID: z.string().default('clinical-service'),
  KAFKA_SASL_USERNAME: z.string().optional(),
  KAFKA_SASL_PASSWORD: z.string().optional(),
  KAFKA_SSL: z.boolean().default(false),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().length(64), // 32 bytes hex encoded
  PATIENT_SERVICE_URL: z.string().optional(),
  APPOINTMENT_SERVICE_URL: z.string().optional(),
  AUTH_SERVICE_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_MAX: z.number().default(100),
  RATE_LIMIT_WINDOW: z.number().default(900000), // 15 minutes
  HOSPITAL_ID: z.string().uuid(),
});

export type Config = z.infer<typeof configSchema>;

let configCache: Config | undefined;

export function loadConfig(): Config {
  if (configCache) return configCache;

  // Load environment variables
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    HOST: process.env.HOST,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    KAFKA_BROKERS: process.env.KAFKA_BROKERS,
    KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID,
    KAFKA_SASL_USERNAME: process.env.KAFKA_SASL_USERNAME,
    KAFKA_SASL_PASSWORD: process.env.KAFKA_SASL_PASSWORD,
    KAFKA_SSL: process.env.KAFKA_SSL ? process.env.KAFKA_SSL === 'true' : undefined,
    JWT_SECRET: process.env.JWT_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    PATIENT_SERVICE_URL: process.env.PATIENT_SERVICE_URL,
    APPOINTMENT_SERVICE_URL: process.env.APPOINTMENT_SERVICE_URL,
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
    LOG_LEVEL: process.env.LOG_LEVEL as any,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : undefined,
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW ? parseInt(process.env.RATE_LIMIT_WINDOW) : undefined,
    HOSPITAL_ID: process.env.HOSPITAL_ID,
  };

  try {
    configCache = configSchema.parse(env);
    return configCache;
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
}

export const config = loadConfig();