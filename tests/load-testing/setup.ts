/**
 * tests/load-testing/setup.ts
 * Setup file for load testing suite
 * Initializes API clients, seeds test data, configures environment
 */

import axios from 'axios';
import { beforeAll, afterAll } from 'vitest';

/**
 * Global test data fixtures
 */
export const TEST_FIXTURES = {
  doctor: {
    id: 'doctor-load-test',
    email: 'load-test-doctor@caresync.local',
    name: 'Dr. Load Test',
  },
  patient: {
    id: 'patient-load-test',
    email: 'load-test-patient@caresync.local',
    name: 'Load Test Patient',
    mrn: 'LOAD-TEST-001',
  },
  session: {
    id: 'session-load-test',
  },
};

/**
 * Initialize API client with proper headers and authentication
 */
export function createTestClient() {
  const client = axios.create({
    baseURL: process.env.API_URL || 'http://localhost:3000/api',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'CareSync-LoadTest/1.0',
      'X-Test-Mode': 'true', // Signals test environment
    },
  });

  // Add request interceptor for timing
  client.interceptors.request.use(config => {
    (config as any).startTime = Date.now();
    return config;
  });

  // Add response interceptor for error handling
  client.interceptors.response.use(
    response => {
      return response;
    },
    error => {
      if (error.response) {
        console.error(`API Error [${error.response.status}]: ${error.response.statusText}`);
      } else if (error.request) {
        console.error('No response from server:', error.message);
      }
      throw error;
    }
  );

  return client;
}

/**
 * Global setup: Seed test data before running tests
 */
beforeAll(async () => {
  console.log('🔧 Setting up load test environment...');

  const client = createTestClient();

  try {
    // Create test doctor (if not exists)
    await client.post('/admin/seed/doctor', TEST_FIXTURES.doctor).catch(() => {
      // Already exists, ignore
    });

    // Create test patient (if not exists)
    await client.post('/admin/seed/patient', TEST_FIXTURES.patient).catch(() => {
      // Already exists, ignore
    });

    // Create test telehealth session
    await client.post('/admin/seed/telehealth-session', {
      doctor_id: TEST_FIXTURES.doctor.id,
      patient_id: TEST_FIXTURES.patient.id,
      session_id: TEST_FIXTURES.session.id,
    }).catch(() => {
      // Already exists, ignore
    });

    console.log('✅ Test environment ready');
  } catch (error) {
    console.error('❌ Failed to set up test environment:', error);
    process.exit(1);
  }
});

/**
 * Global cleanup: Remove test data after tests
 */
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');

  const client = createTestClient();

  try {
    // Delete test data (optional - could keep for inspection)
    // await client.delete(`/admin/seed/doctor/${TEST_FIXTURES.doctor.id}`);
    // await client.delete(`/admin/seed/patient/${TEST_FIXTURES.patient.id}`);
    // await client.delete(`/admin/seed/session/${TEST_FIXTURES.session.id}`);

    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('⚠️  Cleanup encountered errors:', error);
    // Don't fail on cleanup errors
  }
});

/**
 * Helper: Wait for condition (useful for checking system readiness)
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 30000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Helper: Retry function for flaky operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Helper: Simulate network delay (for testing resilience)
 */
export async function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper: Generate random patient data for multi-user scenarios
 */
export function generateTestPatient(index: number) {
  return {
    id: `patient-load-${index}`,
    email: `patient-load-${index}@caresync.local`,
    name: `Test Patient ${index}`,
    mrn: `LOAD-${String(index).padStart(6, '0')}`,
  };
}

/**
 * Helper: Monitor system resources during tests
 */
export class ResourceMonitor {
  private sampleInterval: NodeJS.Timeout | null = null;
  private samples: Array<{ timestamp: number; memory: number; cpu: number }> = [];

  start(intervalMs = 1000) {
    this.sampleInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.samples.push({
        timestamp: Date.now(),
        memory: memUsage.heapUsed / 1024 / 1024, // MB
        cpu: process.cpuUsage().user / 1000000, // seconds
      });
    }, intervalMs);
  }

  stop() {
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
    }
  }

  getReport() {
    if (this.samples.length === 0) {
      return null;
    }

    const memory = this.samples.map(s => s.memory);
    const avgMemory = memory.reduce((a, b) => a + b) / memory.length;
    const maxMemory = Math.max(...memory);
    const minMemory = Math.min(...memory);

    return {
      sampleCount: this.samples.length,
      memoryStats: {
        min: minMemory.toFixed(2),
        max: maxMemory.toFixed(2),
        avg: avgMemory.toFixed(2),
        trend: maxMemory > minMemory * 1.5 ? 'increasing' : 'stable',
      },
    };
  }
}
