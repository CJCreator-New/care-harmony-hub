# CareSync Code Review Guide

## Overview

This guide provides comprehensive instructions for using the CareSync Code Reviewer tool to ensure code quality, security, compliance, and performance across the entire codebase.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Review Categories](#review-categories)
3. [Running Reviews](#running-reviews)
4. [Configuration](#configuration)
5. [CI/CD Integration](#cicd-integration)
6. [Understanding Results](#understanding-results)
7. [Remediation](#remediation)
8. [Best Practices](#best-practices)

## Getting Started

### Installation

The code reviewer is built into the CareSync project. No separate installation is required.

### Initial Setup

1. **Initialize Configuration**:
   ```bash
   npm run review:init
   ```

2. **Setup Git Hooks** (optional):
   ```bash
   npm run review:setup-hooks
   ```

3. **Setup CI/CD** (optional):
   ```bash
   npm run review:setup-ci
   ```

## Review Categories

### Security
- Hardcoded secrets detection
- SQL injection prevention
- Authentication/authorization validation
- Session management
- RBAC implementation

### Compliance
- HIPAA compliance verification
- PHI logging detection
- Audit trail validation
- Consent management
- Data retention policies

### Performance
- N+1 query detection
- Bundle size optimization
- Memory leak prevention
- Pagination implementation
- Query optimization

### Quality
- Code maintainability
- Error handling
- Magic number detection
- Function length validation
- Technical debt tracking

### Accessibility
- WCAG compliance
- Alt text validation
- Form labels
- Keyboard navigation
- ARIA roles

### Testing
- Test coverage analysis
- Error scenario testing
- Clinical logic testing
- Mock data validation
- Integration test coverage

## Running Reviews

### Quick Security Check
```bash
npm run review:check
```
Runs security and compliance checks only.

### Full Review
```bash
npm run review:run
```
Runs comprehensive review across all categories.

### Category-Specific Review
```bash
npx caresync-review run --categories security,compliance
```

### Custom Configuration
```bash
npx caresync-review run --config custom-config.json
```

## Configuration

### Configuration File (`.code-reviewer.json`)

```json
{
  "basePath": ".",
  "excludePatterns": [
    "node_modules/**",
    "dist/**",
    "build/**"
  ],
  "categories": {
    "security": {
      "enabled": true,
      "filePatterns": ["**/*.{ts,tsx,js,jsx}"]
    },
    "compliance": {
      "enabled": true,
      "filePatterns": ["**/*.{ts,tsx,js,jsx}"]
    }
  },
  "ci": {
    "failOnSeverity": "high",
    "maxIssues": 100,
    "reportFormats": ["json", "html", "sarif"]
  }
}
```

### Configuration Options

- **basePath**: Root directory for analysis
- **excludePatterns**: Files/patterns to exclude
- **categories**: Enable/disable specific categories
- **ci**: CI/CD pipeline settings
- **reporting**: Output format preferences

## CI/CD Integration

### GitHub Actions

The tool automatically creates `.github/workflows/code-review.yml`:

```yaml
name: Code Review
on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run review:run
      - uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: code-review-results.sarif
```

### Git Hooks

Pre-commit and pre-push hooks are automatically installed:

- **Pre-commit**: Quick security/compliance check
- **Pre-push**: Full validation before push

### Pipeline Stages

1. **Pre-commit**: Security & compliance (fast)
2. **Pre-push**: Full validation (comprehensive)
3. **CI/CD**: Complete analysis with reporting

## Understanding Results

### Severity Levels

- **Critical**: Must fix immediately (security breaches, HIPAA violations)
- **High**: Should fix before merge (performance issues, missing tests)
- **Medium**: Fix in next sprint (code quality, maintainability)
- **Low**: Nice to have (minor optimizations)
- **Info**: Suggestions (documentation, best practices)

### Report Formats

#### JSON
```json
{
  "category": "security",
  "issues": [
    {
      "file": "src/utils/auth.ts",
      "line": 45,
      "severity": "critical",
      "message": "Hardcoded secret detected",
      "suggestion": "Use environment variables"
    }
  ]
}
```

#### HTML
Interactive dashboard with filtering and search.

#### SARIF
GitHub Security tab integration format.

### Dashboard

Access the review dashboard:
```bash
npm run review:dashboard
```

Features:
- Real-time issue tracking
- Historical trends
- Category breakdown
- Severity distribution
- Remediation suggestions

## Remediation

### Automated Fixes

Some issues can be auto-fixed:
```bash
npx caresync-review fix --rule magic-number
```

### Manual Remediation

1. **Security Issues**:
   - Move secrets to environment variables
   - Implement parameterized queries
   - Add RBAC checks

2. **Compliance Issues**:
   - Remove PHI from logs
   - Add audit trails
   - Implement consent checks

3. **Performance Issues**:
   - Optimize database queries
   - Implement pagination
   - Add caching

4. **Quality Issues**:
   - Refactor long functions
   - Add error handling
   - Extract constants

### Healthcare Context

Each rule includes healthcare-specific context explaining why the issue matters for patient safety and compliance.

## Best Practices

### Development Workflow

1. **Before Committing**:
   ```bash
   npm run review:check
   ```

2. **Before Pushing**:
   ```bash
   npm run review:run
   ```

3. **Before Merging**:
   - Review all critical/high issues
   - Ensure CI passes
   - Get peer review

### Code Review Checklist

- [ ] Security scan passed
- [ ] Compliance requirements met
- [ ] Performance acceptable
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Accessibility verified

### Team Collaboration

1. **Issue Assignment**:
   - Assign critical issues immediately
   - Set due dates for high priority
   - Track resolution progress

2. **Knowledge Sharing**:
   - Document common issues
   - Share remediation patterns
   - Update team guidelines

3. **Continuous Improvement**:
   - Review metrics regularly
   - Adjust rules as needed
   - Update best practices

### Monitoring

Track key metrics:
- Issues resolved per sprint
- Time to resolution
- Code quality trends
- Compliance score
- Security posture

## Troubleshooting

### Common Issues

1. **Configuration Not Found**:
   ```bash
   npm run review:init
   ```

2. **Permission Denied**:
   ```bash
   chmod +x scripts/run-code-review.js
   ```

3. **Out of Memory**:
   Increase Node.js heap size:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run review:run
   ```

### Support

For issues or questions:
- Check the troubleshooting section
- Review the configuration guide
- Contact the development team

## Advanced Usage

### Custom Rules

Add custom rules in `src/utils/codeReviewerRules.ts`:

```typescript
{
  id: 'custom-rule',
  category: 'quality',
  severity: 'medium',
  message: 'Custom validation message',
  pattern: /custom-pattern/,
  suggestion: 'How to fix'
}
```

### Integration with Other Tools

- **ESLint**: Runs alongside ESLint
- **Prettier**: Compatible with formatting
- **TypeScript**: Type-aware analysis
- **Playwright**: E2E test integration

### API Usage

```typescript
import { CodeReviewer } from './src/utils/codeReviewer';

const reviewer = new CodeReviewer(config);
const results = await reviewer.runReview();
const report = reviewer.exportResults('json');
```

## Conclusion

The CareSync Code Reviewer ensures that all code meets healthcare industry standards for security, compliance, and quality. Regular use of this tool helps maintain a robust, secure, and maintainable codebase.

For updates and improvements, refer to the changelog and contribute to the tool's development.