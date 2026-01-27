/**
 * Global Teardown for Playwright Tests
 * 
 * Runs once after all test files to clean up resources
 * and generate final reports.
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running global teardown...');

  // Generate test summary
  const resultsPath = path.join(__dirname, '../../test-results/results.json');

  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      
      const summary = {
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        timestamp: new Date().toISOString(),
      };

      const summaryPath = path.join(__dirname, '../../test-results/summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      console.log(`📊 Test Summary:`);
      console.log(`   Total: ${summary.totalTests}`);
      console.log(`   Passed: ${summary.passed} ✅`);
      console.log(`   Failed: ${summary.failed} ❌`);
      console.log(`   Skipped: ${summary.skipped} ⏭️`);
      console.log(`   Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    } catch {
      // Results file may not exist on first run
    }
  }

  // Clean up temporary files (preserve auth states for reuse)
  const tempDir = path.join(__dirname, '../../test-results/temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('✨ Global teardown complete');
}

export default globalTeardown;
