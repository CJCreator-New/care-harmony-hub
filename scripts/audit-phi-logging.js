#!/usr/bin/env node

/**
 * HP-3 PR3: PHI Sanitization Audit Script
 *
 * Scans codebase for:
 * - Unprotected console logging
 * - Direct error message exposure
 * - Potential PHI leakage patterns
 * - Missing sanitization in critical areas
 *
 * Usage: node scripts/audit-phi-logging.js
 */

const fs = require('fs');
const path = require('path');

interface Finding {
  file: string;
  line: number;
  code: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
}

const findings: Finding[] = [];

// Patterns that indicate potential PHI logging
const risky_patterns = [
  {
    pattern: /console\.(log|error|warn|info)\s*\(\s*(?!['"`])/,
    description: 'Direct console logging without string literals (may contain variables)',
    risk: 'high',
  },
  {
    pattern: /\.message\s*\)/,
    description: 'Direct error.message access (may contain PHI)',
    risk: 'high',
  },
  {
    pattern: /catch[\s\(]*\(.*\).*\{[^}]*console/,
    description: 'Console logging in catch block (may expose stack trace)',
    risk: 'high',
  },
  {
    pattern: /logger\.(error|warn|info)\(\s*(?!['"]|(.*sanitize))/,
    description: 'Logger call not using sanitization',
    risk: 'medium',
  },
  {
    pattern: /JSON\.stringify\(\s*\w+.*patient/i,
    description: 'JSON stringifying patient object (may contain PHI)',
    risk: 'high',
  },
  {
    pattern: /\$\{[^}]*\.(email|phone|ssn|mrn)\}/i,
    description: 'Template literal with potential PHI field',
    risk: 'critical',
  },
];

// Safe patterns (already using sanitization)
const safe_patterns = [
  /sanitizeLogMessage|sanitizeForLog/,
  /sanitizeInput|sanitizeHtml/,
  /devError|devLog/,
  /error\.getSanitizedMessage\(\)/,
];

function isSafe(code: string): boolean {
  return safe_patterns.some(pattern => pattern.test(code));
}

function scanFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

    // Check for risky patterns
    risky_patterns.forEach(({ pattern, description, risk }) => {
      if (pattern.test(line) && !isSafe(line)) {
        findings.push({
          file: filePath.replace(process.cwd() + '/', ''),
          line: index + 1,
          code: line.trim(),
          riskLevel: risk as any,
          message: description,
          recommendation: getRecommendation(line, risk as any),
        });
      }
    });
  });
}

function getRecommendation(code: string, risk: string): string {
  if (code.includes('JSON.stringify')) {
    return 'Use sanitizeForLog() before stringifying, or log only allowed fields';
  }
  if (code.includes('error.message')) {
    return 'Use error.getSanitizedMessage() or sanitizeForLog(error.message)';
  }
  if (code.includes('console.')) {
    return 'If logging variables, wrap with sanitizeForLog() or use devLog/devError utilities';
  }
  if (code.includes('logger.')) {
    return 'Wrap logged values with sanitizeForLog() or use pre-sanitized fields only';
  }
  return 'Review and sanitize before logging';
}

function walkDir(dir: string, callback: (file: string) => void): void {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    // Skip node_modules, build artifacts, tests
    if (['node_modules', 'dist', 'build', '.next', '.git'].includes(file)) return;

    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);

    if (stat.isDirectory()) {
      walkDir(filepath, callback);
    } else if (/\.(ts|tsx|js|jsx)$/.test(filepath)) {
      // Skip test files for this summary
      if (!filepath.includes('.test.') && !filepath.includes('.spec.')) {
        callback(filepath);
      }
    }
  });
}

// Main execution
function main() {
  console.log('🔍 Starting PHI Logging Audit...\n');

  const srcDir = path.join(process.cwd(), 'src');
  const edgeFunctionsDir = path.join(process.cwd(), 'supabase', 'functions');

  // Scan source directories
  [srcDir, edgeFunctionsDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      walkDir(dir, scanFile);
    }
  });

  // Sort by risk level
  findings.sort((a, b) => {
    const riskMap = { critical: 3, high: 2, medium: 1, low: 0 };
    return riskMap[b.riskLevel] - riskMap[a.riskLevel];
  });

  // Generate report
  console.log(`📊 AUDIT RESULTS: Found ${findings.length} potential issues\n`);

  if (findings.length === 0) {
    console.log('✅ No obvious PHI logging risks detected!');
    process.exit(0);
  }

  const byRisk = groupBy(findings, 'riskLevel');

  Object.entries(byRisk).reverse().forEach(([risk, items]: [string, Finding[]]) => {
    console.log(`\n🔴 ${risk.toUpperCase()} RISK (${items.length} items):`);
    console.log('═'.repeat(80));

    items.forEach(finding => {
      console.log(`\n  📁 ${finding.file}:${finding.line}`);
      console.log(`  ⚠️  ${finding.message}`);
      console.log(`  📝 Code: ${finding.code}`);
      console.log(`  ✅ Fix: ${finding.recommendation}`);
    });
  });

  // Summary
  console.log('\n\n' + '═'.repeat(80));
  console.log('📋 SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total Findings: ${findings.length}`);
  console.log(`  🔴 Critical: ${byRisk.critical?.length || 0}`);
  console.log(`  🟠 High: ${byRisk.high?.length || 0}`);
  console.log(`  🟡 Medium: ${byRisk.medium?.length || 0}`);
  console.log(`  🟢 Low: ${byRisk.low?.length || 0}`);

  // Exit with error if critical findings
  if (byRisk.critical?.length > 0) {
    console.log('\n❌ AUDIT FAILED: Critical PHI logging risks detected!');
    process.exit(1);
  }

  console.log('\n⚠️  Review recommendations and address high-risk items before production');
  process.exit(0);
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

main();
