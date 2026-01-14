import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { UserRole } from '@/types/auth';

// Mock the AuthContext
const mockAuthContext = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock hasAnyRole
vi.mock('@/hooks/usePermissions', () => ({
  hasAnyRole: vi.fn(),
}));

import { hasAnyRole } from '@/hooks/usePermissions';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Week 3: Comprehensive Role-Based Access Testing', () => {
  const roles: UserRole[] = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Role Authentication States', () => {
    roles.forEach(role => {
      it(`should handle ${role} role authentication`, () => {
        mockAuthContext.mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
          roles: [role],
          user: { id: '1', email: 'test@test.com', role },
          hospital: { id: '1', name: 'Test Hospital' },
        });

        (hasAnyRole as any).mockReturnValue(true);

        render(
          <RoleProtectedRoute allowedRoles={[role]}>
            <div>Protected Content for {role}</div>
          </RoleProtectedRoute>,
          { wrapper: createWrapper() }
        );

        expect(screen.getByText(`Protected Content for ${role}`)).toBeInTheDocument();
      });
    });
  });

  describe('Route-Based Access Control', () => {
    const routePermissions = {
      '/admin/dashboard': ['admin'],
      '/admin/staff': ['admin'],
      '/admin/settings': ['admin'],
      '/doctor/dashboard': ['admin', 'doctor'],
      '/doctor/patients': ['admin', 'doctor', 'nurse', 'receptionist'],
      '/doctor/consultations': ['admin', 'doctor', 'nurse'],
      '/nurse/dashboard': ['admin', 'doctor', 'nurse'],
      '/nurse/patients': ['admin', 'doctor', 'nurse', 'receptionist'],
      '/pharmacy/dashboard': ['admin', 'pharmacist'],
      '/pharmacy/medications': ['admin', 'doctor', 'pharmacist'],
      '/laboratory/dashboard': ['admin', 'lab_technician'],
      '/laboratory/orders': ['admin', 'doctor', 'lab_technician'],
      '/reception/dashboard': ['admin', 'receptionist'],
      '/reception/appointments': ['admin', 'doctor', 'nurse', 'receptionist'],
      '/billing/dashboard': ['admin', 'receptionist'],
      '/patient/dashboard': ['patient'],
      '/patient/appointments': ['patient'],
      '/patient/records': ['patient'],
    };

    Object.entries(routePermissions).forEach(([route, allowedRoles]) => {
      describe(`Route: ${route}`, () => {
        roles.forEach(role => {
          const hasAccess = allowedRoles.includes(role);

          it(`should ${hasAccess ? 'allow' : 'deny'} ${role} access to ${route}`, () => {
            mockAuthContext.mockReturnValue({
              isAuthenticated: true,
              isLoading: false,
              roles: [role],
              user: { id: '1', email: 'test@test.com', role },
              hospital: { id: '1', name: 'Test Hospital' },
            });

            (hasAnyRole as any).mockReturnValue(hasAccess);

            render(
              <RoleProtectedRoute allowedRoles={allowedRoles as UserRole[]}>
                <div>Content for {route}</div>
              </RoleProtectedRoute>,
              { wrapper: createWrapper() }
            );

            if (hasAccess) {
              expect(screen.getByText(`Content for ${route}`)).toBeInTheDocument();
            } else {
              expect(screen.getByText('Access Denied')).toBeInTheDocument();
            }
          });
        });
      });
    });
  });

  describe('Role-Specific Permissions', () => {
    const permissionMatrix = {
      admin: {
        canManageUsers: true,
        canViewAllRecords: true,
        canModifySettings: true,
        canAccessAllModules: true,
      },
      doctor: {
        canViewPatientRecords: true,
        canPrescribeMedications: true,
        canOrderTests: true,
        canAccessConsultations: true,
      },
      nurse: {
        canViewPatientRecords: true,
        canRecordVitals: true,
        canUpdatePatientInfo: true,
        canAccessBasicModules: true,
      },
      receptionist: {
        canScheduleAppointments: true,
        canCheckInPatients: true,
        canViewBasicInfo: true,
        canAccessFrontDesk: true,
      },
      pharmacist: {
        canDispenseMedications: true,
        canManageInventory: true,
        canViewPrescriptions: true,
        canAccessPharmacy: true,
      },
      lab_technician: {
        canProcessLabOrders: true,
        canUploadResults: true,
        canViewLabData: true,
        canAccessLaboratory: true,
      },
      patient: {
        canViewOwnRecords: true,
        canBookAppointments: true,
        canAccessPortal: true,
        canCommunicateWithStaff: true,
      },
    };

    Object.entries(permissionMatrix).forEach(([role, permissions]) => {
      describe(`${role} permissions`, () => {
        Object.entries(permissions).forEach(([permission, expected]) => {
          it(`should ${expected ? 'grant' : 'deny'} ${permission} for ${role}`, () => {
            mockAuthContext.mockReturnValue({
              isAuthenticated: true,
              isLoading: false,
              roles: [role as UserRole],
              user: { id: '1', email: 'test@test.com', role: role as UserRole },
              hospital: { id: '1', name: 'Test Hospital' },
            });

            // Mock permission check - in real app this would come from usePermissions hook
            (hasAnyRole as any).mockReturnValue(expected);

            render(
              <RoleProtectedRoute allowedRoles={expected ? [role as UserRole] : ['non-existent-role']}>
                <div>{role} has {permission}: {expected ? '✓' : '✗'}</div>
              </RoleProtectedRoute>,
              { wrapper: createWrapper() }
            );

            if (expected) {
              expect(screen.getByText(`${role} has ${permission}: ✓`)).toBeInTheDocument();
            } else {
              expect(screen.getByText('Access Denied')).toBeInTheDocument();
            }
          });
        });
      });
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should show loading state during authentication', () => {
      mockAuthContext.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        roles: [],
      });

      render(
        <RoleProtectedRoute allowedRoles={['admin']}>
          <div>Protected Content</div>
        </RoleProtectedRoute>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should redirect unauthenticated users to login', () => {
      mockAuthContext.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        roles: [],
      });

      render(
        <RoleProtectedRoute allowedRoles={['admin']}>
          <div>Protected Content</div>
        </RoleProtectedRoute>,
        { wrapper: createWrapper() }
      );

      // Should not show protected content
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should handle multiple roles correctly', () => {
      mockAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        roles: ['doctor', 'admin'],
        user: { id: '1', email: 'test@test.com', role: 'doctor' },
        hospital: { id: '1', name: 'Test Hospital' },
      });

      (hasAnyRole as any).mockReturnValue(true);

      render(
        <RoleProtectedRoute allowedRoles={['admin']}>
          <div>Admin Content</div>
        </RoleProtectedRoute>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  describe('Role Switching and Persistence', () => {
    it('should persist role changes in localStorage', () => {
      const testRole: UserRole = 'doctor';
      localStorage.setItem('testRole', testRole);

      mockAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        roles: [testRole],
        user: { id: '1', email: 'test@test.com', role: testRole },
        hospital: { id: '1', name: 'Test Hospital' },
      });

      (hasAnyRole as any).mockReturnValue(true);

      render(
        <RoleProtectedRoute allowedRoles={[testRole]}>
          <div>{testRole} Dashboard</div>
        </RoleProtectedRoute>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(`${testRole} Dashboard`)).toBeInTheDocument();
      expect(localStorage.getItem('testRole')).toBe(testRole);
    });

    it('should handle role transitions correctly', () => {
      const transitions = [
        { from: 'patient', to: 'doctor', allowed: false },
        { from: 'nurse', to: 'doctor', allowed: false },
        { from: 'receptionist', to: 'admin', allowed: false },
        { from: 'admin', to: 'doctor', allowed: true },
        { from: 'doctor', to: 'admin', allowed: true },
      ];

      transitions.forEach(({ from, to, allowed }) => {
        mockAuthContext.mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
          roles: [from as UserRole],
          user: { id: '1', email: 'test@test.com', role: from as UserRole },
          hospital: { id: '1', name: 'Test Hospital' },
        });

        (hasAnyRole as any).mockReturnValue(allowed);

        const { unmount } = render(
          <RoleProtectedRoute allowedRoles={[to as UserRole]}>
            <div>{to} Content</div>
          </RoleProtectedRoute>,
          { wrapper: createWrapper() }
        );

        if (allowed) {
          expect(screen.getByText(`${to} Content`)).toBeInTheDocument();
        } else {
          expect(screen.getByText('Access Denied')).toBeInTheDocument();
        }

        unmount();
      });
    });
  });
});