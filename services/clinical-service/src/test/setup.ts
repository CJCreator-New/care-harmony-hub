// Set up test environment variables BEFORE any imports or mocks
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.HOSPITAL_ID = 'test-hospital-123';
process.env.NODE_ENV = 'test';

import { beforeAll, vi } from 'vitest';

// Mock the environment module after setting env vars
vi.mock('../config/environment', () => ({
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    KAFKA_BROKERS: process.env.KAFKA_BROKERS,
    JWT_SECRET: process.env.JWT_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    HOSPITAL_ID: process.env.HOSPITAL_ID,
    NODE_ENV: process.env.NODE_ENV,
  },
  config: {
    LOG_LEVEL: 'info',
  },
  loadConfig: vi.fn().mockReturnValue({
    NODE_ENV: 'test',
    PORT: 3003,
    HOST: '0.0.0.0',
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    KAFKA_BROKERS: process.env.KAFKA_BROKERS,
    KAFKA_CLIENT_ID: 'clinical-service-test',
    KAFKA_SASL_USERNAME: undefined,
    KAFKA_SASL_PASSWORD: undefined,
    KAFKA_SSL: false,
    JWT_SECRET: process.env.JWT_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    PATIENT_SERVICE_URL: undefined,
    APPOINTMENT_SERVICE_URL: undefined,
    AUTH_SERVICE_URL: undefined,
    LOG_LEVEL: 'info',
    CORS_ORIGIN: '*',
    RATE_LIMIT_MAX: 100,
    RATE_LIMIT_WINDOW: 900000,
    HOSPITAL_ID: process.env.HOSPITAL_ID,
  }),
}));