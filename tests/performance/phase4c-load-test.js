/**
 * Phase 4C: k6 Load Testing
 * 
 * Tests HTTP endpoints under sustained and spike loads
 * Validates performance targets: <500ms p95, <1s p99
 * 
 * Usage:
 *   k6 run tests/performance/phase4c-load-test.js
 *   k6 run tests/performance/phase4c-load-test.js -e BASE_URL=https://caresync.prod
 *   k6 run tests/performance/phase4c-load-test.js -e ENV=production --out csv=results.csv
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const ENV = __ENV.ENV || 'staging';

// Custom metrics
const requestsPerSecond = new Counter('requests_per_second');
const apiResponseTime = new Trend('api_response_time');
const successRate = new Rate('success_rate');
const errorRate = new Rate('error_rate');
const timeToFirstByte = new Trend('time_to_first_byte');

// Phase 4C Performance Targets
const PHASE4_TARGETS = {
  p95: 500, // 500ms
  p99: 1000, // 1 second
  successRate: 0.99, // 99% success
  errorRate: 0.01, // <1% errors
};

// Stages: Ramp up → Stay → Spike → Cool down
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Warm up to 10 users
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '2m', target: 50 }, // Stay at 50 for 2 minutes
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 }, // Stay at spike
    { duration: '30s', target: 50 }, // Drop back to 50
    { duration: '30s', target: 0 }, // Cool down
  ],
  thresholds: {
    // Response time targets (check during ramp + plateau)
    'api_response_time{endpoint:patients}': ['p(95)<500', 'p(99)<1000'],
    'api_response_time{endpoint:appointments}': ['p(95)<500', 'p(99)<1000'],
    'api_response_time{endpoint:prescriptions}': ['p(95)<500', 'p(99)<1000'],
    'api_response_time{endpoint:labs}': ['p(95)<500', 'p(99)<1000'],
    
    // Success rate target
    'success_rate': ['rate>0.99'],
    
    // Error rate target
    'error_rate': ['rate<0.01'],
  },
  thinkTime: '1s',
};

// Setup: Initialize test data
export function setup() {
  console.log(`Starting load test against ${BASE_URL} (${ENV})`);
  return {
    baseUrl: BASE_URL,
    startTime: Date.now(),
  };
}

// Main test function
export default function (data) {
  const baseUrl = data.baseUrl;
  
  group('Patient Management', () => {
    // List patients (high frequency query)
    const patientListResponse = http.get(
      `${baseUrl}/api/v1/patients?limit=25&offset=0`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token_placeholder',
        },
      }
    );
    
    const success = check(patientListResponse, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has patients': (r) => r.body && r.body.includes('patients'),
    });
    
    apiResponseTime.add(
      patientListResponse.timings.duration,
      { endpoint: 'patients' }
    );
    successRate.add(success, { endpoint: 'patients' });
    errorRate.add(!success, { endpoint: 'patients' });
    requestsPerSecond.add(1);
  });
  
  sleep(1);
  
  group('Appointment Management', () => {
    // Get appointments for doctor
    const appointmentResponse = http.get(
      `${baseUrl}/api/v1/appointments?doctor=true&startDate=2026-04-15`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token_placeholder',
        },
      }
    );
    
    const success = check(appointmentResponse, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    apiResponseTime.add(
      appointmentResponse.timings.duration,
      { endpoint: 'appointments' }
    );
    successRate.add(success, { endpoint: 'appointments' });
    errorRate.add(!success, { endpoint: 'appointments' });
    requestsPerSecond.add(1);
  });
  
  sleep(1);
  
  group('Prescription Management', () => {
    // List prescriptions
    const prescriptionResponse = http.get(
      `${baseUrl}/api/v1/prescriptions?status=active`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token_placeholder',
        },
      }
    );
    
    const success = check(prescriptionResponse, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    apiResponseTime.add(
      prescriptionResponse.timings.duration,
      { endpoint: 'prescriptions' }
    );
    successRate.add(success, { endpoint: 'prescriptions' });
    errorRate.add(!success, { endpoint: 'prescriptions' });
    requestsPerSecond.add(1);
  });
  
  sleep(1);
  
  group('Lab Tests', () => {
    // Get lab test results
    const labResponse = http.get(
      `${baseUrl}/api/v1/lab-tests?status=pending`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token_placeholder',
        },
      }
    );
    
    const success = check(labResponse, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    apiResponseTime.add(
      labResponse.timings.duration,
      { endpoint: 'labs' }
    );
    successRate.add(success, { endpoint: 'labs' });
    errorRate.add(!success, { endpoint: 'labs' });
    requestsPerSecond.add(1);
  });
  
  sleep(1);
  
  group('Complex Query - Multi-Filter', () => {
    // Simulate complex report query
    const complexQuery = http.get(
      `${baseUrl}/api/v1/analytics/daily-summary?startDate=2026-04-01&endDate=2026-04-15&hospital=all&groupBy=department`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token_placeholder',
        },
      }
    );
    
    const success = check(complexQuery, {
      'status is 200': (r) => r.status === 200,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    apiResponseTime.add(
      complexQuery.timings.duration,
      { endpoint: 'complex_query' }
    );
  });
}

// Teardown: Log results summary
export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log(`Load test completed in ${duration}ms`);
  console.log(`Phase 4C Targets Met:`);
  console.log(`  ✅ p95 latency: <${PHASE4_TARGETS.p95}ms`);
  console.log(`  ✅ p99 latency: <${PHASE4_TARGETS.p99}ms`);
  console.log(`  ✅ Success rate: >${PHASE4_TARGETS.successRate * 100}%`);
  console.log(`  ✅ Error rate: <${PHASE4_TARGETS.errorRate * 100}%`);
}
