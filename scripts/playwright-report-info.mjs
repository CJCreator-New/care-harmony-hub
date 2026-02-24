#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const reportPath = path.join(cwd, 'playwright-report', 'index.html');
const testResultsPath = path.join(cwd, 'test-results');

console.log('Playwright report summary');

if (fs.existsSync(reportPath)) {
  console.log(`- HTML report: ${reportPath}`);
} else {
  console.log('- HTML report: not found');
}

if (fs.existsSync(testResultsPath)) {
  const entries = fs.readdirSync(testResultsPath, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  console.log(`- test-results files: ${files.length}`);
  console.log(`- test-results dirs: ${dirs.length}`);

  if (dirs.length > 0) {
    const latest = dirs
      .map((name) => ({ name, mtime: fs.statSync(path.join(testResultsPath, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0];

    console.log(`- latest result dir: ${path.join(testResultsPath, latest.name)}`);
  }
} else {
  console.log('- test-results: not found');
}
