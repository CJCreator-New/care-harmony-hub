// Admin RBAC Test Verification Script
// Standalone test runner to verify all test cases pass

import { AdminRBACManager } from '@/utils/adminRBACManager';
import { AdminPermission } from '@/types/admin';
import { UserRole } from '@/types/auth';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: String(error) });
    console.log(`✗ ${name}: ${error}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// AdminRBACManager Tests
console.log('\n=== AdminRBACManager ===\n');

test('admin has full permissions', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.SYSTEM_FULL_ACCESS), 'admin should have SYSTEM_FULL_ACCESS');
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.USER_CREATE), 'admin should have USER_CREATE');
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.ANALYTICS_VIEW_ALL), 'admin should have ANALYTICS_VIEW_ALL');
});

test('clinical staff has no admin permissions', () => {
  assert(!AdminRBACManager.hasPermission('doctor', AdminPermission.USER_CREATE), 'doctor should not have USER_CREATE');
  assert(!AdminRBACManager.hasPermission('nurse', AdminPermission.ANALYTICS_VIEW_ALL), 'nurse should not have ANALYTICS_VIEW_ALL');
  assert(!AdminRBACManager.hasPermission('patient', AdminPermission.SYSTEM_SETTINGS), 'patient should not have SYSTEM_SETTINGS');
});

test('returns false for undefined role', () => {
  assert(!AdminRBACManager.hasPermission(undefined, AdminPermission.USER_CREATE), 'undefined role should return false');
});

test('hasAnyPermission returns true if user has any permission', () => {
  const perms = [AdminPermission.USER_CREATE, AdminPermission.SYSTEM_FULL_ACCESS];
  assert(AdminRBACManager.hasAnyPermission('admin', perms), 'admin should have any of the permissions');
});

test('hasAnyPermission returns false if user has no permissions', () => {
  const perms = [AdminPermission.SYSTEM_FULL_ACCESS, AdminPermission.SYSTEM_AUDIT];
  assert(!AdminRBACManager.hasAnyPermission('doctor', perms), 'doctor should not have any of the permissions');
});

test('hasAllPermissions returns true if user has all permissions', () => {
  const perms = [AdminPermission.USER_CREATE, AdminPermission.ANALYTICS_VIEW_ALL];
  assert(AdminRBACManager.hasAllPermissions('admin', perms), 'admin should have all permissions');
});

test('hasAllPermissions returns false if user lacks any permission', () => {
  const perms = [AdminPermission.USER_CREATE, AdminPermission.SYSTEM_FULL_ACCESS];
  assert(!AdminRBACManager.hasAllPermissions('admin', perms), 'admin should not have all permissions');
});

test('admin can manage lower roles', () => {
  assert(AdminRBACManager.canManageRole('admin', 'doctor'), 'admin should manage doctor');
  assert(AdminRBACManager.canManageRole('admin', 'nurse'), 'admin should manage nurse');
});

test('lower roles cannot manage higher roles', () => {
  assert(!AdminRBACManager.canManageRole('doctor', 'admin'), 'doctor should not manage admin');
  assert(!AdminRBACManager.canManageRole('nurse', 'doctor'), 'nurse should not manage doctor');
});

test('admin roles can access panel', () => {
  assert(AdminRBACManager.canAccessAdminPanel('admin'), 'admin should access panel');
});

test('clinical staff cannot access panel', () => {
  assert(!AdminRBACManager.canAccessAdminPanel('doctor'), 'doctor should not access panel');
  assert(!AdminRBACManager.canAccessAdminPanel('nurse'), 'nurse should not access panel');
  assert(!AdminRBACManager.canAccessAdminPanel('patient'), 'patient should not access panel');
});

test('returns false for undefined role in canAccessAdminPanel', () => {
  assert(!AdminRBACManager.canAccessAdminPanel(undefined), 'undefined role should not access panel');
});

test('returns correct hierarchy levels', () => {
  assert(AdminRBACManager.getRoleLevel('admin') === 80, 'admin should be level 80');
  assert(AdminRBACManager.getRoleLevel('doctor') === 70, 'doctor should be level 70');
  assert(AdminRBACManager.getRoleLevel('patient') === 10, 'patient should be level 10');
});

test('super_admin can access all roles', () => {
  const roles = AdminRBACManager.getAccessibleRoles('super_admin');
  assert(roles.length > 0, 'super_admin should have accessible roles');
  assert(roles.includes('admin'), 'super_admin should access admin');
});

test('admin can access lower roles', () => {
  const roles = AdminRBACManager.getAccessibleRoles('admin');
  assert(roles.includes('doctor'), 'admin should access doctor');
  assert(!roles.includes('super_admin'), 'admin should not access super_admin');
});

test('validates hierarchy correctly', () => {
  assert(AdminRBACManager.validateRoleHierarchy('super_admin', 'admin'), 'super_admin > admin');
  assert(AdminRBACManager.validateRoleHierarchy('admin', 'doctor'), 'admin > doctor');
  assert(!AdminRBACManager.validateRoleHierarchy('doctor', 'admin'), 'doctor < admin');
});

test('returns permissions for role', () => {
  const perms = AdminRBACManager.getRolePermissions('admin');
  assert(perms.length > 0, 'admin should have permissions');
  assert(perms.includes(AdminPermission.USER_CREATE), 'admin should have USER_CREATE');
});

test('returns empty array for invalid role', () => {
  const perms = AdminRBACManager.getRolePermissions('invalid' as UserRole);
  assert(perms.length === 0, 'invalid role should have no permissions');
});

// Permission Scenarios
console.log('\n=== Permission Scenarios ===\n');

test('super_admin full access', () => {
  const perms = [AdminPermission.SYSTEM_FULL_ACCESS, AdminPermission.USER_CREATE];
  perms.forEach(p => assert(AdminRBACManager.hasPermission('super_admin', p), `super_admin should have ${p}`));
});

test('admin restricted access', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.USER_CREATE), 'admin should have USER_CREATE');
  assert(!AdminRBACManager.hasPermission('admin', AdminPermission.SYSTEM_FULL_ACCESS), 'admin should not have SYSTEM_FULL_ACCESS');
test('clinical staff no admin access', () => {
  const adminPerms = [AdminPermission.USER_CREATE, AdminPermission.SYSTEM_SETTINGS];
  adminPerms.forEach(p => {
    assert(!AdminRBACManager.hasPermission('doctor', p), `doctor should not have ${p}`);
    assert(!AdminRBACManager.hasPermission('nurse', p), `nurse should not have ${p}`);
  });
});

// Role Hierarchy
console.log('\n=== Role Hierarchy ===\n');

test('enforces hierarchy in management', () => {
  assert(AdminRBACManager.canManageRole('admin', 'doctor'), 'admin > doctor');
  assert(!AdminRBACManager.canManageRole('doctor', 'nurse'), 'doctor < nurse');
});

// Edge Cases
console.log('\n=== Edge Cases ===\n');

test('handles undefined roles', () => {
  assert(!AdminRBACManager.hasPermission(undefined, AdminPermission.USER_CREATE), 'undefined should return false');
  assert(!AdminRBACManager.hasAnyPermission(undefined, [AdminPermission.USER_CREATE]), 'undefined should return false');
  assert(!AdminRBACManager.canAccessAdminPanel(undefined), 'undefined should return false');
});

test('handles empty permission arrays', () => {
  assert(!AdminRBACManager.hasAnyPermission('admin', []), 'empty array should return false');
  assert(AdminRBACManager.hasAllPermissions('admin', []), 'empty array should return true');
});

test('handles invalid roles', () => {
  const invalid = 'invalid_role' as UserRole;
  assert(!AdminRBACManager.hasPermission(invalid, AdminPermission.USER_CREATE), 'invalid role should return false');
  assert(AdminRBACManager.getRoleLevel(invalid) === 0, 'invalid role should be level 0');
});

// Admin Panel Access
console.log('\n=== Admin Panel Access ===\n');

test('authorized roles can access', () => {
  const authorized: UserRole[] = ['admin'];
  authorized.forEach(r => assert(AdminRBACManager.canAccessAdminPanel(r), `${r} should access panel`));
});

test('unauthorized roles cannot access', () => {
  const unauthorized: UserRole[] = ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'];
  unauthorized.forEach(r => assert(!AdminRBACManager.canAccessAdminPanel(r), `${r} should not access panel`));
});

// Tab Visibility
console.log('\n=== Tab Visibility ===\n');

test('admin sees most tabs', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.ANALYTICS_VIEW_ALL), 'admin should see analytics');
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.USER_READ), 'admin should see users');
});

test('dept_head sees limited tabs', () => {
  assert(AdminRBACManager.hasPermission('dept_head', AdminPermission.ANALYTICS_VIEW_DEPT), 'dept_head should see dept analytics');
  assert(!AdminRBACManager.hasPermission('dept_head', AdminPermission.ANALYTICS_VIEW_ALL), 'dept_head should not see all analytics');
});

// User Management Permissions
console.log('\n=== User Management Permissions ===\n');

test('admin can create users', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.USER_CREATE), 'admin should create users');
});

test('admin can read users', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.USER_READ), 'admin should read users');
});

test('admin can update users', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.USER_UPDATE), 'admin should update users');
});

test('admin can assign roles', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.USER_ASSIGN_ROLE), 'admin should assign roles');
});

// Analytics Permissions
console.log('\n=== Analytics Permissions ===\n');

test('admin can view all analytics', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.ANALYTICS_VIEW_ALL), 'admin should view all analytics');
});

test('admin can export analytics', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.ANALYTICS_EXPORT), 'admin should export analytics');
});

test('dept_head can view department analytics', () => {
  assert(AdminRBACManager.hasPermission('dept_head', AdminPermission.ANALYTICS_VIEW_DEPT), 'dept_head should view dept analytics');
});

test('dept_head cannot view all analytics', () => {
  assert(!AdminRBACManager.hasPermission('dept_head', AdminPermission.ANALYTICS_VIEW_ALL), 'dept_head should not view all analytics');
});

// System Permissions
console.log('\n=== System Permissions ===\n');

test('admin can access system settings', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.SYSTEM_SETTINGS), 'admin should access settings');
});

test('admin cannot access audit logs', () => {
  assert(!AdminRBACManager.hasPermission('admin', AdminPermission.SYSTEM_AUDIT), 'admin should not access audit logs');
});

// Reporting Permissions
console.log('\n=== Reporting Permissions ===\n');

test('admin can view reports', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.REPORT_VIEW), 'admin should view reports');
});

test('admin can export reports', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.REPORT_EXPORT), 'admin should export reports');
});

test('admin can schedule reports', () => {
  assert(AdminRBACManager.hasPermission('admin', AdminPermission.REPORT_SCHEDULE), 'admin should schedule reports');
});

// Role Comparison
console.log('\n=== Role Comparison ===\n');
});

test('admin has more permissions than dept_head', () => {
  const adminPerms = AdminRBACManager.getRolePermissions('admin');
  const deptHeadPerms = AdminRBACManager.getRolePermissions('dept_head');
  assert(adminPerms.length > deptHeadPerms.length, 'admin should have > permissions than dept_head');
});

test('dept_head has more permissions than doctor', () => {
  const deptHeadPerms = AdminRBACManager.getRolePermissions('dept_head');
  const doctorPerms = AdminRBACManager.getRolePermissions('doctor');
  assert(deptHeadPerms.length > doctorPerms.length, 'dept_head should have > permissions than doctor');
});

// Cross-Role Scenarios
console.log('\n=== Cross-Role Scenarios ===\n');

test('super_admin can manage all other roles', () => {
  const roles: UserRole[] = ['admin', 'dept_head', 'doctor', 'nurse', 'patient'];
  roles.forEach(r => assert(AdminRBACManager.canManageRole('super_admin', r), `super_admin should manage ${r}`));
});

test('admin cannot manage super_admin or dept_head', () => {
  assert(!AdminRBACManager.canManageRole('admin', 'super_admin'), 'admin should not manage super_admin');
  assert(!AdminRBACManager.canManageRole('admin', 'dept_head'), 'admin should not manage dept_head');
});

test('dept_head cannot manage admin roles', () => {
  assert(!AdminRBACManager.canManageRole('dept_head', 'admin'), 'dept_head should not manage admin');
  assert(!AdminRBACManager.canManageRole('dept_head', 'super_admin'), 'dept_head should not manage super_admin');
});

// Summary
console.log('\n=== TEST SUMMARY ===\n');
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed} ✓`);
console.log(`Failed: ${failed} ✗`);
console.log(`Success Rate: ${((passed / total) * 100).toFixed(2)}%`);

if (failed > 0) {
  console.log('\nFailed Tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  ✗ ${r.name}`);
    if (r.error) console.log(`    Error: ${r.error}`);
  });
}

console.log('\n' + (failed === 0 ? '✓ ALL TESTS PASSED!' : '✗ SOME TESTS FAILED'));
