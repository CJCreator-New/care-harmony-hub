import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15000,
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      // External agent worktrees and sibling services must not be collected here.
      '**/.kilo/**',
      '**/services/**',
      // Playwright spec files must not be picked up by Vitest — they use the
      // Playwright test() API which conflicts with Vitest globals.
      'tests/e2e/**',
      '**/*.spec.ts',
      // Supabase edge functions are Deno code (remote https imports, Deno.* APIs).
      // They cannot run under vitest; they are not covered by this config.
      'supabase/functions/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/tests/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
