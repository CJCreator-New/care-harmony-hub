import { hasAnyRole } from '@/hooks/usePermissions';
import { getEffectivePermissions, hasPermission, normalizePermission } from '@/lib/permissions';
import { UserRole } from '@/types/auth';
import { vi } from 'vitest';

// Mock sonner to prevent DOM access during tests
vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

describe('hasAnyRole', () => {
  it('returns true when user has required role', () => {
    const userRoles: UserRole[] = ['doctor', 'nurse'];
    const requiredRoles: UserRole[] = ['doctor'];
    
    expect(hasAnyRole(userRoles, requiredRoles)).toBe(true);
  });

  it('returns false when user lacks required role', () => {
    const userRoles: UserRole[] = ['nurse'];
    const requiredRoles: UserRole[] = ['doctor'];
    
    expect(hasAnyRole(userRoles, requiredRoles)).toBe(false);
  });

  it('returns true when user has any of multiple required roles', () => {
    const userRoles: UserRole[] = ['nurse'];
    const requiredRoles: UserRole[] = ['doctor', 'nurse'];
    
    expect(hasAnyRole(userRoles, requiredRoles)).toBe(true);
  });
});

describe('canonical permission helpers', () => {
  it('normalizes typed RBAC aliases to the canonical permission contract', () => {
    expect(normalizePermission('patient:read')).toBe('patients:read');
    expect(normalizePermission('appointment:read')).toBe('appointments:read');
    expect(normalizePermission('portal:access')).toBe('portal');
  });

  it('grants access when any assigned role satisfies the permission', () => {
    const permissions = getEffectivePermissions(['doctor', 'lab_technician']);

    expect(permissions).toContain('consultations:read');
    expect(permissions).toContain('lab:write');
    expect(hasPermission('lab_technician', 'lab:read')).toBe(true);
  });
});
