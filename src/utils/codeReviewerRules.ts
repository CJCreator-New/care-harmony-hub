/**
 * CareSync Code Reviewer Rules
 * Healthcare-specific rules for comprehensive code analysis
 */

import { IssueSeverity, CodeReviewCategory } from '../types/code-review';

export interface HealthcareRule {
  id: string;
  category: CodeReviewCategory;
  severity: IssueSeverity;
  message: string;
  suggestion: string;
  pattern?: RegExp;
  check?: (content: string, filePath: string) => boolean;
  healthcareContext?: string;
}

export const HEALTHCARE_RULES: Record<CodeReviewCategory, HealthcareRule[]> = {
  security: [
    {
      id: 'hardcoded-secret',
      category: 'security',
      severity: 'critical',
      message: 'Hardcoded secret detected',
      suggestion: 'Use environment variables or secure credential storage',
      pattern: /(password|secret|token|api[_-]?key)\s*[:=]\s*['"][^'"]+['"]/gi,
      healthcareContext: 'Hardcoded credentials in healthcare systems can lead to unauthorized access to PHI',
    },
    {
      id: 'sql-injection-risk',
      category: 'security',
      severity: 'high',
      message: 'Potential SQL injection vulnerability',
      suggestion: 'Use parameterized queries or prepared statements',
      pattern: /\${\w+}.*(select|insert|update|delete)/gi,
      healthcareContext: 'SQL injection can lead to unauthorized access to patient records',
    },
    {
      id: 'weak-password-hashing',
      category: 'security',
      severity: 'high',
      message: 'Weak or missing password hashing',
      suggestion: 'Use bcrypt or argon2 for password hashing',
      check: (content) => content.includes('password') && !content.includes('bcrypt') && !content.includes('argon2'),
      healthcareContext: 'Weak password hashing violates HIPAA security requirements',
    },
    {
      id: 'missing-rbac-check',
      category: 'security',
      severity: 'high',
      message: 'Missing role-based access control check',
      suggestion: 'Implement proper RBAC checks for sensitive operations',
      pattern: /(delete|update|create).*patient|prescription|medical/i,
      check: (content) => !content.includes('checkPermission') && !content.includes('canAccess'),
      healthcareContext: 'Missing RBAC can lead to unauthorized access to patient data',
    },
    {
      id: 'insecure-session',
      category: 'security',
      severity: 'high',
      message: 'Insecure session management',
      suggestion: 'Implement secure session timeout and regeneration',
      pattern: /session.*timeout.*\d{2,}/i,
      check: (content) => !content.includes('secure') || !content.includes('httpOnly'),
      healthcareContext: 'Insecure sessions can lead to session hijacking and PHI exposure',
    },
  ],

  compliance: [
    {
      id: 'phi-logging',
      category: 'compliance',
      severity: 'critical',
      message: 'Potential PHI data in logs',
      suggestion: 'Never log PHI data. Use anonymized identifiers',
      pattern: /console\.(log|error|warn).*(ssn|dob|diagnosis|medical)/gi,
      healthcareContext: 'Logging PHI violates HIPAA Privacy Rule',
    },
    {
      id: 'missing-audit-trail',
      category: 'compliance',
      severity: 'high',
      message: 'Critical operations without audit logging',
      suggestion: 'Implement comprehensive audit trails for all data modifications',
      check: (content) => {
        const hasCriticalOps = /(create|update|delete)/i.test(content);
        const hasAudit = /audit|logAction/i.test(content);
        return hasCriticalOps && !hasAudit;
      },
      healthcareContext: 'HIPAA requires audit trails for all access to PHI',
    },
    {
      id: 'data-retention-policy',
      category: 'compliance',
      severity: 'medium',
      message: 'Data deletion without retention policy consideration',
      suggestion: 'Implement data retention policies per HIPAA requirements',
      pattern: /delete.*patient|permanent.*delete/i,
      check: (content) => !content.includes('retention') && !content.includes('archive'),
      healthcareContext: 'HIPAA requires specific data retention periods',
    },
    {
      id: 'missing-consent-check',
      category: 'compliance',
      severity: 'high',
      message: 'Patient data access without consent verification',
      suggestion: 'Verify patient consent before accessing or sharing data',
      pattern: /getPatient|fetchPatient/i,
      check: (content) => !content.includes('consent') && !content.includes('authorization'),
      healthcareContext: 'Patient consent is required for most data sharing under HIPAA',
    },
    {
      id: 'breach-notification',
      category: 'compliance',
      severity: 'critical',
      message: 'Potential breach without notification mechanism',
      suggestion: 'Implement automated breach detection and notification',
      check: (content) => content.includes('unauthorized') && !content.includes('notify'),
      healthcareContext: 'HIPAA requires breach notification within 60 days',
    },
  ],

  performance: [
    {
      id: 'n-plus-one-query',
      category: 'performance',
      severity: 'high',
      message: 'Potential N+1 query pattern detected',
      suggestion: 'Use batch queries or eager loading to optimize database access',
      pattern: /for.*\{[\s\S]*?query|map.*query|forEach.*query/gi,
      healthcareContext: 'Slow queries can impact patient care during critical moments',
    },
    {
      id: 'large-bundle-import',
      category: 'performance',
      severity: 'medium',
      message: 'Large library import may increase bundle size',
      suggestion: 'Use tree-shaking friendly imports or lazy loading',
      pattern: /import.*from.*(lodash|moment)/i,
      healthcareContext: 'Large bundles slow down application load times in clinical settings',
    },
    {
      id: 'memory-leak-potential',
      category: 'performance',
      severity: 'medium',
      message: 'setInterval without corresponding clearInterval',
      suggestion: 'Always clear intervals to prevent memory leaks',
      pattern: /setInterval.*\(/gi,
      check: (content) => !content.includes('clearInterval'),
      healthcareContext: 'Memory leaks can cause application crashes during patient care',
    },
    {
      id: 'missing-pagination',
      category: 'performance',
      severity: 'medium',
      message: 'Large data fetch without pagination',
      suggestion: 'Implement pagination for large datasets',
      pattern: /select\s*\*.*from|getAll|fetchAll/i,
      check: (content) => !content.includes('limit') && !content.includes('offset'),
      healthcareContext: 'Unpaginated queries can overwhelm systems with large patient databases',
    },
    {
      id: 'inefficient-query',
      category: 'performance',
      severity: 'medium',
      message: 'Inefficient database query pattern',
      suggestion: 'Add indexes or optimize query structure',
      pattern: /where.*or.*where|not.*in.*select/gi,
      healthcareContext: 'Slow queries can delay critical patient information retrieval',
    },
  ],

  quality: [
    {
      id: 'long-function',
      category: 'quality',
      severity: 'medium',
      message: 'Function is too long',
      suggestion: 'Break down into smaller, focused functions',
      healthcareContext: 'Long functions are harder to maintain and test in clinical systems',
    },
    {
      id: 'magic-number',
      category: 'quality',
      severity: 'low',
      message: 'Magic number detected',
      suggestion: 'Extract to named constant',
      pattern: /\b\d{2,}\b/,
      healthcareContext: 'Magic numbers in healthcare can lead to medication dosage errors',
    },
    {
      id: 'todo-comment',
      category: 'quality',
      severity: 'info',
      message: 'TODO/FIXME comment found',
      suggestion: 'Address technical debt or create issue ticket',
      pattern: /(TODO|FIXME|HACK)/gi,
      healthcareContext: 'Unresolved TODOs in healthcare code can lead to safety issues',
    },
    {
      id: 'missing-error-handling',
      category: 'quality',
      severity: 'high',
      message: 'Missing error handling',
      suggestion: 'Add try-catch blocks and proper error handling',
      pattern: /async|await|Promise/,
      check: (content) => !content.includes('try') || !content.includes('catch'),
      healthcareContext: 'Unhandled errors in healthcare systems can lead to data loss',
    },
    {
      id: 'duplicate-code',
      category: 'quality',
      severity: 'low',
      message: 'Potential code duplication',
      suggestion: 'Extract common logic into reusable functions',
      healthcareContext: 'Duplicate code increases maintenance burden and error risk',
    },
  ],

  accessibility: [
    {
      id: 'missing-alt-text',
      category: 'accessibility',
      severity: 'high',
      message: 'Image without alt text',
      suggestion: 'Add descriptive alt attribute for screen readers',
      pattern: /<img[^>]*>/gi,
      check: (content) => !content.includes('alt='),
      healthcareContext: 'Screen reader users need alt text for medical images and charts',
    },
    {
      id: 'missing-form-label',
      category: 'accessibility',
      severity: 'high',
      message: 'Form input without associated label',
      suggestion: 'Add label element or aria-label attribute',
      pattern: /<input[^>]*>/gi,
      check: (content) => !content.includes('<label') && !content.includes('aria-label'),
      healthcareContext: 'Form labels are essential for patients using assistive technologies',
    },
    {
      id: 'color-contrast-check',
      category: 'accessibility',
      severity: 'medium',
      message: 'Verify color contrast ratio',
      suggestion: 'Ensure 4.5:1 contrast ratio for WCAG AA compliance',
      pattern: /color\s*:\s*#[0-9a-fA-F]{3,6}/gi,
      healthcareContext: 'Poor contrast affects readability for visually impaired users',
    },
    {
      id: 'missing-keyboard-navigation',
      category: 'accessibility',
      severity: 'medium',
      message: 'Missing keyboard navigation support',
      suggestion: 'Add tabindex and keyboard event handlers',
      pattern: /onClick/,
      check: (content) => !content.includes('onKeyDown') && !content.includes('onKeyPress'),
      healthcareContext: 'Keyboard navigation is essential for users with motor disabilities',
    },
    {
      id: 'missing-aria-roles',
      category: 'accessibility',
      severity: 'medium',
      message: 'Missing ARIA roles for custom components',
      suggestion: 'Add appropriate ARIA roles and attributes',
      pattern: /role=|aria-/,
      check: (content) => !content.includes('role=') && !content.includes('aria-'),
      healthcareContext: 'ARIA roles help assistive technologies understand UI components',
    },
  ],

  testing: [
    {
      id: 'insufficient-test-coverage',
      category: 'testing',
      severity: 'medium',
      message: 'Low test count',
      suggestion: 'Add more comprehensive test cases',
      pattern: /it\(|describe\(|test\(/g,
      check: (content) => (content.match(/it\(|describe\(|test\(/g) || []).length < 3,
      healthcareContext: 'Insufficient testing can lead to undetected bugs in clinical systems',
    },
    {
      id: 'missing-error-testing',
      category: 'testing',
      severity: 'low',
      message: 'Test may not cover error scenarios',
      suggestion: 'Add tests for error conditions and edge cases',
      pattern: /expect/,
      check: (content) => !content.includes('catch') && !content.includes('rejects'),
      healthcareContext: 'Error conditions in healthcare must be thoroughly tested',
    },
    {
      id: 'missing-clinical-tests',
      category: 'testing',
      severity: 'high',
      message: 'Clinical logic without corresponding tests',
      suggestion: 'Create comprehensive tests for clinical decision logic',
      pattern: /diagnosis|treatment|medication|prescription/,
      check: (content, filePath) => !filePath.includes('.test.') && !filePath.includes('.spec.'),
      healthcareContext: 'Clinical logic must be thoroughly tested to ensure patient safety',
    },
    {
      id: 'mock-sensitive-data',
      category: 'testing',
      severity: 'medium',
      message: 'Tests may use real patient data',
      suggestion: 'Use mock data and anonymized test fixtures',
      pattern: /test.*data|fixture/,
      check: (content) => content.includes('patient') && !content.includes('mock'),
      healthcareContext: 'Real patient data should never be used in tests',
    },
    {
      id: 'missing-integration-tests',
      category: 'testing',
      severity: 'medium',
      message: 'Missing integration tests for critical workflows',
      suggestion: 'Add end-to-end tests for patient workflows',
      pattern: /workflow|patient.*flow/,
      check: (content, filePath) => !filePath.includes('integration') && !filePath.includes('e2e'),
      healthcareContext: 'Integration tests ensure critical patient workflows function correctly',
    },
  ],
};

/**
 * Get rules for specific category
 */
export function getRulesForCategory(category: CodeReviewCategory): HealthcareRule[] {
  return HEALTHCARE_RULES[category] || [];
}

/**
 * Get all rules
 */
export function getAllRules(): HealthcareRule[] {
  return Object.values(HEALTHCARE_RULES).flat();
}

/**
 * Get rules by severity
 */
export function getRulesBySeverity(severity: IssueSeverity): HealthcareRule[] {
  return getAllRules().filter(rule => rule.severity === severity);
}

/**
 * Get rules by ID
 */
export function getRuleById(id: string): HealthcareRule | undefined {
  return getAllRules().find(rule => rule.id === id);
}

/**
 * Check if content matches rule
 */
export function matchesRule(rule: HealthcareRule, content: string, filePath: string): boolean {
  // Check pattern match
  if (rule.pattern) {
    const patternMatch = rule.pattern.test(content);
    if (!patternMatch) return false;
  }

  // Check custom condition
  if (rule.check) {
    return rule.check(content, filePath);
  }

  return true;
}

/**
 * Get remediation suggestion for rule
 */
export function getRemediationSuggestion(ruleId: string): string {
  const rule = getRuleById(ruleId);
  return rule?.suggestion || 'Review and fix the issue';
}

/**
 * Get healthcare context for rule
 */
export function getHealthcareContext(ruleId: string): string {
  const rule = getRuleById(ruleId);
  return rule?.healthcareContext || '';
}