/**
 * CareSync Code Reviewer Tool
 * Comprehensive code analysis for healthcare applications
 * Ensures security, compliance, performance, and quality standards
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { glob } from 'glob';
import { CodeReviewResult, CodeReviewCategory, CodeReviewIssue, CodeReviewConfig } from '../types/code-review';

export class CodeReviewer {
  private config: CodeReviewConfig;
  private results: CodeReviewResult[] = [];
  private startTime: Date;

  constructor(config: CodeReviewConfig) {
    this.config = config;
    this.startTime = new Date();
  }

  /**
   * Run comprehensive code review
   */
  async runReview(): Promise<CodeReviewResult[]> {
    console.log('🔍 Starting comprehensive code review...');

    // Clear previous results
    this.results = [];

    // Run all enabled categories
    const categories = this.getEnabledCategories();

    for (const category of categories) {
      await this.runCategoryReview(category);
    }

    // Generate summary
    const summary = this.generateSummary();

    console.log('✅ Code review completed');
    console.log(`📊 Found ${summary.totalIssues} issues across ${summary.totalFiles} files`);

    return this.results;
  }

  /**
   * Run review for specific category
   */
  private async runCategoryReview(category: CodeReviewCategory): Promise<void> {
    const categoryConfig = this.config.categories[category];
    if (!categoryConfig?.enabled) return;

    console.log(`🔍 Reviewing ${category}...`);

    const files = await this.getFilesForCategory(category);
    const issues: CodeReviewIssue[] = [];

    for (const file of files) {
      const fileIssues = await this.analyzeFile(file, category);
      issues.push(...fileIssues);
    }

    const result: CodeReviewResult = {
      category,
      timestamp: new Date(),
      filesAnalyzed: files.length,
      issues,
      summary: {
        totalIssues: issues.length,
        criticalIssues: issues.filter(i => i.severity === 'critical').length,
        highIssues: issues.filter(i => i.severity === 'high').length,
        mediumIssues: issues.filter(i => i.severity === 'medium').length,
        lowIssues: issues.filter(i => i.severity === 'low').length,
        infoIssues: issues.filter(i => i.severity === 'info').length,
      },
      duration: Date.now() - this.startTime.getTime(),
    };

    this.results.push(result);
  }

  /**
   * Analyze individual file for specific category
   */
  private async analyzeFile(filePath: string, category: CodeReviewCategory): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = [];

    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Apply category-specific analysis
      switch (category) {
        case 'security':
          issues.push(...this.analyzeSecurity(filePath, content, lines));
          break;
        case 'compliance':
          issues.push(...this.analyzeCompliance(filePath, content, lines));
          break;
        case 'performance':
          issues.push(...this.analyzePerformance(filePath, content, lines));
          break;
        case 'quality':
          issues.push(...this.analyzeQuality(filePath, content, lines));
          break;
        case 'accessibility':
          issues.push(...this.analyzeAccessibility(filePath, content, lines));
          break;
        case 'testing':
          issues.push(...this.analyzeTesting(filePath, content, lines));
          break;
      }
    } catch (error) {
      issues.push({
        file: filePath,
        line: 1,
        column: 1,
        severity: 'high',
        category,
        rule: 'file-read-error',
        message: `Failed to analyze file: ${error.message}`,
        suggestion: 'Ensure file is readable and not corrupted',
        code: '',
      });
    }

    return issues;
  }

  /**
   * Security analysis - PHI, authentication, authorization
   */
  private analyzeSecurity(filePath: string, content: string, lines: string[]): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];

    // Check for hardcoded secrets
    const secretPatterns = [
      /password\s*[:=]\s*['"]([^'"]+)['"]/gi,
      /secret\s*[:=]\s*['"]([^'"]+)['"]/gi,
      /token\s*[:=]\s*['"]([^'"]+)['"]/gi,
      /api[_-]?key\s*[:=]\s*['"]([^'"]+)['"]/gi,
    ];

    lines.forEach((line, index) => {
      secretPatterns.forEach(pattern => {
        const match = pattern.exec(line);
        if (match) {
          issues.push({
            file: filePath,
            line: index + 1,
            column: match.index,
            severity: 'critical',
            category: 'security',
            rule: 'hardcoded-secret',
            message: 'Hardcoded secret detected',
            suggestion: 'Use environment variables or secure credential storage',
            code: line.trim(),
          });
        }
      });
    });

    // Check for SQL injection vulnerabilities
    const sqlInjectionPatterns = [
      /\${\w+}/g, // Template literals with variables
      /concat.*\+/gi, // String concatenation in SQL
    ];

    content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').forEach((line, index) => {
      sqlInjectionPatterns.forEach(pattern => {
        if (pattern.test(line) && /select|insert|update|delete/i.test(line)) {
          issues.push({
            file: filePath,
            line: index + 1,
            column: 0,
            severity: 'high',
            category: 'security',
            rule: 'sql-injection-risk',
            message: 'Potential SQL injection vulnerability',
            suggestion: 'Use parameterized queries or prepared statements',
            code: line.trim(),
          });
        }
      });
    });

    // Check for weak authentication
    if (content.includes('password') && !content.includes('bcrypt') && !content.includes('argon2')) {
      issues.push({
        file: filePath,
        line: 1,
        column: 1,
        severity: 'high',
        category: 'security',
        rule: 'weak-password-hashing',
        message: 'Weak or missing password hashing',
        suggestion: 'Use bcrypt or argon2 for password hashing',
        code: '',
      });
    }

    return issues;
  }

  /**
   * Compliance analysis - HIPAA, PHI handling, audit trails
   */
  private analyzeCompliance(filePath: string, content: string, lines: string[]): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];

    // Check for PHI logging
    const phiPatterns = [
      /\b(ssn|social.security)\b/gi,
      /\b(dob|date.of.birth)\b/gi,
      /\b(medical.record|mrn)\b/gi,
      /\b(diagnosis|treatment)\b/gi,
    ];

    lines.forEach((line, index) => {
      if (line.includes('console.log') || line.includes('logger.')) {
        phiPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            issues.push({
              file: filePath,
              line: index + 1,
              column: 0,
              severity: 'critical',
              category: 'compliance',
              rule: 'phi-logging',
              message: 'Potential PHI data in logs',
              suggestion: 'Never log PHI data. Use anonymized identifiers',
              code: line.trim(),
            });
          }
        });
      }
    });

    // Check for missing audit trails
    const criticalOperations = ['create', 'update', 'delete'];
    const hasAudit = content.includes('audit') || content.includes('log');

    if (criticalOperations.some(op => content.includes(op)) && !hasAudit) {
      issues.push({
        file: filePath,
        line: 1,
        column: 1,
        severity: 'high',
        category: 'compliance',
        rule: 'missing-audit-trail',
        message: 'Critical operations without audit logging',
        suggestion: 'Implement comprehensive audit trails for all data modifications',
        code: '',
      });
    }

    // Check for proper data retention
    if (content.includes('delete') && !content.includes('retention') && !content.includes('archive')) {
      issues.push({
        file: filePath,
        line: 1,
        column: 1,
        severity: 'medium',
        category: 'compliance',
        rule: 'data-retention-policy',
        message: 'Data deletion without retention policy consideration',
        suggestion: 'Implement data retention policies per HIPAA requirements',
        code: '',
      });
    }

    return issues;
  }

  /**
   * Performance analysis - queries, bundle size, memory usage
   */
  private analyzePerformance(filePath: string, content: string, lines: string[]): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];

    // Check for N+1 query patterns
    const loopQueryPattern = /for.*\{[\s\S]*?query|map.*query|forEach.*query/gi;
    if (loopQueryPattern.test(content)) {
      issues.push({
        file: filePath,
        line: 1,
        column: 1,
        severity: 'high',
        category: 'performance',
        rule: 'n-plus-one-query',
        message: 'Potential N+1 query pattern detected',
        suggestion: 'Use batch queries or eager loading to optimize database access',
        code: '',
      });
    }

    // Check for large bundle imports
    const largeImports = [
      'import.*from.*lodash',
      'import.*from.*moment',
      'import.*\\*.*from',
    ];

    lines.forEach((line, index) => {
      largeImports.forEach(pattern => {
        if (new RegExp(pattern).test(line)) {
          issues.push({
            file: filePath,
            line: index + 1,
            column: 0,
            severity: 'medium',
            category: 'performance',
            rule: 'large-bundle-import',
            message: 'Large library import may increase bundle size',
            suggestion: 'Use tree-shaking friendly imports or lazy loading',
            code: line.trim(),
          });
        }
      });
    });

    // Check for memory leaks
    if (content.includes('setInterval') && !content.includes('clearInterval')) {
      issues.push({
        file: filePath,
        line: 1,
        column: 1,
        severity: 'medium',
        category: 'performance',
        rule: 'memory-leak-potential',
        message: 'setInterval without corresponding clearInterval',
        suggestion: 'Always clear intervals to prevent memory leaks',
        code: '',
      });
    }

    return issues;
  }

  /**
   * Code quality analysis - maintainability, best practices
   */
  private analyzeQuality(filePath: string, content: string, lines: string[]): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];

    // Check function length
    const functions = content.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || [];
    functions.forEach(func => {
      const funcStart = content.indexOf(func);
      const funcBody = content.substring(funcStart, content.indexOf('}', funcStart) + 1);
      const lineCount = funcBody.split('\n').length;

      if (lineCount > 50) {
        issues.push({
          file: filePath,
          line: content.substring(0, funcStart).split('\n').length,
          column: 0,
          severity: 'medium',
          category: 'quality',
          rule: 'long-function',
          message: `Function is too long (${lineCount} lines)`,
          suggestion: 'Break down into smaller, focused functions',
          code: func,
        });
      }
    });

    // Check for magic numbers
    lines.forEach((line, index) => {
      const magicNumberPattern = /\b\d{2,}\b/g;
      const matches = line.match(magicNumberPattern);
      if (matches) {
        matches.forEach(match => {
          if (!/^(0|1|100)$/.test(match)) { // Allow common numbers
            issues.push({
              file: filePath,
              line: index + 1,
              column: line.indexOf(match),
              severity: 'low',
              category: 'quality',
              rule: 'magic-number',
              message: `Magic number: ${match}`,
              suggestion: 'Extract to named constant',
              code: line.trim(),
            });
          }
        });
      }
    });

    // Check for TODO comments
    lines.forEach((line, index) => {
      if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
        issues.push({
          file: filePath,
          line: index + 1,
          column: 0,
          severity: 'info',
          category: 'quality',
          rule: 'todo-comment',
          message: 'TODO/FIXME comment found',
          suggestion: 'Address technical debt or create issue ticket',
          code: line.trim(),
        });
      }
    });

    return issues;
  }

  /**
   * Accessibility analysis - WCAG compliance, ARIA usage
   */
  private analyzeAccessibility(filePath: string, content: string, lines: string[]): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];

    // Check for missing alt text
    if (content.includes('<img') && !content.includes('alt=')) {
      issues.push({
        file: filePath,
        line: 1,
        column: 1,
        severity: 'high',
        category: 'accessibility',
        rule: 'missing-alt-text',
        message: 'Image without alt text',
        suggestion: 'Add descriptive alt attribute for screen readers',
        code: '',
      });
    }

    // Check for missing form labels
    if (content.includes('<input') && !content.includes('<label')) {
      issues.push({
        file: filePath,
        line: 1,
        column: 1,
        severity: 'high',
        category: 'accessibility',
        rule: 'missing-form-label',
        message: 'Form input without associated label',
        suggestion: 'Add label element or aria-label attribute',
        code: '',
      });
    }

    // Check for insufficient color contrast (basic check)
    const colorPatterns = /color\s*:\s*#[0-9a-fA-F]{3,6}/g;
    const matches = content.match(colorPatterns);
    if (matches && matches.length > 1) {
      issues.push({
        file: filePath,
        line: 1,
        column: 1,
        severity: 'medium',
        category: 'accessibility',
        rule: 'color-contrast-check',
        message: 'Multiple colors defined - verify contrast ratio',
        suggestion: 'Ensure 4.5:1 contrast ratio for WCAG AA compliance',
        code: '',
      });
    }

    return issues;
  }

  /**
   * Testing analysis - coverage, test quality, mocking
   */
  private analyzeTesting(filePath: string, content: string, lines: string[]): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];

    // Check for test files with low coverage indicators
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      const testCount = (content.match(/it\(|describe\(|test\(/g) || []).length;
      if (testCount < 3) {
        issues.push({
          file: filePath,
          line: 1,
          column: 1,
          severity: 'medium',
          category: 'testing',
          rule: 'insufficient-test-coverage',
          message: `Low test count (${testCount} tests)`,
          suggestion: 'Add more comprehensive test cases',
          code: '',
        });
      }
    }

    // Check for missing error handling in tests
    if (filePath.includes('.test.') && content.includes('expect') && !content.includes('catch') && !content.includes('rejects')) {
      issues.push({
        file: filePath,
        line: 1,
        column: 1,
        severity: 'low',
        category: 'testing',
        rule: 'missing-error-testing',
        message: 'Test may not cover error scenarios',
        suggestion: 'Add tests for error conditions and edge cases',
        code: '',
      });
    }

    // Check for clinical logic without corresponding tests
    const clinicalKeywords = ['diagnosis', 'treatment', 'medication', 'prescription'];
    const hasClinicalLogic = clinicalKeywords.some(keyword => content.includes(keyword));
    const isTestFile = filePath.includes('.test.') || filePath.includes('.spec.');

    if (hasClinicalLogic && !isTestFile) {
      // Look for corresponding test file
      const testFilePath = filePath.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1');
      try {
        statSync(testFilePath);
      } catch {
        issues.push({
          file: filePath,
          line: 1,
          column: 1,
          severity: 'high',
          category: 'testing',
          rule: 'missing-clinical-tests',
          message: 'Clinical logic without corresponding tests',
          suggestion: 'Create comprehensive tests for clinical decision logic',
          code: '',
        });
      }
    }

    return issues;
  }

  /**
   * Get files to analyze for specific category
   */
  private async getFilesForCategory(category: CodeReviewCategory): Promise<string[]> {
    const categoryConfig = this.config.categories[category];
    const patterns = categoryConfig?.filePatterns || ['**/*'];

    let files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.config.basePath,
        ignore: this.config.excludePatterns,
        absolute: true,
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Get enabled categories
   */
  private getEnabledCategories(): CodeReviewCategory[] {
    return Object.entries(this.config.categories)
      .filter(([_, config]) => config.enabled)
      .map(([category]) => category as CodeReviewCategory);
  }

  /**
   * Generate review summary
   */
  private generateSummary() {
    const totalIssues = this.results.reduce((sum, result) => sum + result.summary.totalIssues, 0);
    const totalFiles = this.results.reduce((sum, result) => sum + result.filesAnalyzed, 0);
    const criticalIssues = this.results.reduce((sum, result) => sum + result.summary.criticalIssues, 0);
    const highIssues = this.results.reduce((sum, result) => sum + result.summary.highIssues, 0);

    return {
      totalIssues,
      totalFiles,
      criticalIssues,
      highIssues,
      duration: Date.now() - this.startTime.getTime(),
      categories: this.results.length,
    };
  }

  /**
   * Export results in various formats
   */
  exportResults(format: 'json' | 'html' | 'markdown' | 'sarif' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.results, null, 2);
      case 'html':
        return this.generateHtmlReport();
      case 'markdown':
        return this.generateMarkdownReport();
      case 'sarif':
        return this.generateSarifReport();
      default:
        return JSON.stringify(this.results, null, 2);
    }
  }

  private generateHtmlReport(): string {
    // HTML report generation
    return `
<!DOCTYPE html>
<html>
<head>
    <title>CareSync Code Review Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .issue { margin: 10px 0; padding: 10px; border-left: 4px solid; }
        .critical { border-color: #dc3545; background: #f8d7da; }
        .high { border-color: #fd7e14; background: #fff3cd; }
        .medium { border-color: #ffc107; background: #fff3cd; }
        .low { border-color: #28a745; background: #d4edda; }
        .info { border-color: #17a2b8; background: #d1ecf1; }
    </style>
</head>
<body>
    <h1>CareSync Code Review Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Issues: ${this.results.reduce((sum, r) => sum + r.summary.totalIssues, 0)}</p>
        <p>Files Analyzed: ${this.results.reduce((sum, r) => sum + r.filesAnalyzed, 0)}</p>
        <p>Duration: ${Date.now() - this.startTime.getTime()}ms</p>
    </div>
    ${this.results.map(result => `
        <h2>${result.category.toUpperCase()}</h2>
        ${result.issues.map(issue => `
            <div class="issue ${issue.severity}">
                <strong>${issue.severity.toUpperCase()}: ${issue.message}</strong><br>
                <small>${issue.file}:${issue.line}:${issue.column}</small><br>
                <code>${issue.code}</code><br>
                <em>Suggestion: ${issue.suggestion}</em>
            </div>
        `).join('')}
    `).join('')}
</body>
</html>`;
  }

  private generateMarkdownReport(): string {
    return `# CareSync Code Review Report

Generated: ${new Date().toISOString()}

## Summary
- Total Issues: ${this.results.reduce((sum, r) => sum + r.summary.totalIssues, 0)}
- Files Analyzed: ${this.results.reduce((sum, r) => sum + r.filesAnalyzed, 0)}
- Duration: ${Date.now() - this.startTime.getTime()}ms

${this.results.map(result => `
## ${result.category.toUpperCase()}
- Issues: ${result.summary.totalIssues}
- Critical: ${result.summary.criticalIssues}
- High: ${result.summary.highIssues}
- Medium: ${result.summary.mediumIssues}

${result.issues.map(issue => `
### ${issue.severity.toUpperCase()}: ${issue.message}
- File: ${issue.file}:${issue.line}:${issue.column}
- Rule: ${issue.rule}
- Code: \`${issue.code}\`
- Suggestion: ${issue.suggestion}
`).join('')}
`).join('')}
`;
  }

  private generateSarifReport(): string {
    // SARIF (Static Analysis Results Interchange Format) for GitHub Security tab
    const sarif = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'CareSync Code Reviewer',
            version: '1.0.0',
            rules: []
          }
        },
        results: this.results.flatMap(result =>
          result.issues.map(issue => ({
            ruleId: issue.rule,
            level: issue.severity === 'info' ? 'note' : issue.severity,
            message: { text: issue.message },
            locations: [{
              physicalLocation: {
                artifactLocation: { uri: relative(process.cwd(), issue.file) },
                region: {
                  startLine: issue.line,
                  startColumn: issue.column
                }
              }
            }],
            properties: {
              category: issue.category,
              suggestion: issue.suggestion
            }
          }))
        )
      }]
    };

    return JSON.stringify(sarif, null, 2);
  }
}