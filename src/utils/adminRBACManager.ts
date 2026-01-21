// Admin RBAC Manager
import { UserRole } from '@/types/auth';
import { AdminPermission, RolePermissionMapping } from '@/types/admin';

export const ADMIN_ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  dept_head: 90,
  doctor: 70,
  nurse: 60,
  receptionist: 50,
  pharmacist: 40,
  lab_technician: 30,
  patient: 10,
};

export const ADMIN_ROLE_PERMISSIONS: Record<UserRole, AdminPermission[]> = {
  super_admin: [
    AdminPermission.SYSTEM_FULL_ACCESS,
    AdminPermission.SYSTEM_SETTINGS,
    AdminPermission.SYSTEM_AUDIT,
    AdminPermission.USER_CREATE,
    AdminPermission.USER_READ,
    AdminPermission.USER_UPDATE,
    AdminPermission.USER_DELETE,
    AdminPermission.USER_ASSIGN_ROLE,
    AdminPermission.ANALYTICS_VIEW_ALL,
    AdminPermission.ANALYTICS_EXPORT,
    AdminPermission.REPORT_VIEW,
    AdminPermission.REPORT_EXPORT,
    AdminPermission.REPORT_SCHEDULE,
  ],

  admin: [
    AdminPermission.USER_CREATE,
    AdminPermission.USER_READ,
    AdminPermission.USER_UPDATE,
    AdminPermission.USER_ASSIGN_ROLE,
    AdminPermission.ANALYTICS_VIEW_ALL,
    AdminPermission.ANALYTICS_EXPORT,
    AdminPermission.REPORT_VIEW,
    AdminPermission.REPORT_EXPORT,
    AdminPermission.REPORT_SCHEDULE,
    AdminPermission.SYSTEM_SETTINGS,
  ],

  dept_head: [
    AdminPermission.USER_READ,
    AdminPermission.ANALYTICS_VIEW_DEPT,
    AdminPermission.REPORT_VIEW,
    AdminPermission.REPORT_EXPORT,
  ],

  doctor: [],
  nurse: [],
  receptionist: [],
  pharmacist: [],
  lab_technician: [],
  patient: [],
};

export class AdminRBACManager {
  static hasPermission(role: UserRole | undefined, permission: AdminPermission): boolean {
    if (!role) return false;

    const rolePermissions = ADMIN_ROLE_PERMISSIONS[role] || [];

    // Super admin has all permissions
    if (role === 'super_admin') return true;

    // Check exact permission match
    if (rolePermissions.includes(permission)) return true;

    // Check wildcard permissions
    if (permission === AdminPermission.SYSTEM_FULL_ACCESS && rolePermissions.includes(AdminPermission.SYSTEM_FULL_ACCESS)) {
      return true;
    }

    return false;
  }

  static hasAnyPermission(role: UserRole | undefined, permissions: AdminPermission[]): boolean {
    if (!role) return false;
    return permissions.some(permission => this.hasPermission(role, permission));
  }

  static hasAllPermissions(role: UserRole | undefined, permissions: AdminPermission[]): boolean {
    if (!role) return false;
    return permissions.every(permission => this.hasPermission(role, permission));
  }

  static canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
    return ADMIN_ROLE_HIERARCHY[managerRole] > ADMIN_ROLE_HIERARCHY[targetRole];
  }

  static canAccessAdminPanel(role: UserRole | undefined): boolean {
    if (!role) return false;
    const adminRoles: UserRole[] = ['super_admin', 'admin', 'dept_head'];
    return adminRoles.includes(role);
  }

  static getRoleLevel(role: UserRole): number {
    return ADMIN_ROLE_HIERARCHY[role] || 0;
  }

  static getAccessibleRoles(managerRole: UserRole): UserRole[] {
    const managerLevel = ADMIN_ROLE_HIERARCHY[managerRole];
    return Object.entries(ADMIN_ROLE_HIERARCHY)
      .filter(([_, level]) => level < managerLevel)
      .map(([role]) => role as UserRole);
  }

  static getRolePermissions(role: UserRole): AdminPermission[] {
    return ADMIN_ROLE_PERMISSIONS[role] || [];
  }

  static validateRoleHierarchy(managerRole: UserRole, targetRole: UserRole): boolean {
    return ADMIN_ROLE_HIERARCHY[managerRole] > ADMIN_ROLE_HIERARCHY[targetRole];
  }
}
