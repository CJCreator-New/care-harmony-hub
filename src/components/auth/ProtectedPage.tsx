import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { hasAnyAllowedRole } from '@/lib/permissions';
import { getDevTestRole } from '@/utils/devRoleSwitch';
import { Loader2, ShieldAlert } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';

interface ProtectedPageProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  label?: string;
  critical?: boolean;
}

/**
 * Enhanced page protection wrapper that provides a second layer of route protection.
 * This wrapper ensures that even if the route-level protection is bypassed,
 * the page itself cannot be rendered for unauthorized users.
 * 
 * Usage:
 * ```tsx
 * export default function AdminPage() {
 *   return (
 *     <ProtectedPage allowedRoles={['admin']} label="Admin Dashboard" critical>
 *       <AdminDashboardContent />
 *     </ProtectedPage>
 *   );
 * }
 * ```
 */
export function ProtectedPage({
  children,
  allowedRoles,
  label = 'Page',
  critical = false,
}: ProtectedPageProps) {
  const { isAuthenticated, isLoading, roles, primaryRole } = useAuth();
  const location = useLocation();

  // Show loading state while auth is being resolved
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Require authentication
  if (!isAuthenticated) {
    return <Navigate to="/hospital/login" state={{ from: location }} replace />;
  }

  // Calculate effective roles (include test role override)
  const persistedTestRole = getDevTestRole(roles);
  const effectiveRoles = persistedTestRole ? [persistedTestRole] : (primaryRole ? [primaryRole] : roles);

  // Verify role access
  const hasAccess = hasAnyAllowedRole(effectiveRoles, allowedRoles);

  if (!hasAccess) {
    // Log the unauthorized access attempt in development
    if (import.meta.env.DEV) {
      console.error('[Security] Unauthorized page access attempt', {
        path: location.pathname,
        label,
        userRoles: effectiveRoles,
        requiredRoles: allowedRoles,
        severity: critical ? 'CRITICAL' : 'WARNING',
      });
    }

    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center bg-background">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-2">
              You don't have permission to access {label}.
            </p>
            {critical && (
              <p className="text-sm text-destructive font-medium mb-4">
                This is a security-critical page.
              </p>
            )}
            <p className="text-xs text-muted-foreground mb-6">
              Your role{effectiveRoles.length !== 1 ? 's' : ''}: {effectiveRoles.join(', ')}
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return <>{children}</>;
}

/**
 * Provider component that wraps multiple protected pages with common settings
 */
export const AdminProtectedPage: React.FC<Omit<ProtectedPageProps, 'allowedRoles'>> = (props) => (
  <ProtectedPage {...props} allowedRoles={['admin']} critical={true} />
);

export const SettingsProtectedPage: React.FC<Omit<ProtectedPageProps, 'allowedRoles'>> = (props) => (
  <ProtectedPage {...props} allowedRoles={['admin']} critical={true} />
);
