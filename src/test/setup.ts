import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock sonner globally to prevent DOM access
vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

// Mock crypto module globally
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue(Buffer.from('1234567890123456')),
    createCipherGCM: vi.fn().mockReturnValue({
      setAAD: vi.fn(),
      update: vi.fn().mockReturnValue('encrypted'),
      final: vi.fn().mockReturnValue('final'),
      getAuthTag: vi.fn().mockReturnValue(Buffer.from('authtag12345678')),
    }),
    createDecipherGCM: vi.fn().mockReturnValue({
      setAAD: vi.fn(),
      setAuthTag: vi.fn(),
      update: vi.fn().mockReturnValue('decrypted'),
      final: vi.fn().mockReturnValue(''),
    }),
    createHash: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('hashedvalue'),
    }),
  },
  // Also mock the CommonJS export
  randomBytes: vi.fn().mockReturnValue(Buffer.from('1234567890123456')),
  createCipherGCM: vi.fn().mockReturnValue({
    setAAD: vi.fn(),
    update: vi.fn().mockReturnValue('encrypted'),
    final: vi.fn().mockReturnValue('final'),
    getAuthTag: vi.fn().mockReturnValue(Buffer.from('authtag12345678')),
  }),
  createDecipherGCM: vi.fn().mockReturnValue({
    setAAD: vi.fn(),
    setAuthTag: vi.fn(),
    update: vi.fn().mockReturnValue('decrypted'),
    final: vi.fn().mockReturnValue(''),
  }),
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('hashedvalue'),
  }),
}));

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