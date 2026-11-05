import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getDevTestRole } from '@/utils/devRoleSwitch';
import { usePermissionAudit } from '@/lib/hooks';
import { checkRouteAccess } from '@/middleware/routeGuard';
import { resolveActingRole, findRoutePolicy } from '@/modules/rbac';

interface RoleProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  showUnauthorized?: boolean;
}

/**
 * Guards a route with the access policy in `@/modules/rbac`. The policy is
 * looked up by pathname, so the guard, the sidebar and the manifest read the
 * same entry. The acting role is the dev test role or the primary role.
 */
export function RoleProtectedRoute({
  children,
  redirectTo = '/dashboard',
  showUnauthorized = true,
}: RoleProtectedRouteProps) {
  const { isAuthenticated, isLoading, roles, primaryRole, user } = useAuth();
  const location = useLocation();
  const { logPermissionDenial } = usePermissionAudit();
  const persistedTestRole = getDevTestRole(roles);

  if (isLoading || (isAuthenticated && roles.length === 0 && !persistedTestRole)) {
    if (isAuthenticated) {
      return (
        <DashboardLayout>
          <div className="min-h-[70vh] flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </DashboardLayout>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/hospital/login" state={{ from: location }} replace />;
  }

  const actingRole = resolveActingRole({ primaryRole, testRole: persistedTestRole });
  const decision = checkRouteAccess(location.pathname, actingRole);

  if (import.meta.env.DEV && !decision.allowed) {
    console.warn('[RBAC] Access Denied:', {
      path: location.pathname,
      actingRole,
      reason: decision.denyReason,
    });
  }

  if (!decision.allowed) {
    logPermissionDenial({
      path: location.pathname,
      attemptedBy: user?.email || user?.id || null,
      userRole: primaryRole,
      allowedRoles: [...(findRoutePolicy(location.pathname)?.roles ?? [])],
      severity: 'critical',
      detail: decision.denyReason,
    }).catch(() => {
      // Audit logging must not block the denial UI.
    });

    if (showUnauthorized) {
      return (
        <DashboardLayout>
          <div className="min-h-[70vh] flex items-center justify-center bg-background">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
              <p className="text-muted-foreground mb-6">
                You don't have permission to access this page. Please contact your administrator if you believe this is an error.
              </p>
              <Button onClick={() => window.history.back()}>Go Back</Button>
            </div>
          </div>
        </DashboardLayout>
      );
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
