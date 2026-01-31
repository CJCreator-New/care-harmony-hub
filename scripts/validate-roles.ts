#!/usr/bin/env ts-node
/**
 * Role Interconnection Validator CLI Script
 * 
 * A command-line tool to validate and analyze role interconnections
 * in the CareSync HIMS application.
 * 
 * Usage:
 *   npx ts-node scripts/validate-roles.ts [options]
 * 
 * Options:
 *   --format <format>  Output format: console (default), json, markdown
 *   --output <file>    Write output to file instead of stdout
 *   --verbose          Show detailed information
 *   --check            Return non-zero exit code on validation failures
 *   --metrics-only     Only show metrics summary
 *   --role <role>      Show details for a specific role
 *   --help             Show this help message
 * 
 * Examples:
 *   npx ts-node scripts/validate-roles.ts
 *   npx ts-node scripts/validate-roles.ts --format json --output report.json
 *   npx ts-node scripts/validate-roles.ts --check --verbose
 *   npx ts-node scripts/validate-roles.ts --role doctor
 */

import * as fs from 'fs';
import * as path from 'path';

// Dynamic imports to handle module resolution
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options = {
    format: 'console' as 'console' | 'json' | 'markdown',
    output: null as string | null,
    verbose: false,
    check: false,
    metricsOnly: false,
    role: null as string | null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--format':
        options.format = args[++i] as any;
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--check':
        options.check = true;
        break;
      case '--metrics-only':
        options.metricsOnly = true;
        break;
      case '--role':
        options.role = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  // Show help
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Import modules
  const validatorPath = path.resolve(__dirname, '../src/utils/roleInterconnectionValidator');
  const rbacPath = path.resolve(__dirname, '../src/types/rbac');
  
  let validator: any;
  let rbac: any;
  
  try {
    // Try direct import first
    validator = await import('../src/utils/roleInterconnectionValidator');
    rbac = await import('../src/types/rbac');
  } catch {
    console.error('Error: Could not import validator modules.');
    console.error('Make sure TypeScript is configured and modules are accessible.');
    console.error('You may need to run: npm install -D ts-node typescript');
    process.exit(1);
  }

  const {
    validateRoleInterconnections,
    validateAllWorkflows,
    calculateInterconnectionMetrics,
    getRolePermissionSummary,
    getAllRoleSummaries,
    generateJSONReport,
    ROLE_COMMUNICATION_MATRIX,
    TASK_DELEGATION_MATRIX,
    CROSS_ROLE_WORKFLOWS,
  } = validator;

  const {
    ROLE_HIERARCHY,
    ROLE_PERMISSIONS,
    ROLE_INFO,
  } = rbac;

  // Show specific role details
  if (options.role) {
    const roleSummary = getRolePermissionSummary(options.role);
    if (!roleSummary) {
      console.error(`Error: Unknown role "${options.role}"`);
      console.error('Valid roles:', Object.keys(ROLE_HIERARCHY).join(', '));
      process.exit(1);
    }
    outputRoleDetails(roleSummary, options);
    process.exit(0);
  }

  // Run validation
  const validation = validateRoleInterconnections();
  const metrics = calculateInterconnectionMetrics();
  const workflows = validateAllWorkflows();
  const roleSummaries = getAllRoleSummaries();

  // Metrics only mode
  if (options.metricsOnly) {
    outputMetrics(metrics, options);
    process.exit(options.check && metrics.overallHealthScore < 80 ? 1 : 0);
  }

  // Generate full report
  const report = {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    validation,
    metrics,
    workflows,
    roles: roleSummaries,
    communicationMatrix: ROLE_COMMUNICATION_MATRIX,
    delegationMatrix: TASK_DELEGATION_MATRIX,
  };

  // Output based on format
  let output: string;
  switch (options.format) {
    case 'json':
      output = JSON.stringify(report, null, 2);
      break;
    case 'markdown':
      output = generateMarkdownReport(report, options.verbose);
      break;
    case 'console':
    default:
      output = generateConsoleReport(report, options.verbose);
      break;
  }

  // Write output
  if (options.output) {
    fs.writeFileSync(options.output, output);
    console.log(`Report written to: ${options.output}`);
  } else {
    console.log(output);
  }

  // Exit with appropriate code
  if (options.check) {
    const hasErrors = validation.errors.length > 0;
    const lowScore = metrics.overallHealthScore < 70;
    if (hasErrors || lowScore) {
      process.exit(1);
    }
  }
  
  process.exit(0);
}

function printHelp(): void {
  console.log(`
Role Interconnection Validator CLI

A command-line tool to validate and analyze role interconnections
in the CareSync HIMS application.

Usage:
  npx ts-node scripts/validate-roles.ts [options]

Options:
  --format <format>  Output format: console (default), json, markdown
  --output <file>    Write output to file instead of stdout
  --verbose          Show detailed information
  --check            Return non-zero exit code on validation failures
  --metrics-only     Only show metrics summary
  --role <role>      Show details for a specific role
  --help             Show this help message

Examples:
  npx ts-node scripts/validate-roles.ts
  npx ts-node scripts/validate-roles.ts --format json --output report.json
  npx ts-node scripts/validate-roles.ts --check --verbose
  npx ts-node scripts/validate-roles.ts --role doctor
  npx ts-node scripts/validate-roles.ts --metrics-only

Exit Codes (with --check):
  0  Validation passed, health score >= 70%
  1  Validation failed or health score < 70%
`);
}

function outputMetrics(metrics: any, options: any): void {
  if (options.format === 'json') {
    console.log(JSON.stringify(metrics, null, 2));
    return;
  }

  console.log('\n========================================');
  console.log('  ROLE INTERCONNECTION METRICS SUMMARY');
  console.log('========================================\n');
  
  const bar = (value: number) => {
    const filled = Math.round(value / 5);
    return '█'.repeat(filled) + '░'.repeat(20 - filled);
  };

  console.log(`Interconnection Coverage: ${bar(metrics.interconnectionCoverage)} ${metrics.interconnectionCoverage.toFixed(1)}%`);
  console.log(`Permission Consistency:   ${bar(metrics.permissionConsistency)} ${metrics.permissionConsistency.toFixed(1)}%`);
  console.log(`Workflow Completeness:    ${bar(metrics.workflowCompleteness)} ${metrics.workflowCompleteness.toFixed(1)}%`);
  console.log(`Security Compliance:      ${bar(metrics.securityCompliance)} ${metrics.securityCompliance.toFixed(1)}%`);
  console.log('----------------------------------------');
  console.log(`OVERALL HEALTH SCORE:     ${bar(metrics.overallHealthScore)} ${metrics.overallHealthScore.toFixed(1)}%`);
  console.log('');

  const status = metrics.overallHealthScore >= 80 ? '✅ HEALTHY' : 
                 metrics.overallHealthScore >= 60 ? '⚠️  NEEDS ATTENTION' : 
                 '❌ CRITICAL';
  console.log(`Status: ${status}`);
  console.log('');
}

function outputRoleDetails(roleSummary: any, options: any): void {
  if (options.format === 'json') {
    console.log(JSON.stringify(roleSummary, null, 2));
    return;
  }

  console.log('\n========================================');
  console.log(`  ROLE DETAILS: ${roleSummary.role.toUpperCase()}`);
  console.log('========================================\n');

  console.log(`Role Name:        ${roleSummary.role}`);
  console.log(`Hierarchy Level:  ${roleSummary.level}`);
  console.log(`Permission Count: ${roleSummary.permissionCount}`);
  console.log('');

  console.log('Permission Categories:');
  roleSummary.permissionCategories.forEach((perm: string) => {
    console.log(`  • ${perm}`);
  });
  console.log('');

  console.log('Can Communicate With:');
  if (roleSummary.canCommunicateWith.length > 0) {
    roleSummary.canCommunicateWith.forEach((role: string) => {
      console.log(`  • ${role}`);
    });
  } else {
    console.log('  (none)');
  }
  console.log('');

  console.log('Can Delegate To:');
  if (roleSummary.canDelegateTo.length > 0) {
    roleSummary.canDelegateTo.forEach((role: string) => {
      console.log(`  • ${role}`);
    });
  } else {
    console.log('  (none)');
  }
  console.log('');

  console.log('Can Receive Delegation From:');
  if (roleSummary.canReceiveFrom.length > 0) {
    roleSummary.canReceiveFrom.forEach((role: string) => {
      console.log(`  • ${role}`);
    });
  } else {
    console.log('  (none)');
  }
  console.log('');
}

function generateConsoleReport(report: any, verbose: boolean): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════════╗');
  lines.push('║       CARESYNC HIMS - ROLE INTERCONNECTION VALIDATION REPORT     ║');
  lines.push('╚══════════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Version:   ${report.version}`);
  lines.push('');

  // Validation Status
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│  VALIDATION STATUS                                              │');
  lines.push('└──────────────────────────────────────────────────────────────────┘');
  
  const statusIcon = report.validation.valid ? '✅' : '❌';
  lines.push(`Overall Status: ${statusIcon} ${report.validation.valid ? 'VALID' : 'INVALID'}`);
  lines.push('');

  const details = report.validation.details;
  lines.push(`  Role Hierarchy:        ${details.roleHierarchyValid ? '✅' : '❌'}`);
  lines.push(`  Permissions:           ${details.permissionsConsistent ? '✅' : '❌'}`);
  lines.push(`  Communication Paths:   ${details.communicationPathsValid ? '✅' : '❌'}`);
  lines.push(`  Workflow Paths:        ${details.workflowPathsValid ? '✅' : '❌'}`);
  lines.push(`  Delegation Matrix:     ${details.delegationMatrixValid ? '✅' : '❌'}`);
  lines.push('');

  // Errors and Warnings
  if (report.validation.errors.length > 0) {
    lines.push('Errors:');
    report.validation.errors.forEach((err: string) => {
      lines.push(`  ❌ ${err}`);
    });
    lines.push('');
  }

  if (report.validation.warnings.length > 0) {
    lines.push('Warnings:');
    report.validation.warnings.forEach((warn: string) => {
      lines.push(`  ⚠️  ${warn}`);
    });
    lines.push('');
  }

  // Metrics
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│  METRICS                                                        │');
  lines.push('└──────────────────────────────────────────────────────────────────┘');
  
  const bar = (value: number) => {
    const filled = Math.round(value / 5);
    return '█'.repeat(filled) + '░'.repeat(20 - filled);
  };

  const m = report.metrics;
  lines.push(`  Interconnection Coverage: ${bar(m.interconnectionCoverage)} ${m.interconnectionCoverage.toFixed(1)}%`);
  lines.push(`  Permission Consistency:   ${bar(m.permissionConsistency)} ${m.permissionConsistency.toFixed(1)}%`);
  lines.push(`  Workflow Completeness:    ${bar(m.workflowCompleteness)} ${m.workflowCompleteness.toFixed(1)}%`);
  lines.push(`  Security Compliance:      ${bar(m.securityCompliance)} ${m.securityCompliance.toFixed(1)}%`);
  lines.push('  ──────────────────────────────────────────────────────────────');
  lines.push(`  OVERALL HEALTH SCORE:     ${bar(m.overallHealthScore)} ${m.overallHealthScore.toFixed(1)}%`);
  lines.push('');

  // Workflows
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│  WORKFLOWS                                                      │');
  lines.push('└──────────────────────────────────────────────────────────────────┘');

  report.workflows.forEach((wf: any) => {
    const wfIcon = wf.valid ? '✅' : '❌';
    lines.push(`  ${wfIcon} ${wf.workflowName}`);
    if (verbose) {
      lines.push(`     Steps: ${wf.steps.length}`);
      lines.push(`     Roles: ${wf.roles?.join(', ') || 'N/A'}`);
    }
  });
  lines.push('');

  // Role Summary
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│  ROLES SUMMARY                                                  │');
  lines.push('└──────────────────────────────────────────────────────────────────┘');
  lines.push('');
  lines.push('  Role             Level  Permissions  Communications  Delegations');
  lines.push('  ─────────────────────────────────────────────────────────────────');
  
  report.roles.forEach((role: any) => {
    const name = role.role.padEnd(16);
    const level = String(role.level).padStart(5);
    const perms = String(role.permissionCount).padStart(11);
    const comms = String(role.canCommunicateWith.length).padStart(14);
    const dels = String(role.canDelegateTo.length).padStart(12);
    lines.push(`  ${name} ${level} ${perms} ${comms} ${dels}`);
  });
  lines.push('');

  if (verbose) {
    // Communication Matrix
    lines.push('┌──────────────────────────────────────────────────────────────────┐');
    lines.push('│  COMMUNICATION MATRIX                                           │');
    lines.push('└──────────────────────────────────────────────────────────────────┘');
    lines.push('');
    
    Object.entries(report.communicationMatrix).forEach(([role, targets]: [string, any]) => {
      lines.push(`  ${role}:`);
      lines.push(`    → ${(targets as string[]).join(', ') || '(none)'}`);
    });
    lines.push('');

    // Delegation Matrix
    lines.push('┌──────────────────────────────────────────────────────────────────┐');
    lines.push('│  DELEGATION MATRIX                                              │');
    lines.push('└──────────────────────────────────────────────────────────────────┘');
    lines.push('');
    
    Object.entries(report.delegationMatrix).forEach(([role, targets]: [string, any]) => {
      lines.push(`  ${role}:`);
      lines.push(`    → ${(targets as string[]).join(', ') || '(none)'}`);
    });
    lines.push('');
  }

  lines.push('════════════════════════════════════════════════════════════════════');
  lines.push('  Report generated by CareSync Role Interconnection Validator CLI');
  lines.push('════════════════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

function generateMarkdownReport(report: any, verbose: boolean): string {
  const lines: string[] = [];

  lines.push('# CareSync HIMS - Role Interconnection Validation Report');
  lines.push('');
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push(`**Version:** ${report.version}`);
  lines.push('');

  // Validation Status
  lines.push('## Validation Status');
  lines.push('');
  
  const statusBadge = report.validation.valid 
    ? '![Status](https://img.shields.io/badge/Status-Valid-success)' 
    : '![Status](https://img.shields.io/badge/Status-Invalid-critical)';
  lines.push(statusBadge);
  lines.push('');

  lines.push('| Check | Status |');
  lines.push('|-------|--------|');
  const details = report.validation.details;
  lines.push(`| Role Hierarchy | ${details.roleHierarchyValid ? '✅ Pass' : '❌ Fail'} |`);
  lines.push(`| Permissions | ${details.permissionsConsistent ? '✅ Pass' : '❌ Fail'} |`);
  lines.push(`| Communication Paths | ${details.communicationPathsValid ? '✅ Pass' : '❌ Fail'} |`);
  lines.push(`| Workflow Paths | ${details.workflowPathsValid ? '✅ Pass' : '❌ Fail'} |`);
  lines.push(`| Delegation Matrix | ${details.delegationMatrixValid ? '✅ Pass' : '❌ Fail'} |`);
  lines.push('');

  // Errors and Warnings
  if (report.validation.errors.length > 0) {
    lines.push('### Errors');
    lines.push('');
    report.validation.errors.forEach((err: string) => {
      lines.push(`- ❌ ${err}`);
    });
    lines.push('');
  }

  if (report.validation.warnings.length > 0) {
    lines.push('### Warnings');
    lines.push('');
    report.validation.warnings.forEach((warn: string) => {
      lines.push(`- ⚠️ ${warn}`);
    });
    lines.push('');
  }

  // Metrics
  lines.push('## Metrics');
  lines.push('');
  lines.push('| Metric | Score |');
  lines.push('|--------|-------|');
  const m = report.metrics;
  lines.push(`| Interconnection Coverage | ${m.interconnectionCoverage.toFixed(1)}% |`);
  lines.push(`| Permission Consistency | ${m.permissionConsistency.toFixed(1)}% |`);
  lines.push(`| Workflow Completeness | ${m.workflowCompleteness.toFixed(1)}% |`);
  lines.push(`| Security Compliance | ${m.securityCompliance.toFixed(1)}% |`);
  lines.push(`| **Overall Health Score** | **${m.overallHealthScore.toFixed(1)}%** |`);
  lines.push('');

  // Workflows
  lines.push('## Workflows');
  lines.push('');
  lines.push('| Workflow | Status | Steps |');
  lines.push('|----------|--------|-------|');
  report.workflows.forEach((wf: any) => {
    const status = wf.valid ? '✅ Valid' : '❌ Invalid';
    lines.push(`| ${wf.workflowName} | ${status} | ${wf.steps.length} |`);
  });
  lines.push('');

  // Roles
  lines.push('## Roles Summary');
  lines.push('');
  lines.push('| Role | Level | Permissions | Communications | Delegations |');
  lines.push('|------|-------|-------------|----------------|-------------|');
  report.roles.forEach((role: any) => {
    lines.push(`| ${role.role} | ${role.level} | ${role.permissionCount} | ${role.canCommunicateWith.length} | ${role.canDelegateTo.length} |`);
  });
  lines.push('');

  if (verbose) {
    // Communication Matrix
    lines.push('## Communication Matrix');
    lines.push('');
    lines.push('```');
    Object.entries(report.communicationMatrix).forEach(([role, targets]: [string, any]) => {
      lines.push(`${role}: ${(targets as string[]).join(', ') || '(none)'}`);
    });
    lines.push('```');
    lines.push('');

    // Delegation Matrix
    lines.push('## Delegation Matrix');
    lines.push('');
    lines.push('```');
    Object.entries(report.delegationMatrix).forEach(([role, targets]: [string, any]) => {
      lines.push(`${role}: ${(targets as string[]).join(', ') || '(none)'}`);
    });
    lines.push('```');
    lines.push('');
  }

  lines.push('---');
  lines.push('*Report generated by CareSync Role Interconnection Validator CLI*');

  return lines.join('\n');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
