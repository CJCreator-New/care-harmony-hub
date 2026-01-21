import { describe, it, expect } from 'vitest';
import { AdminRBACManager } from '@/utils/adminRBACManager';
import { AdminPermission } from '@/types/admin';

describe('Admin RBAC Tests', () => {
  it('super_admin has all permissions', () => {
    expect(AdminRBACManager.hasPermission('super_admin', AdminPermission.SYSTEM_FULL_ACCESS)).toBe(true);
    expect(AdminRBACManager.hasPermission('super_admin', AdminPermission.USER_CREATE)).toBe(true);
  });

  it('admin has limited permissions', () => {
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.USER_CREATE)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.SYSTEM_FULL_ACCESS)).toBe(false);
  });

  it('dept_head has department permissions', () => {
    expect(AdminRBACManager.hasPermission('dept_head', AdminPermission.USER_READ)).toBe(true);
    expect(AdminRBACManager.hasPermission('dept_head', AdminPermission.USER_CREATE)).toBe(false);
  });

  it('clinical staff has no admin permissions', () => {
    expect(AdminRBACManager.hasPermission('doctor', AdminPermission.USER_CREATE)).toBe(false);
    expect(AdminRBACManager.hasPermission('nurse', AdminPermission.ANALYTICS_VIEW_ALL)).toBe(false);
  });

  it('super_admin can manage all roles', () => {
    expect(AdminRBACManager.canManageRole('super_admin', 'admin')).toBe(true);
    expect(AdminRBACManager.canManageRole('super_admin', 'doctor')).toBe(true);
  });

  it('admin can manage lower roles', () => {
    expect(AdminRBACManager.canManageRole('admin', 'doctor')).toBe(true);
    expect(AdminRBACManager.canManageRole('admin', 'nurse')).toBe(true);
  });

  it('admin cannot manage super_admin', () => {
    expect(AdminRBACManager.canManageRole('admin', 'super_admin')).toBe(false);
  });

  it('admin roles can access panel', () => {
    expect(AdminRBACManager.canAccessAdminPanel('super_admin')).toBe(true);
    expect(AdminRBACManager.canAccessAdminPanel('admin')).toBe(true);
    expect(AdminRBACManager.canAccessAdminPanel('dept_head')).toBe(true);
  });

  it('clinical staff cannot access panel', () => {
    expect(AdminRBACManager.canAccessAdminPanel('doctor')).toBe(false);
    expect(AdminRBACManager.canAccessAdminPanel('nurse')).toBe(false);
    expect(AdminRBACManager.canAccessAdminPanel('patient')).toBe(false);
  });

  it('returns correct hierarchy levels', () => {
    expect(AdminRBACManager.getRoleLevel('super_admin')).toBe(100);
    expect(AdminRBACManager.getRoleLevel('admin')).toBe(80);
    expect(AdminRBACManager.getRoleLevel('dept_head')).toBe(90);
    expect(AdminRBACManager.getRoleLevel('doctor')).toBe(70);
    expect(AdminRBACManager.getRoleLevel('patient')).toBe(10);
  });

  it('hasAnyPermission works correctly', () => {
    const perms = [AdminPermission.USER_CREATE, AdminPermission.SYSTEM_FULL_ACCESS];
    expect(AdminRBACManager.hasAnyPermission('admin', perms)).toBe(true);
    expect(AdminRBACManager.hasAnyPermission('doctor', perms)).toBe(false);
  });

  it('hasAllPermissions works correctly', () => {
    const perms = [AdminPermission.USER_CREATE, AdminPermission.ANALYTICS_VIEW_ALL];
    expect(AdminRBACManager.hasAllPermissions('admin', perms)).toBe(true);
    expect(AdminRBACManager.hasAllPermissions('admin', [AdminPermission.SYSTEM_FULL_ACCESS])).toBe(false);
  });

  it('handles undefined roles', () => {
    expect(AdminRBACManager.hasPermission(undefined, AdminPermission.USER_CREATE)).toBe(false);
    expect(AdminRBACManager.canAccessAdminPanel(undefined)).toBe(false);
  });

  it('getRolePermissions returns correct permissions', () => {
    const adminPerms = AdminRBACManager.getRolePermissions('admin');
    expect(adminPerms.length).toBeGreaterThan(0);
    expect(adminPerms).toContain(AdminPermission.USER_CREATE);
  });

  it('validateRoleHierarchy works correctly', () => {
    expect(AdminRBACManager.validateRoleHierarchy('super_admin', 'admin')).toBe(true);
    expect(AdminRBACManager.validateRoleHierarchy('admin', 'doctor')).toBe(true);
    expect(AdminRBACManager.validateRoleHierarchy('doctor', 'admin')).toBe(false);
  });

  it('getAccessibleRoles returns correct roles', () => {
    const superAdminRoles = AdminRBACManager.getAccessibleRoles('super_admin');
    expect(superAdminRoles.length).toBeGreaterThan(0);
    expect(superAdminRoles).toContain('admin');

    const adminRoles = AdminRBACManager.getAccessibleRoles('admin');
    expect(adminRoles).toContain('doctor');
    expect(adminRoles).not.toContain('super_admin');
  });

  it('admin can view all analytics', () => {
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.ANALYTICS_VIEW_ALL)).toBe(true);
  });

  it('dept_head can view department analytics', () => {
    expect(AdminRBACManager.hasPermission('dept_head', AdminPermission.ANALYTICS_VIEW_DEPT)).toBe(true);
    expect(AdminRBACManager.hasPermission('dept_head', AdminPermission.ANALYTICS_VIEW_ALL)).toBe(false);
  });

  it('admin can manage users', () => {
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.USER_CREATE)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.USER_READ)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.USER_UPDATE)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.USER_ASSIGN_ROLE)).toBe(true);
  });

  it('super_admin can access system settings', () => {
    expect(AdminRBACManager.hasPermission('super_admin', AdminPermission.SYSTEM_SETTINGS)).toBe(true);
    expect(AdminRBACManager.hasPermission('super_admin', AdminPermission.SYSTEM_AUDIT)).toBe(true);
  });

  it('admin can access system settings but not audit logs', () => {
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.SYSTEM_SETTINGS)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.SYSTEM_AUDIT)).toBe(false);
  });

  it('admin can view and export reports', () => {
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.REPORT_VIEW)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.REPORT_EXPORT)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.REPORT_SCHEDULE)).toBe(true);
  });

  it('dept_head can view reports but not schedule', () => {
    expect(AdminRBACManager.hasPermission('dept_head', AdminPermission.REPORT_VIEW)).toBe(true);
    expect(AdminRBACManager.hasPermission('dept_head', AdminPermission.REPORT_SCHEDULE)).toBe(false);
  });

  it('super_admin has more permissions than admin', () => {
    const superAdminPerms = AdminRBACManager.getRolePermissions('super_admin');
    const adminPerms = AdminRBACManager.getRolePermissions('admin');
    expect(superAdminPerms.length).toBeGreaterThanOrEqual(adminPerms.length);
  });

  it('admin has more permissions than dept_head', () => {
    const adminPerms = AdminRBACManager.getRolePermissions('admin');
    const deptHeadPerms = AdminRBACManager.getRolePermissions('dept_head');
    expect(adminPerms.length).toBeGreaterThan(deptHeadPerms.length);
  });

  it('enforces role hierarchy in management', () => {
    expect(AdminRBACManager.canManageRole('super_admin', 'admin')).toBe(true);
    expect(AdminRBACManager.canManageRole('admin', 'doctor')).toBe(true);
    expect(AdminRBACManager.canManageRole('admin', 'super_admin')).toBe(false);
    expect(AdminRBACManager.canManageRole('doctor', 'nurse')).toBe(false);
  });

  it('handles empty permission arrays', () => {
    expect(AdminRBACManager.hasAnyPermission('admin', [])).toBe(false);
    expect(AdminRBACManager.hasAllPermissions('admin', [])).toBe(true);
  });

  it('handles invalid roles', () => {
    const invalid = 'invalid_role' as any;
    expect(AdminRBACManager.hasPermission(invalid, AdminPermission.USER_CREATE)).toBe(false);
    expect(AdminRBACManager.getRoleLevel(invalid)).toBe(0);
  });
});
