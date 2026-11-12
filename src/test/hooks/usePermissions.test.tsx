import { hasAnyRole } from '@/lib/hooks';
import { hasPermission } from '@/lib/permissions';
import { can, resolveCapability } from '@/modules/rbac';
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
  it('resolves legacy keys and canonical capabilities to one canonical capability', () => {
    expect(resolveCapability('patients:read')).toBe('patient:read');
    expect(resolveCapability('patient:read')).toBe('patient:read');
    expect(resolveCapability('portal')).toBe('portal:access');
    expect(resolveCapability('not-a-permission')).toBeNull();
  });

  it('decides only from the acting role, not from other roles held', () => {
    expect(can('lab_technician', 'lab:read')).toBe(true);
    expect(can('lab_technician', 'consultations:write')).toBe(false);
    expect(hasPermission('lab_technician', 'lab:read')).toBe(true);
  });
});
