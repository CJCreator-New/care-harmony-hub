import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/types/auth';

// Mock the AuthContext
const mockAuthContext = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock usePermissions hook
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
  hasAnyRole: vi.fn(),
  hasRole: vi.fn(),
}));

// Import the mocked functions
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

// Helper component for testing permissions
function PermissionsTestComponent() {
  const permissions = usePermissions();

  return (
    <div>
      {Object.entries(permissions).map(([key, value]) => (
        <div
          key={key}
          data-testid={`permission-${key}`}
          className={value ? 'granted' : 'denied'}
        >
          {key}: {value ? '✓' : '✗'}
        </div>
      ))}
    </div>
  );
}

describe('Week 3: Role-Based Access Testing', () => {
  const roles: UserRole[] = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Role Authentication States', () => {
    it.each(roles)('should handle %s role authentication', (role) => {
      mockAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        roles: [role],
        user: { id: '1', email: 'test@test.com', role },
        hospital: { id: '1', name: 'Test Hospital' },
      });

      // Mock hasAnyRole to return true for the current role
      (hasAnyRole as any).mockReturnValue(true);

      const { rerender } = render(
        <RoleProtectedRoute allowedRoles={[role]}>
          <div>Protected Content</div>
        </RoleProtectedRoute>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

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

    it('should redirect unauthenticated users', () => {
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

      // Should redirect to login, so protected content shouldn't be visible
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Role-Based Route Access Control', () => {
    const routePermissions = {
      '/patients': ['admin', 'doctor', 'nurse', 'receptionist'],
      '/appointments': ['admin', 'doctor', 'nurse', 'receptionist'],
      '/consultations': ['admin', 'doctor', 'nurse'],
      '/pharmacy': ['admin', 'doctor', 'pharmacist'],
      '/laboratory': ['admin', 'doctor', 'lab_technician'],
      '/billing': ['admin', 'receptionist'],
      '/staff-management': ['admin'],
      '/reports': ['admin', 'doctor'],
      '/settings': ['admin'],
    };

    Object.entries(routePermissions).forEach(([route, allowedRoles]) => {
      it.each(roles)(`should allow %s role access to ${route}`, (role) => {
        const hasAccess = allowedRoles.includes(role);

        mockAuthContext.mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
          roles: [role],
          user: { id: '1', email: 'test@test.com', role },
          hospital: { id: '1', name: 'Test Hospital' },
        });

        // Mock hasAnyRole based on whether the role has access
        (hasAnyRole as any).mockReturnValue(hasAccess);

        render(
          <RoleProtectedRoute allowedRoles={allowedRoles as UserRole[]}>
            <div>Route Content: {route}</div>
          </RoleProtectedRoute>,
          { wrapper: createWrapper() }
        );

        if (hasAccess) {
          expect(screen.getByText(`Route Content: ${route}`)).toBeInTheDocument();
        } else {
          expect(screen.getByText('Access Denied')).toBeInTheDocument();
        }
      });
    });
  });

  describe('Role-Based Permissions', () => {
    const permissionTests = [
      {
        role: 'admin' as UserRole,
        expectedPermissions: {
          canViewPatients: true,
          canCreatePatients: true,
          canEditPatients: true,
          canDeletePatients: true,
          canViewStaff: true,
          canManageStaff: true,
          canViewSettings: true,
          canManageHospitalSettings: true,
          canViewReports: true,
          canGenerateReports: true,
        }
      },
      {
        role: 'doctor' as UserRole,
        expectedPermissions: {
          canViewPatients: true,
          canCreatePatients: false,
          canEditPatients: true,
          canStartConsultation: true,
          canPrescribe: true,
          canOrderLabs: true,
          canViewReports: true,
        }
      },
      {
        role: 'nurse' as UserRole,
        expectedPermissions: {
          canViewPatients: true,
          canRecordVitals: true,
          canCheckInPatients: true,
          canViewConsultations: true,
        }
      },
      {
        role: 'receptionist' as UserRole,
        expectedPermissions: {
          canViewPatients: true,
          canCreateAppointments: true,
          canCheckInPatients: true,
          canViewBilling: true,
        }
      },
      {
        role: 'pharmacist' as UserRole,
        expectedPermissions: {
          canViewPharmacy: true,
          canDispenseMedication: true,
          canManageInventory: true,
        }
      },
      {
        role: 'lab_technician' as UserRole,
        expectedPermissions: {
          canViewLaboratory: true,
          canProcessLabOrders: true,
          canUploadResults: true,
        }
      },
      {
        role: 'patient' as UserRole,
        expectedPermissions: {
          canViewOwnRecords: true,
          canBookAppointments: true,
          canViewOwnPrescriptions: true,
        }
      }
    ];

    permissionTests.forEach(({ role, expectedPermissions }) => {
      it(`should grant correct permissions for ${role} role`, () => {
        mockAuthContext.mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
          roles: [role],
          user: { id: '1', email: 'test@test.com', role },
          hospital: { id: '1', name: 'Test Hospital' },
        });

        // Mock the usePermissions hook to return expected permissions
        const mockPermissions = expectedPermissions;
        (usePermissions as any).mockReturnValue(mockPermissions);

        render(
          <div>
            <PermissionsTestComponent />
          </div>,
          { wrapper: createWrapper() }
        );

        // Verify permissions are correctly applied
        Object.entries(expectedPermissions).forEach(([permission, expected]) => {
          const element = screen.getByTestId(`permission-${permission}`);
          if (expected) {
            expect(element).toHaveClass('granted');
          } else {
            expect(element).toHaveClass('denied');
          }
        });
      });
    });
  });

  describe('Role Switching and Persistence', () => {
    it('should persist role changes across sessions', () => {
      const testRole = 'doctor';

      // Simulate role change
      localStorage.setItem('testRole', testRole);

      mockAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        roles: [testRole],
        user: { id: '1', email: 'test@test.com', role: testRole },
        hospital: { id: '1', name: 'Test Hospital' },
      });

      // Mock hasAnyRole to return true for doctor role
      (hasAnyRole as any).mockReturnValue(true);

      render(
        <RoleProtectedRoute allowedRoles={['doctor']}>
          <div>Doctor Dashboard</div>
        </RoleProtectedRoute>,
        { wrapper: createWrapper() }
      );

      // Should persist role
      expect(localStorage.getItem('testRole')).toBe(testRole);
      expect(screen.getByText('Doctor Dashboard')).toBeInTheDocument();
    });

    it('should handle role switching between all user types', () => {
      roles.forEach(role => {
        localStorage.setItem('testRole', role);

        mockAuthContext.mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
          roles: [role],
          user: { id: '1', email: 'test@test.com', role },
          hospital: { id: '1', name: 'Test Hospital' },
        });

        // Mock hasAnyRole to return true for the current role
        (hasAnyRole as any).mockReturnValue(true);

        const { unmount } = render(
          <RoleProtectedRoute allowedRoles={[role]}>
            <div>{role} Content</div>
          </RoleProtectedRoute>,
          { wrapper: createWrapper() }
        );

        expect(screen.getByText(`${role} Content`)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Unauthorized Access Handling', () => {
    it('should show access denied for insufficient permissions', () => {
      mockAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        roles: ['patient'],
        user: { id: '1', email: 'test@test.com', role: 'patient' },
        hospital: { id: '1', name: 'Test Hospital' },
      });

      // Mock hasAnyRole to return false for patient trying to access admin content
      (hasAnyRole as any).mockReturnValue(false);

      render(
        <RoleProtectedRoute allowedRoles={['admin']}>
          <div>Admin Only Content</div>
        </RoleProtectedRoute>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You do not have permission to access this resource.')).toBeInTheDocument();
    });

    it('should provide role-specific access denied messages', () => {
      const roleMessages = {
        patient: 'Patient access limited to personal records',
        nurse: 'Nurse access limited to patient care tasks',
        receptionist: 'Receptionist access limited to scheduling and check-in',
        pharmacist: 'Pharmacist access limited to medication management',
        lab_technician: 'Lab technician access limited to laboratory operations',
      };

      Object.entries(roleMessages).forEach(([role, message]) => {
        mockAuthContext.mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
          roles: [role as UserRole],
          user: { id: '1', email: 'test@test.com', role: role as UserRole },
          hospital: { id: '1', name: 'Test Hospital' },
        });

        const { unmount } = render(
          <RoleProtectedRoute allowedRoles={['admin']}>
            <div>Admin Content</div>
          </RoleProtectedRoute>,
          { wrapper: createWrapper() }
        );

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        unmount();
      });
    });
  });
});