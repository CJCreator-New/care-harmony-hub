import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
// Load test environment variables
dotenv.config({ path: '.env.test' });
// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5433/test_patient_db';
// Global test setup
beforeAll(async () => {
    // Any global setup can go here
    console.log('Setting up tests...');
});
afterAll(async () => {
    // Any global cleanup can go here
    console.log('Cleaning up tests...');
});
//# sourceMappingURL=setup.js.map