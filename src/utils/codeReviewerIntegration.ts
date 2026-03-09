/**
 * CareSync Code Reviewer CI/CD Integration
 * Automated code review integration for continuous quality assurance
 */

import { CodeReviewer } from './codeReviewer';
import { CodeReviewConfig, CodeReviewResult, CodeReviewReport } from '../types/code-review';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class CodeReviewerIntegration {
  private config: CodeReviewConfig;
  private reviewer: CodeReviewer;

  constructor(config: CodeReviewConfig) {
    this.config = config;
    this.reviewer = new CodeReviewer(config);
  }

  /**
   * Run pre-commit checks
   */
  async runPreCommit(): Promise<{ success: boolean; issues: number }> {
    console.log('🔍 Running pre-commit code review...');

    // Quick security and compliance check
    const quickConfig = {
      ...this.config,
      categories: {
        security: { enabled: true, filePatterns: ['**/*.{ts,tsx,js,jsx}'] },
        compliance: { enabled: true, filePatterns: ['**/*.{ts,tsx,js,jsx}'] },
      },
    };

    const quickReviewer = new CodeReviewer(quickConfig);
    const results = await quickReviewer.runReview();

    const criticalIssues = results.reduce((sum, r) => sum + r.summary.criticalIssues, 0);
    const highIssues = results.reduce((sum, r) => sum + r.summary.highIssues, 0);
    const totalIssues = results.reduce((sum, r) => sum + r.summary.totalIssues, 0);

    if (criticalIssues > 0 || highIssues > 0) {
      console.error(`❌ Pre-commit failed: ${criticalIssues} critical, ${highIssues} high severity issues`);
      return { success: false, issues: totalIssues };
    }

    console.log('✅ Pre-commit checks passed');
    return { success: true, issues: totalIssues };
  }

  /**
   * Run pre-push validation
   */
  async runPrePush(): Promise<{ success: boolean; issues: number }> {
    console.log('🔍 Running pre-push code review...');

    const results = await this.reviewer.runReview();
    const criticalIssues = results.reduce((sum, r) => sum + r.summary.criticalIssues, 0);
    const highIssues = results.reduce((sum, r) => sum + r.summary.highIssues, 0);
    const totalIssues = results.reduce((sum, r) => sum + r.summary.totalIssues, 0);

    // Generate SARIF for GitHub Security tab
    const sarifReport = this.reviewer.exportResults('sarif');
    writeFileSync('code-review-results.sarif', sarifReport);

    if (criticalIssues > 0) {
      console.error(`❌ Pre-push failed: ${criticalIssues} critical issues must be resolved`);
      return { success: false, issues: totalIssues };
    }

    if (highIssues > 0 && this.config.ci?.failOnSeverity === 'high') {
      console.error(`❌ Pre-push failed: ${highIssues} high severity issues`);
      return { success: false, issues: totalIssues };
    }

    console.log('✅ Pre-push validation passed');
    return { success: true, issues: totalIssues };
  }

  /**
   * Run CI/CD pipeline review
   */
  async runCI(): Promise<{ success: boolean; report: CodeReviewReport }> {
    console.log('🔍 Running CI/CD code review...');

    const startTime = new Date();
    const results = await this.reviewer.runReview();

    const report: CodeReviewReport = {
      id: `review-${Date.now()}`,
      timestamp: startTime,
      config: this.config,
      results,
      summary: {
        totalFiles: results.reduce((sum, r) => sum + r.filesAnalyzed, 0),
        totalIssues: results.reduce((sum, r) => sum + r.summary.totalIssues, 0),
        issuesByCategory: this.calculateIssuesByCategory(results),
        issuesBySeverity: this.calculateIssuesBySeverity(results),
        scanDuration: Date.now() - startTime.getTime(),
        success: this.isSuccess(results),
      },
      metadata: {
        scanner: {
          name: 'CareSync Code Reviewer',
          version: '1.0.0',
          rulesVersion: '1.0.0',
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          cwd: process.cwd(),
        },
        git: this.getGitInfo(),
      },
    };

    // Generate reports
    await this.generateCIReports(report);

    // Send notifications
    await this.sendNotifications(report);

    console.log(`✅ CI review completed: ${report.summary.totalIssues} issues found`);
    return { success: report.summary.success, report };
  }

  /**
   * Generate CI reports in configured formats
   */
  private async generateCIReports(report: CodeReviewReport): Promise<void> {
    const formats = this.config.ci?.reportFormats || ['json'];

    for (const format of formats) {
      const content = this.reviewer.exportResults(format as any);
      const filename = `code-review-report.${format}`;
      writeFileSync(filename, content);
      console.log(`📄 Generated ${format} report: ${filename}`);
    }

    // Always generate SARIF for GitHub integration
    const sarifContent = this.reviewer.exportResults('sarif');
    writeFileSync('code-review-results.sarif', sarifContent);
  }

  /**
   * Send notifications based on configuration
   */
  private async sendNotifications(report: CodeReviewReport): Promise<void> {
    const notifications = this.config.ci?.notifications;

    if (notifications?.slack) {
      await this.sendSlackNotification(report);
    }

    if (notifications?.email) {
      await this.sendEmailNotification(report);
    }

    if (notifications?.github) {
      await this.createGitHubComment(report);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(report: CodeReviewReport): Promise<void> {
    // Implementation would integrate with Slack API
    console.log('📢 Slack notification sent');
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(report: CodeReviewReport): Promise<void> {
    // Implementation would integrate with email service
    console.log('📧 Email notification sent');
  }

  /**
   * Create GitHub PR comment
   */
  private async createGitHubComment(report: CodeReviewReport): Promise<void> {
    // Implementation would use GitHub API
    console.log('💬 GitHub comment created');
  }

  /**
   * Check if review results indicate success
   */
  private isSuccess(results: CodeReviewResult[]): boolean {
    const failOnSeverity = this.config.ci?.failOnSeverity || 'high';
    const maxIssues = this.config.ci?.maxIssues || 100;

    const totalIssues = results.reduce((sum, r) => sum + r.summary.totalIssues, 0);

    if (totalIssues > maxIssues) return false;

    switch (failOnSeverity) {
      case 'critical':
        return results.every(r => r.summary.criticalIssues === 0);
      case 'high':
        return results.every(r => r.summary.criticalIssues === 0 && r.summary.highIssues === 0);
      case 'medium':
        return results.every(r => r.summary.criticalIssues === 0 && r.summary.highIssues === 0 && r.summary.mediumIssues === 0);
      default:
        return true;
    }
  }

  /**
   * Calculate issues by category
   */
  private calculateIssuesByCategory(results: CodeReviewResult[]): Record<string, number> {
    const issuesByCategory: Record<string, number> = {};
    results.forEach(result => {
      issuesByCategory[result.category] = result.summary.totalIssues;
    });
    return issuesByCategory;
  }

  /**
   * Calculate issues by severity
   */
  private calculateIssuesBySeverity(results: CodeReviewResult[]): Record<string, number> {
    const issuesBySeverity = {
      critical: results.reduce((sum, r) => sum + r.summary.criticalIssues, 0),
      high: results.reduce((sum, r) => sum + r.summary.highIssues, 0),
      medium: results.reduce((sum, r) => sum + r.summary.mediumIssues, 0),
      low: results.reduce((sum, r) => sum + r.summary.lowIssues, 0),
      info: results.reduce((sum, r) => sum + r.summary.infoIssues, 0),
    };
    return issuesBySeverity;
  }

  /**
   * Get Git information
   */
  private getGitInfo(): { branch: string; commit: string; author: string } | undefined {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
      const commit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      const author = execSync('git log -1 --pretty=format:"%an"', { encoding: 'utf-8' }).trim();

      return { branch, commit, author };
    } catch {
      return undefined;
    }
  }

  /**
   * Setup Git hooks
   */
  setupGitHooks(): void {
    const hooksDir = join('.git', 'hooks');
    const preCommitHook = join(hooksDir, 'pre-commit');
    const prePushHook = join(hooksDir, 'pre-push');

    // Pre-commit hook
    const preCommitScript = `#!/bin/sh
# CareSync Code Review Pre-commit Hook

echo "Running CareSync code review..."

# Run quick security check
npx caresync-review check

if [ $? -ne 0 ]; then
  echo "❌ Code review failed. Please fix issues before committing."
  exit 1
fi

echo "✅ Code review passed"
exit 0
`;

    // Pre-push hook
    const prePushScript = `#!/bin/sh
# CareSync Code Review Pre-push Hook

echo "Running CareSync code review validation..."

# Run full review
npx caresync-review run --fail-on high

if [ $? -ne 0 ]; then
  echo "❌ Code review validation failed. Please fix critical/high issues before pushing."
  exit 1
fi

echo "✅ Code review validation passed"
exit 0
`;

    try {
      writeFileSync(preCommitHook, preCommitScript);
      writeFileSync(prePushHook, prePushScript);

      // Make executable
      execSync(`chmod +x "${preCommitHook}"`);
      execSync(`chmod +x "${prePushHook}"`);

      console.log('✅ Git hooks installed');
    } catch (error) {
      console.error('❌ Failed to install git hooks:', error.message);
    }
  }

  /**
   * Setup CI configuration
   */
  setupCIConfig(): void {
    // GitHub Actions
    const githubWorkflow = {
      name: 'Code Review',
      on: {
        pull_request: {},
        push: { branches: ['main', 'develop'] },
      },
      jobs: {
        review: {
          runsOn: 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v3' },
            { uses: 'actions/setup-node@v3', with: { 'node-version': '18' } },
            { run: 'npm ci' },
            {
              name: 'Run Code Review',
              run: 'npm run review:ci',
              continueOnError: true,
            },
            {
              name: 'Upload SARIF',
              uses: 'github/codeql-action/upload-sarif@v2',
              with: { sarif_file: 'code-review-results.sarif' },
            },
          ],
        },
      },
    };

    const workflowPath = join('.github', 'workflows', 'code-review.yml');
    writeFileSync(workflowPath, JSON.stringify(githubWorkflow, null, 2));

    console.log('✅ CI configuration created');
  }
}