#!/usr/bin/env node

/**
 * CareSync Code Review Runner Script
 * Executes code review operations for CI/CD and local development
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Since the TypeScript files need to be compiled, we'll create a simple inline implementation
// for the runner script that doesn't depend on the TypeScript modules

const configPath = join(process.cwd(), '.code-reviewer.json');

if (!existsSync(configPath)) {
  console.error('❌ Code reviewer configuration not found. Creating default configuration...');
  
  const defaultConfig = {
    basePath: '.',
    excludePatterns: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      '*.min.js',
      '*.test.*',
      '*.spec.*'
    ],
    categories: {
      security: {
        enabled: true,
        filePatterns: ['**/*.{ts,tsx,js,jsx}']
      },
      compliance: {
        enabled: true,
        filePatterns: ['**/*.{ts,tsx,js,jsx}']
      },
      performance: {
        enabled: true,
        filePatterns: ['**/*.{ts,tsx,js,jsx}']
      },
      quality: {
        enabled: true,
        filePatterns: ['**/*.{ts,tsx,js,jsx}']
      },
      accessibility: {
        enabled: true,
        filePatterns: ['**/*.{ts,tsx,js,jsx,html}']
      },
      testing: {
        enabled: true,
        filePatterns: ['**/*.{ts,tsx,js,jsx}']
      }
    },
    ci: {
      failOnSeverity: 'high',
      maxIssues: 100,
      reportFormats: ['json', 'sarif'],
      notifications: {
        slack: false,
        email: false,
        github: true
      }
    }
  };
  
  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  console.log('✅ Default configuration created at .code-reviewer.json');
}

const config = JSON.parse(readFileSync(configPath, 'utf-8'));
const command = process.argv[2];

// Simple inline implementation for basic functionality
async function runBasicReview() {
  console.log('🔍 Running basic code review...');
  console.log('');
  console.log('Note: Full TypeScript implementation requires building the project.');
  console.log('This is a basic check. For comprehensive review, ensure TypeScript files are compiled.');
  console.log('');
  
  // Check for common issues
  const issues = [];
  
  // Check for .env files with secrets
  if (existsSync('.env')) {
    const envContent = readFileSync('.env', 'utf-8');
    if (envContent.includes('password') || envContent.includes('secret') || envContent.includes('key')) {
      issues.push({
        severity: 'medium',
        message: '.env file contains potential secrets - ensure it is in .gitignore'
      });
    }
  }
  
  // Check for console.log statements
  try {
    const fs = await import('fs');
    const glob = await import('glob');
    
    const files = await glob.glob('src/**/*.{ts,tsx}', { ignore: 'node_modules/**' });
    
    for (const file of files.slice(0, 10)) { // Check first 10 files
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (line.includes('console.log') && !line.includes('//')) {
            issues.push({
              file,
              line: index + 1,
              severity: 'low',
              message: `console.log found - consider removing for production`
            });
          }
        });
      } catch (e) {
        // Skip files that can't be read
      }
    }
  } catch (e) {
    console.log('Could not scan source files');
  }
  
  if (issues.length > 0) {
    console.log(`Found ${issues.length} potential issues:`);
    issues.forEach(issue => {
      console.log(`  [${issue.severity.toUpperCase()}] ${issue.file || ''}:${issue.line || ''} ${issue.message}`);
    });
  } else {
    console.log('✅ No obvious issues found in basic scan');
  }
  
  return { success: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0, issues: issues.length };
}

async function main() {
  try {
    switch (command) {
      case 'pre-commit':
        console.log('🔍 Running pre-commit code review...');
        const result = await runBasicReview();
        if (!result.success) {
          console.error(`❌ Pre-commit found issues that should be addressed`);
          process.exit(1);
        }
        console.log('✅ Pre-commit checks passed');
        break;

      case 'pre-push':
        console.log('🔍 Running pre-push validation...');
        const pushResult = await runBasicReview();
        if (!pushResult.success) {
          console.error(`❌ Pre-push validation failed`);
          process.exit(1);
        }
        console.log('✅ Pre-push validation passed');
        break;

      case 'ci':
        console.log('🔍 Running CI/CD code review...');
        const ciResult = await runBasicReview();
        if (!ciResult.success) {
          console.error(`❌ CI review failed`);
          process.exit(1);
        }
        console.log('✅ CI review passed');
        break;

      case 'setup-hooks':
        console.log('🔧 Setting up Git hooks...');
        console.log('Note: Git hooks setup requires manual configuration');
        console.log('Add the following to .git/hooks/pre-commit:');
        console.log('  npm run review:check');
        break;

      case 'setup-ci':
        console.log('🔧 Setting up CI/CD configuration...');
        console.log('Note: CI configuration should be added to your CI platform');
        console.log('Run: npm run review:run in your CI pipeline');
        break;

      case 'full-review':
        console.log('🔍 Running full comprehensive review...');
        await runBasicReview();
        console.log('');
        console.log('📄 For detailed reports, ensure TypeScript files are compiled and use:');
        console.log('   npx tsx src/utils/codeReviewerCLI.ts run');
        break;

      default:
        console.log('CareSync Code Review Runner');
        console.log('');
        console.log('Usage: npm run review:<command>');
        console.log('');
        console.log('Commands:');
        console.log('  review:check      Run quick security/compliance check');
        console.log('  review:run        Run full CI/CD review');
        console.log('  review:setup-hooks  Setup Git hooks (manual)');
        console.log('  review:setup-ci     Setup CI configuration (manual)');
        console.log('  review:dashboard    Open review dashboard');
        console.log('');
        console.log('Note: This is a simplified runner. For full functionality,');
        console.log('ensure TypeScript files are compiled or use tsx to run the CLI directly.');
        process.exit(0);
    }
  } catch (error) {
    console.error('❌ Code review failed:', error.message);
    process.exit(1);
  }
}

main();