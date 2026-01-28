// Test setup file for appointment service
import { beforeAll, afterAll } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.HOSPITAL_ID = 'test-hospital-id';

// Global test setup
beforeAll(async () => {
  // Setup code here if needed
});

afterAll(async () => {
  // Cleanup code here if needed
});