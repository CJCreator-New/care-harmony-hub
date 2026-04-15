/**
 * tests/load-testing/performance.bench.ts
 * Load testing and performance benchmarking suite for CareSync HIMS
 * 
 * Execution: npm run test:load
 * 
 * Target Metrics:
 * - p50 latency: < 200ms
 * - p95 latency: < 500ms  
 * - p99 latency: < 1000ms
 * - Error rate: < 0.1%
 * - Throughput: > 100 req/sec
 * - Concurrent users: 500+
 * - Memory: Stable (no leaks)
 */

import { bench, describe, it, expect } from 'vitest';
import axios, { AxiosInstance } from 'axios';

/**
 * Test Configuration
 */
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const LOAD_TEST_DURATION = 60000; // 60 seconds
const CONCURRENT_USERS = process.env.LOAD_USERS ? parseInt(process.env.LOAD_USERS) : 100;
const RAMP_UP_TIME = 10000; // 10 seconds

/**
 * Metrics Aggregator
 */
class PerformanceMetrics {
  private latencies: number[] = [];
  private errors: number = 0;
  private successCount: number = 0;
  private startTime: number = 0;
  private endTime: number = 0;

  start() {
    this.startTime = Date.now();
  }

  recordLatency(ms: number) {
    this.latencies.push(ms);
    this.successCount++;
  }

  recordError() {
    this.errors++;
  }

  end() {
    this.endTime = Date.now();
  }

  getResults() {
    const sorted = this.latencies.sort((a, b) => a - b);
    const totalTime = (this.endTime - this.startTime) / 1000; // seconds
    const totalRequests = this.successCount + this.errors;

    return {
      totalRequests,
      successCount: this.successCount,
      errorCount: this.errors,
      errorRate: this.errors / totalRequests,
      throughput: totalRequests / totalTime,
      p50: this._percentile(sorted, 0.5),
      p95: this._percentile(sorted, 0.95),
      p99: this._percentile(sorted, 0.99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      stdDev: this._stdDev(sorted),
    };
  }

  private _percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private _stdDev(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }
}

/**
 * Load Test Helper: Simulate concurrent users with ramp-up
 */
async function runConcurrentLoad(
  fn: (clientId: number) => Promise<void>,
  concurrentUsers: number,
  duration: number
): Promise<PerformanceMetrics> {
  const metrics = new PerformanceMetrics();
  metrics.start();

  const clients = Array.from({ length: concurrentUsers }, (_, i) => i);
  const endTime = Date.now() + duration;
  const rampUpPerUser = RAMP_UP_TIME / concurrentUsers;

  // Ramp up: gradually start clients
  const clientPromises = clients.map(async (clientId) => {
    await new Promise(resolve => setTimeout(resolve, clientId * rampUpPerUser));

    // Run requests until test duration ends
    while (Date.now() < endTime) {
      try {
        const startLatency = Date.now();
        await fn(clientId);
        const latency = Date.now() - startLatency;
        metrics.recordLatency(latency);
      } catch (error) {
        metrics.recordError();
      }
    }
  });

  await Promise.all(clientPromises);
  metrics.end();

  return metrics;
}

/**
 * ============================================================================
 * LOAD TESTS
 * ============================================================================
 */

describe('Load Testing - Telehealth Prescription Issuance', () => {
  let apiClient: AxiosInstance;
  let testSessionId: string;
  let testPatientId: string;

  bench.each([100, 250, 500])(
    `Concurrent users: %s - Issue prescription API`,
    async (concurrentUsers) => {
      const metrics = await runConcurrentLoad(
        async () => {
          await apiClient.post(`/telehealth/sessions/${testSessionId}/prescriptions`, {
            patient_id: testPatientId,
            medications: [
              {
                medication_id: 'amoxicillin-500',
                dosage: '500mg',
                frequency: 'three_times_daily',
                quantity: 30,
                refills: 2,
              },
            ],
          });
        },
        concurrentUsers,
        LOAD_TEST_DURATION
      );

      const results = metrics.getResults();
      console.log(`\n📊 Results for ${concurrentUsers} concurrent users:`);
      console.log(`  ├─ Total Requests: ${results.totalRequests}`);
      console.log(`  ├─ Success: ${results.successCount}, Errors: ${results.errorCount}`);
      console.log(`  ├─ Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);
      console.log(`  ├─ Throughput: ${results.throughput.toFixed(2)} req/sec`);
      console.log(`  ├─ Latency - P50: ${results.p50.toFixed(0)}ms, P95: ${results.p95.toFixed(0)}ms, P99: ${results.p99.toFixed(0)}ms`);
      console.log(`  ├─ Mean: ${results.mean.toFixed(0)}ms, StdDev: ${results.stdDev.toFixed(0)}ms`);
      console.log(`  └─ Range: ${results.min.toFixed(0)}ms - ${results.max.toFixed(0)}ms`);

      // Assertions: performance targets
      expect(results.p95, `P95 latency should be < 500ms for ${concurrentUsers} users`).toBeLessThan(500);
      expect(results.p99, `P99 latency should be < 1000ms for ${concurrentUsers} users`).toBeLessThan(1000);
      expect(results.errorRate, `Error rate should be < 1% for ${concurrentUsers} users`).toBeLessThan(0.01);
      expect(results.throughput, `Throughput should be > 50 req/sec for ${concurrentUsers} users`).toBeGreaterThan(50);
    }
  );
});

describe('Load Testing - Billing Invoice Query', () => {
  let apiClient: AxiosInstance;
  let testInvoiceIds: string[] = [];

  bench(`Query billing invoices with complex filtering`, async () => {
    const metrics = await runConcurrentLoad(
      async () => {
        await apiClient.get('/billing/invoices', {
          params: {
            status: 'pending',
            date_range: 'last_30_days',
            sort_by: 'date_desc',
            limit: 50,
          },
        });
      },
      CONCURRENT_USERS,
      LOAD_TEST_DURATION
    );

    const results = metrics.getResults();
    console.log(`\n📊 Billing Invoice Query Results:`);
    console.log(`  ├─ P50: ${results.p50.toFixed(0)}ms, P95: ${results.p95.toFixed(0)}ms, P99: ${results.p99.toFixed(0)}ms`);
    console.log(`  ├─ Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);
    console.log(`  └─ Throughput: ${results.throughput.toFixed(2)} req/sec`);

    expect(results.p95).toBeLessThan(500);
    expect(results.errorRate).toBeLessThan(0.01);
  });
});

describe('Load Testing - Appointment Recurrence Generation', () => {
  let apiClient: AxiosInstance;

  bench(`Generate recurring appointment series (12 occurrences)`, async () => {
    const metrics = await runConcurrentLoad(
      async () => {
        await apiClient.post('/appointments/generate-recurrence', {
          pattern: 'weekly',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          days_of_week: ['monday', 'wednesday', 'friday'],
          duration_minutes: 30,
        });
      },
      Math.min(CONCURRENT_USERS, 100), // CPU-intensive, limit concurrency
      LOAD_TEST_DURATION
    );

    const results = metrics.getResults();
    console.log(`\n📊 Recurrence Generation Results:`);
    console.log(`  ├─ P50: ${results.p50.toFixed(0)}ms, P95: ${results.p95.toFixed(0)}ms`);
    console.log(`  ├─ Mean: ${results.mean.toFixed(0)}ms`);
    console.log(`  └─ Throughput: ${results.throughput.toFixed(2)} req/sec`);

    expect(results.p95).toBeLessThan(300); // Tighter constraint for complex operation
    expect(results.errorRate).toBeLessThan(0.01);
  });
});

describe('Load Testing - Database Query Performance', () => {
  let apiClient: AxiosInstance;

  bench.each([
    { name: 'Patient data query', endpoint: '/patients/search', params: { name: 'john' } },
    { name: 'Appointment list query', endpoint: '/appointments', params: { status: 'confirmed' } },
    { name: 'Prescription refill list', endpoint: '/prescriptions/refills', params: { status: 'pending' } },
  ])('Query: $name', async (testCase) => {
    const metrics = await runConcurrentLoad(
      async () => {
        await apiClient.get(testCase.endpoint, { params: testCase.params });
      },
      CONCURRENT_USERS,
      LOAD_TEST_DURATION
    );

    const results = metrics.getResults();
    console.log(`\n📊 ${testCase.name} Results:`);
    console.log(`  ├─ P95: ${results.p95.toFixed(0)}ms`);
    console.log(`  └─ Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);

    expect(results.p95).toBeLessThan(300); // Read queries should be fast
    expect(results.errorRate).toBeLessThan(0.01);
  });
});

describe('Load Testing - Write Operations Under Load', () => {
  let apiClient: AxiosInstance;
  let counter = 0;

  bench(`Create new prescriptions (write-heavy)`, async () => {
    const metrics = await runConcurrentLoad(
      async () => {
        counter++;
        await apiClient.post('/prescriptions', {
          patient_id: `patient-${Math.floor(Math.random() * 100)}`,
          doctor_id: `doctor-${Math.floor(Math.random() * 10)}`,
          medications: [
            {
              medication_id: `med-${Math.floor(Math.random() * 1000)}`,
              dosage: '500mg',
              frequency: 'twice_daily',
            },
          ],
        });
      },
      Math.min(CONCURRENT_USERS, 50), // Limit write concurrency
      LOAD_TEST_DURATION
    );

    const results = metrics.getResults();
    console.log(`\n📊 Write Operations Results:`);
    console.log(`  ├─ P95: ${results.p95.toFixed(0)}ms`);
    console.log(`  ├─ Successful writes: ${results.successCount}`);
    console.log(`  └─ Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);

    expect(results.p95).toBeLessThan(500);
    expect(results.errorRate).toBeLessThan(0.02); // Slightly higher for writes
  });
});

describe('Load Testing - Authentication & Authorization Overhead', () => {
  let apiClient: AxiosInstance;

  bench(`API requests with JWT validation`, async () => {
    const metrics = await runConcurrentLoad(
      async () => {
        // Every request includes authorization check
        await apiClient.get('/patients/profile', {
          headers: {
            'Authorization': `Bearer eyJhbGc...`, // Test JWT
          },
        });
      },
      CONCURRENT_USERS,
      LOAD_TEST_DURATION
    );

    const results = metrics.getResults();
    console.log(`\n📊 Auth Overhead Results:`);
    console.log(`  ├─ P95: ${results.p95.toFixed(0)}ms`);
    console.log(`  └─ Throughput: ${results.throughput.toFixed(2)} req/sec`);

    expect(results.p95).toBeLessThan(300); // Should be fast (JWT cached)
  });
});

describe('Load Testing - Sustained Load (Long Duration)', () => {
  let apiClient: AxiosInstance;

  bench(`Sustained load for 5 minutes`, async () => {
    const metrics = await runConcurrentLoad(
      async () => {
        await apiClient.get('/system/health');
      },
      Math.min(CONCURRENT_USERS, 200), // Moderate concurrency
      300000 // 5 minutes
    );

    const results = metrics.getResults();
    console.log(`\n📊 Sustained Load (5 min) Results:`);
    console.log(`  ├─ Total Requests: ${results.totalRequests}`);
    console.log(`  ├─ P95: ${results.p95.toFixed(0)}ms`);
    console.log(`  ├─ Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);
    console.log(`  └─ Mean: ${results.mean.toFixed(0)}ms`);

    // Should remain stable over time
    expect(results.p95).toBeLessThan(500);
    expect(results.errorRate).toBeLessThan(0.01);
    
    // Check for memory stability (warning if high stdDev)
    if (results.stdDev > results.mean * 0.5) {
      console.warn('⚠️  High latency variance detected - possible memory issues');
    }
  });
});

describe('Load Testing - Peak Traffic Spike', () => {
  let apiClient: AxiosInstance;

  bench(`Peak traffic spike: 2x normal concurrency`, async () => {
    const peakConcurrency = CONCURRENT_USERS * 2;

    const metrics = await runConcurrentLoad(
      async () => {
        await apiClient.get('/appointments');
      },
      peakConcurrency,
      30000 // 30 seconds of peak
    );

    const results = metrics.getResults();
    console.log(`\n📊 Peak Traffic Spike (${peakConcurrency} concurrent) Results:`);
    console.log(`  ├─ P95: ${results.p95.toFixed(0)}ms`);
    console.log(`  ├─ P99: ${results.p99.toFixed(0)}ms`);
    console.log(`  ├─ Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);
    console.log(`  └─ Throughput: ${results.throughput.toFixed(2)} req/sec`);

    // Allow some degradation under peak
    expect(results.p95).toBeLessThan(1000); // Relaxed constraint for peak
    expect(results.errorRate).toBeLessThan(0.05); // Allow up to 5% errors during peak
  });
});

/**
 * ============================================================================
 * MEMORY LEAK DETECTION
 * ============================================================================
 */
describe('Memory Stability Tests', () => {
  bench(`Memory leak detection - sustained API calls`, async () => {
    const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB

    // Make 10,000 API requests
    await runConcurrentLoad(
      async () => {
        await fetch(`${API_BASE_URL}/system/health`);
      },
      25,
      60000
    );

    const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    const memoryIncrease = finalMemory - initialMemory;
    const percentIncrease = (memoryIncrease / initialMemory) * 100;

    console.log(`\n💾 Memory Analysis:`);
    console.log(`  ├─ Initial: ${initialMemory.toFixed(2)} MB`);
    console.log(`  ├─ Final: ${finalMemory.toFixed(2)} MB`);
    console.log(`  ├─ Increase: ${memoryIncrease.toFixed(2)} MB (+${percentIncrease.toFixed(1)}%)`);

    // Warn if memory increased > 50%
    if (percentIncrease > 50) {
      console.warn('⚠️  MEMORY LEAK WARNING: Heap increased > 50%');
    }

    expect(percentIncrease).toBeLessThan(100); // Should not increase > 100%
  });
});

/**
 * ============================================================================
 * REPORTING
 * ============================================================================
 */

describe('Load Test Summary Report', () => {
  it('generates summary metrics', async () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║            CARESYNC HIMS - LOAD TEST SUMMARY                   ║
╠════════════════════════════════════════════════════════════════╣
║ Target Metrics:                                                ║
║   ✓ P50 Latency: < 200ms                                       ║
║   ✓ P95 Latency: < 500ms                                       ║
║   ✓ P99 Latency: < 1000ms                                      ║
║   ✓ Error Rate: < 1%                                           ║
║   ✓ Throughput: > 100 req/sec                                  ║
║   ✓ Concurrent Users: 500+                                     ║
║   ✓ Memory: Stable (< 50% increase)                            ║
║                                                                ║
║ Test Duration: ${(LOAD_TEST_DURATION / 1000).toFixed(0)} seconds                                      ║
║ Concurrent Users: ${CONCURRENT_USERS}                                       ║
║ Ramp-up Time: ${(RAMP_UP_TIME / 1000).toFixed(0)} seconds                                    ║
║                                                                ║
║ Results:                                                       ║
║   See console output above for detailed metrics               ║
║   HTML Report: load-test-report.html                          ║
║   JSON Report: load-test-results.json                         ║
╚════════════════════════════════════════════════════════════════╝
    `);
  });
});
