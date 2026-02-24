#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const argPath = process.argv[2];

function findLatestJsonResult() {
  const candidates = [
    path.join(cwd, 'test-results', 'latest-results.json'),
    path.join(cwd, 'test-results', 'results.json'),
  ];

  const testResultsDir = path.join(cwd, 'test-results');
  if (fs.existsSync(testResultsDir)) {
    const files = fs
      .readdirSync(testResultsDir)
      .filter((name) => name.endsWith('.json') && !name.startsWith('.'))
      .map((name) => ({
        name,
        fullPath: path.join(testResultsDir, name),
        mtime: fs.statSync(path.join(testResultsDir, name)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > 0) {
      candidates.unshift(files[0].fullPath);
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

const resultsPath = argPath ? path.resolve(cwd, argPath) : findLatestJsonResult();

if (!resultsPath || !fs.existsSync(resultsPath)) {
  console.log('No Playwright JSON results file found.');
  console.log('Generate one with:');
  console.log('  npx playwright test --reporter=json > test-results/latest-results.json');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
} catch (error) {
  console.error(`Could not parse JSON results file: ${resultsPath}`);
  process.exit(1);
}

const roleMatchers = [
  { key: 'Admin', regex: /admin/i },
  { key: 'Doctor', regex: /doctor/i },
  { key: 'Nurse', regex: /nurse/i },
  { key: 'Receptionist', regex: /reception/i },
  { key: 'Lab', regex: /\blab\b|lab_technician|labtech/i },
  { key: 'Pharmacist', regex: /pharmac/i },
  { key: 'Patient Portal', regex: /patient portal|patient/i },
];

const totals = { passed: 0, failed: 0, skipped: 0, timedOut: 0, interrupted: 0, flaky: 0 };
const failures = [];
const byRole = new Map(roleMatchers.map((r) => [r.key, { passed: 0, failed: 0, skipped: 0 }]));

function detectRole(label) {
  for (const role of roleMatchers) {
    if (role.regex.test(label)) return role.key;
  }
  return null;
}

function visitSuite(suite, ancestry = []) {
  const nextAncestry = [...ancestry, suite.title].filter(Boolean);

  for (const spec of suite.specs ?? []) {
    const specPath = [...nextAncestry, spec.title].join(' > ');
    const role = detectRole(specPath) || 'Unmapped';
    if (!byRole.has(role)) byRole.set(role, { passed: 0, failed: 0, skipped: 0 });

    for (const test of spec.tests ?? []) {
      const resultStatuses = (test.results ?? []).map((r) => r.status);
      const outcome = resultStatuses.includes('failed')
        ? 'failed'
        : resultStatuses.includes('timedOut')
          ? 'timedOut'
          : resultStatuses.includes('interrupted')
            ? 'interrupted'
            : resultStatuses.includes('skipped')
              ? 'skipped'
              : resultStatuses.includes('passed')
                ? 'passed'
                : (test.outcome ?? 'skipped');

      if (outcome === 'passed' || outcome === 'expected') {
        totals.passed += 1;
        byRole.get(role).passed += 1;
      } else if (outcome === 'skipped') {
        totals.skipped += 1;
        byRole.get(role).skipped += 1;
      } else if (outcome === 'timedOut') {
        totals.timedOut += 1;
        totals.failed += 1;
        byRole.get(role).failed += 1;
      } else if (outcome === 'interrupted') {
        totals.interrupted += 1;
        totals.failed += 1;
        byRole.get(role).failed += 1;
      } else if (outcome === 'flaky') {
        totals.flaky += 1;
      } else {
        totals.failed += 1;
        byRole.get(role).failed += 1;

        const result = (test.results ?? []).find((r) => r.status === 'failed') ?? (test.results ?? [])[0] ?? {};
        const errorMessage =
          result.error?.message ||
          result.errors?.[0]?.message ||
          'No error message available';

        failures.push({ role, specPath, errorMessage });
      }
    }
  }

  for (const child of suite.suites ?? []) {
    visitSuite(child, nextAncestry);
  }
}

for (const suite of data.suites ?? []) {
  visitSuite(suite, []);
}

const totalExecuted = totals.passed + totals.failed + totals.skipped + totals.flaky;

console.log('Playwright JSON Summary');
console.log(`- Source: ${resultsPath}`);
console.log(`- Total tests: ${totalExecuted}`);
console.log(`- Passed: ${totals.passed}`);
console.log(`- Failed: ${totals.failed}`);
console.log(`- Skipped: ${totals.skipped}`);
console.log(`- Flaky: ${totals.flaky}`);

console.log('\nBy role:');
for (const [role, stats] of byRole.entries()) {
  if (stats.passed === 0 && stats.failed === 0 && stats.skipped === 0) continue;
  console.log(`- ${role}: passed=${stats.passed}, failed=${stats.failed}, skipped=${stats.skipped}`);
}

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const failure of failures) {
    const oneLineError = String(failure.errorMessage).split('\n')[0];
    console.log(`- [${failure.role}] ${failure.specPath}`);
    console.log(`  ${oneLineError}`);
  }
} else {
  console.log('\nFailures: none');
}
