# Automated Testing & Issue Detection - Quick Start Guide

## Overview

CareSync HMS now includes a comprehensive automated testing framework that runs regularly to detect:
- ✅ Broken imports and missing files
- ✅ Broken documentation links
- ✅ Unused dependencies
- ✅ Security vulnerabilities
- ✅ Test failures across all roles
- ✅ Performance issues
- ✅ Accessibility violations

## Quick Start

### Run All Automated Tests
```bash
npm run test:automated
```

### Run Link & Dependency Check
```bash
npm run test:link-check
```

### Run Full Test Suite (Link Check + Automated Tests)
```bash
npm run test:full-suite
```

### Run in CI Mode
```bash
npm run test:ci
```

## Test Reports

All test reports are generated in the `test-reports/` directory:

- **HTML Reports**: Visual, interactive reports with charts and tables
- **JSON Reports**: Machine-readable reports for CI/CD integration
- **Latest Summary**: `test-reports/latest-summary.json` always contains the most recent results

### View Reports
```bash
# Open latest HTML report in browser
open test-reports/test-report-*.html

# View JSON summary
cat test-reports/latest-summary.json | jq
```

## Automated Test Suites

### 1. Link & Dependency Check
**Duration**: ~2 minutes  
**Checks**:
- Broken imports in TypeScript/JavaScript files
- Missing file references
- Broken links in Markdown documentation
- Unused npm dependencies

### 2. Automated Test Runner
**Duration**: ~30-45 minutes  
**Includes**:
- ✅ Dependency audit (npm audit)
- ✅ TypeScript type checking
- ✅ Unit tests (Vitest)
- ✅ Security tests
- ✅ Accessibility tests
- ✅ Integration tests
- ✅ E2E tests for all roles:
  - Admin operations
  - Doctor workflow
  - Pharmacy workflow
  - Laboratory workflow
  - Patient journey
  - Cross-role handoffs
- ✅ Performance tests

## CI/CD Integration

### GitHub Actions Workflow

The automated testing workflow runs:
- ✅ On every push to `main` or `develop`
- ✅ On every pull request
- ✅ Daily at 2 AM UTC (scheduled)
- ✅ Manually via workflow dispatch

### Workflow Jobs

1. **Link Check** - Validates all imports and links
2. **Automated Tests** - Runs full test suite
3. **Security Scan** - npm audit + security tests
4. **Accessibility Check** - A11y compliance tests
5. **Performance Check** - Performance benchmarks
6. **Report Summary** - Aggregates all results

### View Results

- Go to **Actions** tab in GitHub
- Click on latest workflow run
- Download artifacts for detailed reports
- View summary in PR comments

## Test Configuration

### Playwright Configuration
Located in `playwright.config.ts`:
- Base URL: `http://localhost:3000`
- Timeout: 90 seconds per test
- Retries: 1 (in CI), 0 (local)
- Workers: 2 (CI), 1 (local)
- Browsers: Chromium (primary)

### Vitest Configuration
Located in `vitest.config.ts`:
- Test directory: `src/test/`
- Coverage: V8 provider
- Environment: jsdom

## Issue Detection

### Critical Issues (Block Deployment)
- TypeScript compilation errors
- Security vulnerabilities (high/critical)
- Failed E2E tests for critical workflows
- Broken authentication flows

### Warning Issues (Review Required)
- Failed unit tests
- Accessibility violations
- Performance degradation
- Unused dependencies

### Info Issues (Nice to Fix)
- Broken documentation links
- Code style violations
- Missing test coverage

## Scheduled Testing

### Daily Automated Run
- **Time**: 2:00 AM UTC
- **Scope**: Full test suite
- **Notification**: Email on failure
- **Reports**: Archived for 30 days

### Weekly Deep Scan
- **Time**: Sunday 3:00 AM UTC
- **Scope**: Extended tests + security audit
- **Reports**: Archived for 90 days

## Local Development

### Before Committing
```bash
# Quick check
npm run test:link-check

# Full validation
npm run test:full-suite
```

### Pre-Push Hook (Recommended)
Add to `.git/hooks/pre-push`:
```bash
#!/bin/sh
npm run test:link-check || exit 1
```

## Troubleshooting

### Tests Timing Out
- Increase timeout in `playwright.config.ts`
- Check network connectivity
- Verify Supabase credentials

### Broken Import Errors
- Run `npm install` to ensure all dependencies are installed
- Check file paths are correct
- Verify file extensions match

### Link Check False Positives
- External URLs are skipped automatically
- Anchor links (#) are ignored
- Add exceptions in `scripts/link-checker.mjs` if needed

## Report Interpretation

### Test Report Sections

1. **Summary Cards**
   - Total suites run
   - Passed/Failed counts
   - Critical failures

2. **Issues Detected**
   - Test failures by suite
   - Critical vs warning classification
   - Pass/fail ratios

3. **Security Vulnerabilities**
   - Severity levels (critical, high, medium, low)
   - Package names
   - Recommended actions

4. **Dependencies**
   - Total count
   - Production vs development
   - Unused packages

### Link Check Report Sections

1. **Broken Imports**
   - Source file
   - Import path
   - Resolved path (where it tried to find the file)

2. **Broken Links**
   - Documentation file
   - Link text
   - Target URL

3. **Unused Dependencies**
   - Package names that aren't imported anywhere

## Best Practices

### Writing Tests
- ✅ Use descriptive test names
- ✅ Add `@critical` tag for blocking tests
- ✅ Add `@smoke` tag for quick validation
- ✅ Keep tests independent and idempotent
- ✅ Clean up test data after each test

### Maintaining Tests
- 🔄 Review failed tests within 24 hours
- 🔄 Update tests when features change
- 🔄 Remove obsolete tests
- 🔄 Keep test data factories up to date

### CI/CD Integration
- ✅ Block merges on critical test failures
- ✅ Require security scan pass
- ✅ Generate reports for all runs
- ✅ Archive reports for compliance

## Support

### Getting Help
- Check test logs in `test-results/`
- Review HTML reports in `test-reports/`
- Check GitHub Actions logs
- Contact QA team for assistance

### Reporting Issues
When reporting test issues, include:
1. Test name and file
2. Error message
3. Screenshot (for E2E tests)
4. Steps to reproduce
5. Environment details

## Next Steps

1. ✅ Run initial test suite: `npm run test:automated`
2. ✅ Review generated reports
3. ✅ Fix any critical issues
4. ✅ Set up GitHub Actions (already configured)
5. ✅ Schedule regular reviews of test results

---

**Last Updated**: February 2026  
**Maintained By**: QA Team  
**Review Cycle**: Monthly
