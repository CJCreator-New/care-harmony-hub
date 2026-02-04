import { renderHook } from '@testing-library/react';
import { hasAnyRole } from '@/hooks/usePermissions';
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