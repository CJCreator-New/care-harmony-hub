#!/usr/bin/env node

/**
 * Automated Test Runner with Issue Detection
 * Runs comprehensive tests and generates detailed issue reports
 */

import { spawn } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const REPORT_DIR = 'test-reports';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Ensure report directory exists
if (!existsSync(REPORT_DIR)) {
  mkdirSync(REPORT_DIR, { recursive: true });
}

const testSuites = [
  {
    name: 'Dependency Check',
    command: 'npm',
    args: ['audit', '--json'],
    critical: true,
    parser: 'audit'
  },
  {
    name: 'Type Check',
    command: 'npx',
    args: ['tsc', '--noEmit'],
    critical: true,
    parser: 'typescript'
  },
  {
    name: 'Unit Tests',
    command: 'npx',
    args: ['vitest', 'run', 'src/test', '--reporter=json', '--reporter=verbose'],
    critical: false,
    parser: 'vitest'
  },
  {
    name: 'Security Tests',
    command: 'npx',
    args: ['vitest', 'run', 'tests/security', '--reporter=json'],
    critical: true,
    parser: 'vitest'
  },
  {
    name: 'Accessibility Tests',
    command: 'npx',
    args: ['vitest', 'run', 'tests/accessibility', '--reporter=json'],
    critical: false,
    parser: 'vitest'
  },
  {
    name: 'Integration Tests',
    command: 'npx',
    args: ['vitest', 'run', 'tests/integration', '--reporter=json'],
    critical: false,
    parser: 'vitest'
  },
  {
    name: 'E2E - Admin Workflow',
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e/admin-operations.spec.ts', '--reporter=json'],
    critical: true,
    parser: 'playwright'
  },
  {
    name: 'E2E - Doctor Workflow',
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e/doctor-workflow.spec.ts', '--reporter=json'],
    critical: true,
    parser: 'playwright'
  },
  {
    name: 'E2E - Pharmacy Workflow',
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e/pharmacy.spec.ts', '--reporter=json'],
    critical: true,
    parser: 'playwright'
  },
  {
    name: 'E2E - Laboratory Workflow',
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e/laboratory.spec.ts', '--reporter=json'],
    critical: true,
    parser: 'playwright'
  },
  {
    name: 'E2E - Patient Journey',
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e/patient-journey.spec.ts', '--reporter=json'],
    critical: true,
    parser: 'playwright'
  },
  {
    name: 'E2E - Cross-Role Handoffs',
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e/cross-role-handoffs.spec.ts', '--reporter=json'],
    critical: true,
    parser: 'playwright'
  },
  {
    name: 'Performance Tests',
    command: 'npx',
    args: ['vitest', 'run', 'tests/performance', '--reporter=json'],
    critical: false,
    parser: 'vitest'
  }
];

const issueReport = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    critical_failures: 0
  },
  issues: [],
  broken_links: [],
  missing_dependencies: [],
  security_vulnerabilities: [],
  performance_issues: [],
  accessibility_issues: []
};

function runCommand(suite) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${suite.name}`);
    console.log(`${'='.repeat(60)}`);

    let stdout = '';
    let stderr = '';

    const child = spawn(suite.command, suite.args, {
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' }
    });

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });

    child.on('close', (code) => {
      resolve({
        name: suite.name,
        code,
        stdout,
        stderr,
        critical: suite.critical,
        parser: suite.parser
      });
    });

    child.on('error', (error) => {
      resolve({
        name: suite.name,
        code: 1,
        stdout,
        stderr: error.message,
        critical: suite.critical,
        parser: suite.parser
      });
    });
  });
}

function parseAuditResults(result) {
  try {
    const data = JSON.parse(result.stdout);
    
    if (data.vulnerabilities) {
      const vulns = data.vulnerabilities;
      Object.entries(vulns).forEach(([severity, count]) => {
        if (count > 0 && severity !== 'info' && severity !== 'total') {
          issueReport.security_vulnerabilities.push({
            severity,
            count,
            source: 'npm audit'
          });
        }
      });
    }

    if (data.metadata?.dependencies) {
      const deps = data.metadata.dependencies;
      issueReport.missing_dependencies.push({
        total: deps.total || 0,
        prod: deps.prod || 0,
        dev: deps.dev || 0,
        optional: deps.optional || 0
      });
    }
  } catch (e) {
    console.error('Failed to parse audit results:', e.message);
  }
}

function parseTypescriptResults(result) {
  if (result.code !== 0) {
    const errors = result.stdout.match(/error TS\d+:/g) || [];
    issueReport.issues.push({
      type: 'TypeScript Error',
      count: errors.length,
      critical: true,
      details: result.stdout.split('\n').filter(line => line.includes('error TS')).slice(0, 10)
    });
  }
}

function parseVitestResults(result) {
  try {
    const jsonMatch = result.stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      
      if (data.numFailedTests > 0) {
        issueReport.issues.push({
          type: `${result.name} Failures`,
          count: data.numFailedTests,
          critical: result.critical,
          passed: data.numPassedTests,
          total: data.numTotalTests
        });
      }
    }
  } catch (e) {
    // Fallback to text parsing
    const failMatch = result.stdout.match(/(\d+) failed/);
    const passMatch = result.stdout.match(/(\d+) passed/);
    
    if (failMatch) {
      issueReport.issues.push({
        type: `${result.name} Failures`,
        count: parseInt(failMatch[1]),
        critical: result.critical,
        passed: passMatch ? parseInt(passMatch[1]) : 0
      });
    }
  }
}

function parsePlaywrightResults(result) {
  try {
    const jsonMatch = result.stdout.match(/\{[\s\S]*"suites"[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      
      let failed = 0;
      let passed = 0;
      
      data.suites?.forEach(suite => {
        suite.specs?.forEach(spec => {
          spec.tests?.forEach(test => {
            if (test.status === 'failed' || test.status === 'timedOut') {
              failed++;
            } else if (test.status === 'passed') {
              passed++;
            }
          });
        });
      });
      
      if (failed > 0) {
        issueReport.issues.push({
          type: `${result.name} Failures`,
          count: failed,
          critical: result.critical,
          passed,
          total: failed + passed
        });
      }
    }
  } catch (e) {
    // Fallback parsing
    const failMatch = result.stdout.match(/(\d+) failed/);
    const passMatch = result.stdout.match(/(\d+) passed/);
    
    if (failMatch) {
      issueReport.issues.push({
        type: `${result.name} Failures`,
        count: parseInt(failMatch[1]),
        critical: result.critical,
        passed: passMatch ? parseInt(passMatch[1]) : 0
      });
    }
  }
}

function parseResults(result) {
  issueReport.summary.total++;
  
  if (result.code === 0) {
    issueReport.summary.passed++;
  } else {
    issueReport.summary.failed++;
    if (result.critical) {
      issueReport.summary.critical_failures++;
    }
  }

  switch (result.parser) {
    case 'audit':
      parseAuditResults(result);
      break;
    case 'typescript':
      parseTypescriptResults(result);
      break;
    case 'vitest':
      parseVitestResults(result);
      break;
    case 'playwright':
      parsePlaywrightResults(result);
      break;
  }
}

function generateReport() {
  const reportPath = join(REPORT_DIR, `test-report-${TIMESTAMP}.json`);
  const summaryPath = join(REPORT_DIR, 'latest-summary.json');
  const htmlPath = join(REPORT_DIR, `test-report-${TIMESTAMP}.html`);

  // Save JSON report
  writeFileSync(reportPath, JSON.stringify(issueReport, null, 2));
  writeFileSync(summaryPath, JSON.stringify(issueReport, null, 2));

  // Generate HTML report
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>CareSync Test Report - ${TIMESTAMP}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-card.passed { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .stat-card.failed { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .stat-card.critical { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .stat-value { font-size: 36px; font-weight: bold; margin: 10px 0; }
    .stat-label { font-size: 14px; opacity: 0.9; }
    .issue-list { margin: 20px 0; }
    .issue-item { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .issue-item.warning { background: #fffbeb; border-left-color: #f59e0b; }
    .issue-item.info { background: #eff6ff; border-left-color: #3b82f6; }
    .issue-title { font-weight: bold; color: #1f2937; margin-bottom: 5px; }
    .issue-details { color: #6b7280; font-size: 14px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-left: 10px; }
    .badge.critical { background: #fee2e2; color: #991b1b; }
    .badge.high { background: #fed7aa; color: #9a3412; }
    .badge.medium { background: #fef3c7; color: #92400e; }
    .badge.low { background: #dbeafe; color: #1e40af; }
    .timestamp { color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    tr:hover { background: #f9fafb; }
    .no-issues { background: #d1fae5; color: #065f46; padding: 20px; border-radius: 8px; text-align: center; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏥 CareSync HMS - Automated Test Report</h1>
    
    <div class="summary">
      <div class="stat-card">
        <div class="stat-label">Total Suites</div>
        <div class="stat-value">${issueReport.summary.total}</div>
      </div>
      <div class="stat-card passed">
        <div class="stat-label">Passed</div>
        <div class="stat-value">${issueReport.summary.passed}</div>
      </div>
      <div class="stat-card failed">
        <div class="stat-label">Failed</div>
        <div class="stat-value">${issueReport.summary.failed}</div>
      </div>
      <div class="stat-card critical">
        <div class="stat-label">Critical Failures</div>
        <div class="stat-value">${issueReport.summary.critical_failures}</div>
      </div>
    </div>

    <h2>🔴 Issues Detected</h2>
    <div class="issue-list">
      ${issueReport.issues.length === 0 ? '<div class="no-issues">✅ No issues detected!</div>' : ''}
      ${issueReport.issues.map(issue => `
        <div class="issue-item ${issue.critical ? '' : 'warning'}">
          <div class="issue-title">
            ${issue.type}
            ${issue.critical ? '<span class="badge critical">CRITICAL</span>' : '<span class="badge medium">WARNING</span>'}
          </div>
          <div class="issue-details">
            Failed: ${issue.count} | Passed: ${issue.passed || 0} | Total: ${issue.total || issue.count}
          </div>
        </div>
      `).join('')}
    </div>

    <h2>🔒 Security Vulnerabilities</h2>
    ${issueReport.security_vulnerabilities.length === 0 ? '<div class="no-issues">✅ No security vulnerabilities detected!</div>' : `
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Count</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          ${issueReport.security_vulnerabilities.map(vuln => `
            <tr>
              <td><span class="badge ${vuln.severity}">${vuln.severity.toUpperCase()}</span></td>
              <td>${vuln.count}</td>
              <td>${vuln.source}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <h2>📦 Dependencies</h2>
    ${issueReport.missing_dependencies.length === 0 ? '<div class="issue-item info"><div class="issue-title">Dependency check completed</div></div>' : `
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          ${issueReport.missing_dependencies.map(dep => `
            <tr>
              <td>Total Dependencies</td>
              <td>${dep.total}</td>
            </tr>
            <tr>
              <td>Production</td>
              <td>${dep.prod}</td>
            </tr>
            <tr>
              <td>Development</td>
              <td>${dep.dev}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <div class="timestamp">
      Generated: ${new Date().toLocaleString()}<br>
      Report ID: ${TIMESTAMP}
    </div>
  </div>
</body>
</html>
  `;

  writeFileSync(htmlPath, html);

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Test Reports Generated:');
  console.log(`${'='.repeat(60)}`);
  console.log(`JSON: ${reportPath}`);
  console.log(`HTML: ${htmlPath}`);
  console.log(`Latest: ${summaryPath}`);
}

async function main() {
  console.log('🚀 Starting Automated Test Suite...\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Total Suites: ${testSuites.length}\n`);

  for (const suite of testSuites) {
    const result = await runCommand(suite);
    parseResults(result);
  }

  generateReport();

  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 Test Summary:');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Suites: ${issueReport.summary.total}`);
  console.log(`✅ Passed: ${issueReport.summary.passed}`);
  console.log(`❌ Failed: ${issueReport.summary.failed}`);
  console.log(`🔴 Critical Failures: ${issueReport.summary.critical_failures}`);
  console.log(`🔒 Security Issues: ${issueReport.security_vulnerabilities.length}`);
  console.log(`${'='.repeat(60)}\n`);

  if (issueReport.summary.critical_failures > 0) {
    console.error('❌ CRITICAL FAILURES DETECTED - Build should not proceed!');
    process.exit(1);
  } else if (issueReport.summary.failed > 0) {
    console.warn('⚠️  Some tests failed - Review required');
    process.exit(1);
  } else {
    console.log('✅ All tests passed successfully!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
