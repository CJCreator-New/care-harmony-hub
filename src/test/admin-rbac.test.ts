import { describe, it, expect } from 'vitest';
import { AdminRBACManager } from '@/utils/adminRBACManager';
import { AdminPermission } from '@/types/admin';

describe('Admin RBAC Tests', () => {
  it('admin has full permissions', () => {
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.SYSTEM_FULL_ACCESS)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.USER_CREATE)).toBe(true);
  });

  it('clinical staff has no admin permissions', () => {
    expect(AdminRBACManager.hasPermission('doctor', AdminPermission.USER_CREATE)).toBe(false);
    expect(AdminRBACManager.hasPermission('nurse', AdminPermission.ANALYTICS_VIEW_ALL)).toBe(false);
  });

  it('admin can manage lower roles', () => {
    expect(AdminRBACManager.canManageRole('admin', 'doctor')).toBe(true);
    expect(AdminRBACManager.canManageRole('admin', 'nurse')).toBe(true);
  });

  it('admin roles can access panel', () => {
    expect(AdminRBACManager.canAccessAdminPanel('admin')).toBe(true);
  });

  it('clinical staff cannot access panel', () => {
    expect(AdminRBACManager.canAccessAdminPanel('doctor')).toBe(false);
    expect(AdminRBACManager.canAccessAdminPanel('nurse')).toBe(false);
    expect(AdminRBACManager.canAccessAdminPanel('patient')).toBe(false);
  });

  it('returns correct hierarchy levels', () => {
    expect(AdminRBACManager.getRoleLevel('admin')).toBe(80);
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
    expect(AdminRBACManager.hasAllPermissions('admin', [AdminPermission.SYSTEM_FULL_ACCESS])).toBe(true);
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
    expect(AdminRBACManager.validateRoleHierarchy('admin', 'doctor')).toBe(true);
    expect(AdminRBACManager.validateRoleHierarchy('doctor', 'admin')).toBe(false);
  });

  it('getAccessibleRoles returns correct roles', () => {
    const adminRoles = AdminRBACManager.getAccessibleRoles('admin');
    expect(adminRoles).toContain('doctor');
  });

  it('admin can view all analytics', () => {
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.ANALYTICS_VIEW_ALL)).toBe(true);
  });

  it('admin can manage users', () => {
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.USER_CREATE)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.USER_READ)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.USER_UPDATE)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.USER_ASSIGN_ROLE)).toBe(true);
  });

  it('admin can access system settings and audit logs', () => {
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.SYSTEM_SETTINGS)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.SYSTEM_AUDIT)).toBe(true);
  });

  it('admin can view and export reports', () => {
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.REPORT_VIEW)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.REPORT_EXPORT)).toBe(true);
    expect(AdminRBACManager.hasPermission('admin', AdminPermission.REPORT_SCHEDULE)).toBe(true);
  });

  it('admin has permissions', () => {
    const adminPerms = AdminRBACManager.getRolePermissions('admin');
    expect(adminPerms.length).toBeGreaterThan(0);
  });

  it('enforces role hierarchy in management', () => {
    expect(AdminRBACManager.canManageRole('admin', 'doctor')).toBe(true);
    expect(AdminRBACManager.canManageRole('doctor', 'nurse')).toBe(true);
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
