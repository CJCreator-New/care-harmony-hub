/**
 * vitest.load-testing.config.ts
 * Load testing configuration for CareSync HIMS
 * 
 * Objectives:
 * - Validate p95 latency < 500ms under load
 * - Measure throughput (requests/sec)
 * - Test concurrent user capacity (target: 500+ concurrent)
 * - Verify no memory leaks or resource exhaustion
 * - Test database connection pooling limits
 * - Validate edge function scaling
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Load testing environment
    environment: 'node', // Not browser - testing API layer
    globals: true,
    setupFiles: ['./tests/load-testing/setup.ts'],
    
    // Performance tracking
    benchmark: {
      include: ['tests/load-testing/**/*.bench.ts'],
      outputFile: './load-test-results.json',
    },

    // Timeout for long-running load tests (10 minutes)
    testTimeout: 600000,
    hookTimeout: 600000,

    // Concurrency settings
    threads: true,
    maxThreads: 8,
    minThreads: 1,

    // Reporter
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './load-test-report.html',
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
