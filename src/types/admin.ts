// Admin-specific types for CareSync HIMS
import { UserRole } from './auth';

export enum AdminPermission {
  // System Administration
  SYSTEM_FULL_ACCESS = 'system:*',
  SYSTEM_SETTINGS = 'system:settings',
  SYSTEM_AUDIT = 'system:audit',
  
  // User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_ASSIGN_ROLE = 'user:assign_role',
  
  // Analytics
  ANALYTICS_VIEW_ALL = 'analytics:view:all',
  ANALYTICS_VIEW_DEPT = 'analytics:view:department',
  ANALYTICS_EXPORT = 'analytics:export',
  
  // Reporting
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',
  REPORT_SCHEDULE = 'report:schedule',
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  department?: string;
  permissions: AdminPermission[];
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  lastLogin?: Date;
  twoFactorEnabled: boolean;
}

export interface AdminDashboardMetrics {
  realTimeMetrics: {
    activeUsers: number;
    patientThroughput: number;
    systemLoad: number;
    errorRate: number;
  };
  financialMetrics: {
    dailyRevenue: number;
    pendingBills: number;
    insuranceClaims: number;
  };
  operationalMetrics: {
    bedOccupancy: number;
    staffUtilization: number;
    avgWaitTime: number;
  };
  qualityMetrics: {
    patientSatisfaction: number;
    errorRate: number;
    complianceScore: number;
  };
}

export interface UserManagementData {
  users: AdminUser[];
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface SystemSettings {
  hospitalName: string;
  hospitalId: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
  backupSchedule: string;
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expiryDays: number;
  };
}

export interface RolePermissionMapping {
  role: UserRole;
  permissions: AdminPermission[];
  description: string;
  level: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  user: AdminUser;
  token: string;
  redirectUrl: string;
}
