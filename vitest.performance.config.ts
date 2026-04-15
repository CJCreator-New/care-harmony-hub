import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 60000, // Performance tests may take longer
    hookTimeout: 60000,
    teardownTimeout: 60000,
    isolate: true,
    threads: false, // Performance tests should run sequentially to avoid interference
    singleThread: true,
    include: [
      'tests/performance/**/*.test.ts',
    ],
    exclude: [
      'tests/performance/**/*.k6.js', // k6 scripts handled separately
      'tests/performance/**/*.js', // JS files are k6 scripts
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
