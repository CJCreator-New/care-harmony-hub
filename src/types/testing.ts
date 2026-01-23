export type TestStatus = 'Not Started' | 'In Progress' | 'Passed' | 'Failed' | 'Blocked' | 'N/A';

export type TestPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type TestCategoryType =
  | 'Appointments & Scheduling'
  | 'Billing & Payments'
  | 'Analytics & Reporting'
  | 'Care Coordination'
  | 'Patient Portal'
  | 'Role-Based Access Control'
  | 'Laboratory Management'
  | 'Pharmacy Operations'
  | 'Telemedicine'
  | 'Inventory Management'
  | 'Notifications & Messaging'
  | 'Security & Compliance'
  | 'Performance & Load Testing'
  | 'Accessibility & Usability'
  | 'Integration Testing';

export interface Note {
  id: string;
  content: string;
  timestamp: Date;
  author?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
}

export interface TestCase {
  id: string;
  category: TestCategoryType;
  name: string;
  description: string;
  priority: TestPriority;
  status: TestStatus;
  steps: string[];
  expectedResult: string;
  actualResult: string;
  assignee?: string;
  createdDate: Date;
  lastUpdated: Date;
  notes: Note[];
  attachments: Attachment[];
  automationScript?: string;
  automationEnabled: boolean;
  bugTicketLinks?: string[];
}

export interface TestCategory {
  id: string;
  type: TestCategoryType;
  name: string;
  description: string;
  testCases: TestCase[];
  progress: {
    total: number;
    completed: number;
    passed: number;
    failed: number;
    blocked: number;
  };
}

export interface AutomationScript {
  id: string;
  name: string;
  category: TestCategoryType;
  code: string;
  version: number;
  createdAt: Date;
  lastModified: Date;
  lastRun?: Date;
  lastStatus?: 'Passed' | 'Failed';
  executionHistory: {
    runAt: Date;
    status: 'Passed' | 'Failed';
    duration?: number;
    errorMessage?: string;
  }[];
}

export interface TestExecutionResult {
  id: string;
  testCaseId: string;
  runAt: Date;
  status: TestStatus;
  duration?: number;
  errorMessage?: string;
  screenshots?: string[];
  logs?: string;
}

export interface TestingDashboardData {
  categories: TestCategory[];
  overallProgress: {
    totalTests: number;
    completedTests: number;
    passedTests: number;
    failedTests: number;
    blockedTests: number;
    passRate: number;
  };
  recentActivity: {
    id: string;
    type: 'test_updated' | 'script_generated' | 'execution_completed';
    message: string;
    timestamp: Date;
  }[];
}

export interface ReportData {
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalTests: number;
    passRate: number;
    criticalIssues: number;
    averageExecutionTime: number;
  };
  categoryBreakdown: {
    category: TestCategoryType;
    total: number;
    passed: number;
    failed: number;
    blocked: number;
  }[];
  velocityData: {
    date: string;
    completed: number;
    passed: number;
    failed: number;
  }[];
  blockerIssues: {
    id: string;
    testCase: string;
    category: TestCategoryType;
    priority: TestPriority;
    description: string;
    blockedSince: Date;
  }[];
}

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: TestCategoryType;
  template: string;
  variables: {
    name: string;
    description: string;
    defaultValue?: string;
  }[];
}