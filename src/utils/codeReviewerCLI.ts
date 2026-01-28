#!/usr/bin/env node

/**
 * CareSync Code Reviewer CLI
 * Command-line interface for comprehensive code analysis
 */

import { Command } from 'commander';
import { CodeReviewer } from './codeReviewer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CodeReviewConfig } from '../types/code-review';

const program = new Command();

program
  .name('caresync-review')
  .description('Comprehensive code review tool for CareSync HMS')
  .version('1.0.0');

program
  .command('run')
  .description('Run comprehensive code review')
  .option('-c, --config <path>', 'Path to config file', '.code-reviewer.json')
  .option('-o, --output <format>', 'Output format (json|html|markdown|sarif)', 'json')
  .option('-f, --output-file <path>', 'Output file path')
  .option('--categories <list>', 'Comma-separated list of categories to run')
  .option('--exclude <patterns>', 'Comma-separated exclude patterns')
  .option('--fail-on <severity>', 'Fail on issues at or above severity (critical|high|medium|low)', 'high')
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);
      const reviewer = new CodeReviewer(config);

      console.log('🔍 Starting CareSync Code Review...');

      const results = await reviewer.runReview();

      // Filter results if categories specified
      let filteredResults = results;
      if (options.categories) {
        const categories = options.categories.split(',');
        filteredResults = results.filter(r => categories.includes(r.category));
      }

      // Generate output
      const output = reviewer.exportResults(options.output as any);

      if (options.outputFile) {
        require('fs').writeFileSync(options.outputFile, output);
        console.log(`✅ Results saved to ${options.outputFile}`);
      } else {
        console.log(output);
      }

      // Check failure threshold
      const totalIssues = filteredResults.reduce((sum, r) => sum + r.summary.totalIssues, 0);
      const severeIssues = filteredResults.reduce((sum, r) => sum + r.summary.criticalIssues + r.summary.highIssues, 0);

      const shouldFail = options.failOn === 'critical' ? severeIssues > 0 :
                        options.failOn === 'high' ? severeIssues > 0 :
                        options.failOn === 'medium' ? totalIssues > 0 : false;

      if (shouldFail) {
        console.error(`❌ Review failed: Found ${severeIssues} issues at or above ${options.failOn} severity`);
        process.exit(1);
      } else {
        console.log('✅ Review passed');
      }

    } catch (error) {
      console.error('❌ Review failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Quick security and compliance check')
  .option('-c, --config <path>', 'Path to config file', '.code-reviewer.json')
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);

      // Override config for quick check
      config.categories = {
        security: { enabled: true, filePatterns: ['**/*.{ts,tsx,js,jsx}'] },
        compliance: { enabled: true, filePatterns: ['**/*.{ts,tsx,js,jsx}'] },
      };

      const reviewer = new CodeReviewer(config);
      const results = await reviewer.runReview();

      const criticalIssues = results.reduce((sum, r) => sum + r.summary.criticalIssues, 0);
      const highIssues = results.reduce((sum, r) => sum + r.summary.highIssues, 0);

      if (criticalIssues > 0 || highIssues > 0) {
        console.error(`❌ Security/Compliance issues found: ${criticalIssues} critical, ${highIssues} high`);
        process.exit(1);
      } else {
        console.log('✅ Security and compliance check passed');
      }

    } catch (error) {
      console.error('❌ Check failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize code reviewer configuration')
  .option('-f, --force', 'Overwrite existing config')
  .action((options) => {
    const configPath = '.code-reviewer.json';

    if (!options.force && require('fs').existsSync(configPath)) {
      console.error('❌ Config file already exists. Use --force to overwrite.');
      process.exit(1);
    }

    const defaultConfig: CodeReviewConfig = {
      basePath: '.',
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        '*.min.js',
        '*.test.*',
        '*.spec.*',
        '*.config.*',
      ],
      categories: {
        security: {
          enabled: true,
          filePatterns: ['**/*.{ts,tsx,js,jsx}'],
        },
        compliance: {
          enabled: true,
          filePatterns: ['**/*.{ts,tsx,js,jsx}'],
        },
        performance: {
          enabled: true,
          filePatterns: ['**/*.{ts,tsx,js,jsx}'],
        },
        quality: {
          enabled: true,
          filePatterns: ['**/*.{ts,tsx,js,jsx}'],
        },
        accessibility: {
          enabled: true,
          filePatterns: ['**/*.{ts,tsx,js,jsx,html}'],
        },
        testing: {
          enabled: true,
          filePatterns: ['**/*.{ts,tsx,js,jsx}', '**/*.test.*', '**/*.spec.*'],
        },
      },
      ci: {
        failOnSeverity: 'high',
        maxIssues: 100,
        reportFormats: ['json', 'sarif'],
        notifications: {
          slack: false,
          email: false,
          github: true,
        },
      },
      reporting: {
        includeCodeSnippets: true,
        groupByCategory: true,
        showProgress: true,
        maxIssuesPerFile: 50,
      },
    };

    require('fs').writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('✅ Configuration initialized at .code-reviewer.json');
  });

program
  .command('categories')
  .description('List available review categories')
  .action(() => {
    console.log('Available review categories:');
    console.log('  • security     - Security vulnerabilities and authentication issues');
    console.log('  • compliance   - HIPAA and healthcare compliance requirements');
    console.log('  • performance  - Performance bottlenecks and optimization opportunities');
    console.log('  • quality      - Code quality and maintainability issues');
    console.log('  • accessibility- WCAG compliance and accessibility issues');
    console.log('  • testing      - Test coverage and quality issues');
  });

program
  .command('rules')
  .description('List available rules for a category')
  .argument('<category>', 'Category to list rules for')
  .action((category) => {
    const { HEALTHCARE_RULES } = require('./codeReviewerRules');

    if (!HEALTHCARE_RULES[category]) {
      console.error(`❌ Unknown category: ${category}`);
      console.log('Use "categories" command to see available categories');
      process.exit(1);
    }

    console.log(`Rules for ${category}:`);
    HEALTHCARE_RULES[category].forEach(rule => {
      console.log(`  • ${rule.id} (${rule.severity}) - ${rule.message}`);
    });
  });

function loadConfig(configPath: string): CodeReviewConfig {
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    // Return default config if file doesn't exist
    return {
      basePath: '.',
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        '*.min.js',
      ],
      categories: {
        security: { enabled: true, filePatterns: ['**/*.{ts,tsx,js,jsx}'] },
        compliance: { enabled: true, filePatterns: ['**/*.{ts,tsx,js,jsx}'] },
        performance: { enabled: true, filePatterns: ['**/*.{ts,tsx,js,jsx}'] },
        quality: { enabled: true, filePatterns: ['**/*.{ts,tsx,js,jsx}'] },
        accessibility: { enabled: true, filePatterns: ['**/*.{ts,tsx,js,jsx,html}'] },
        testing: { enabled: true, filePatterns: ['**/*.{ts,tsx,js,jsx}'] },
      },
    };
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Parse command line arguments
program.parse();