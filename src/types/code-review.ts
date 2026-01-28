/**
 * CareSync Code Review Types
 * Type definitions for comprehensive code analysis
 */

export type CodeReviewCategory =
  | 'security'
  | 'compliance'
  | 'performance'
  | 'quality'
  | 'accessibility'
  | 'testing';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface CodeReviewIssue {
  file: string;
  line: number;
  column: number;
  severity: IssueSeverity;
  category: CodeReviewCategory;
  rule: string;
  message: string;
  suggestion: string;
  code: string;
  healthcareContext?: string;
  fixed?: boolean;
  assignee?: string;
  dueDate?: Date;
  tags?: string[];
}

export interface CodeReviewResult {
  category: CodeReviewCategory;
  timestamp: Date;
  filesAnalyzed: number;
  issues: CodeReviewIssue[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    infoIssues: number;
  };
  duration: number;
  metadata?: {
    rulesVersion: string;
    scannerVersion: string;
    environment: string;
  };
}

export interface CategoryConfig {
  enabled: boolean;
  filePatterns: string[];
  excludePatterns?: string[];
  customRules?: string[];
  severityThreshold?: IssueSeverity;
  maxIssues?: number;
}

export interface CodeReviewConfig {
  basePath: string;
  excludePatterns: string[];
  categories: Record<CodeReviewCategory, CategoryConfig>;
  ci?: {
    failOnSeverity: IssueSeverity;
    maxIssues: number;
    reportFormats: ('json' | 'html' | 'markdown' | 'sarif')[];
    notifications: {
      slack: boolean;
      email: boolean;
      github: boolean;
    };
  };
  reporting?: {
    includeCodeSnippets: boolean;
    groupByCategory: boolean;
    showProgress: boolean;
    maxIssuesPerFile: number;
    includeHealthcareContext: boolean;
  };
  rules?: {
    customRulesPath?: string;
    enableExperimentalRules: boolean;
    severityOverrides: Record<string, IssueSeverity>;
  };
}

export interface CodeReviewReport {
  id: string;
  timestamp: Date;
  config: CodeReviewConfig;
  results: CodeReviewResult[];
  summary: {
    totalFiles: number;
    totalIssues: number;
    issuesByCategory: Record<CodeReviewCategory, number>;
    issuesBySeverity: Record<IssueSeverity, number>;
    scanDuration: number;
    success: boolean;
  };
  metadata: {
    scanner: {
      name: string;
      version: string;
      rulesVersion: string;
    };
    environment: {
      nodeVersion: string;
      platform: string;
      cwd: string;
    };
    git?: {
      branch: string;
      commit: string;
      author: string;
    };
  };
}

export interface RemediationSuggestion {
  issueId: string;
  title: string;
  description: string;
  codeExample: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  automated: boolean;
  relatedIssues?: string[];
}

export interface CodeReviewMetrics {
  timestamp: Date;
  period: 'daily' | 'weekly' | 'monthly';
  metrics: {
    totalIssues: number;
    resolvedIssues: number;
    newIssues: number;
    issuesByCategory: Record<CodeReviewCategory, number>;
    issuesBySeverity: Record<IssueSeverity, number>;
    averageResolutionTime: number;
    codeQualityScore: number;
    complianceScore: number;
    securityScore: number;
  };
  trends: {
    issuesTrend: number; // percentage change
    resolutionTrend: number;
    qualityTrend: number;
  };
}

export interface CodeReviewDashboard {
  current: CodeReviewReport;
  historical: CodeReviewReport[];
  metrics: CodeReviewMetrics[];
  alerts: CodeReviewAlert[];
  recommendations: RemediationSuggestion[];
}

export interface CodeReviewAlert {
  id: string;
  type: 'security' | 'compliance' | 'performance' | 'quality';
  severity: IssueSeverity;
  title: string;
  description: string;
  affectedFiles: string[];
  triggeredAt: Date;
  acknowledged: boolean;
  resolved: boolean;
}

export interface CodeReviewIntegration {
  type: 'github' | 'gitlab' | 'slack' | 'email' | 'jira';
  config: Record<string, any>;
  enabled: boolean;
  events: string[];
}

export interface CodeReviewAutomation {
  schedule: string; // cron expression
  categories: CodeReviewCategory[];
  failOnSeverity: IssueSeverity;
  notifications: boolean;
  integrations: CodeReviewIntegration[];
  lastRun?: Date;
  nextRun?: Date;
}