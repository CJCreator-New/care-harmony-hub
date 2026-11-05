import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5433/test_patient_db';

// Mock external dependencies
vi.mock('../src/utils/encryption', () => ({
  encryptData: vi.fn().mockResolvedValue('encrypted_data'),
  decryptData: vi.fn().mockResolvedValue('decrypted_data'),
}));