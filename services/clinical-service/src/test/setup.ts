import { beforeAll } from 'vitest';

// Set up test environment variables
beforeAll(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.KAFKA_BROKERS = 'localhost:9092';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
  process.env.HOSPITAL_ID = 'test-hospital-123';
  process.env.NODE_ENV = 'test';
});