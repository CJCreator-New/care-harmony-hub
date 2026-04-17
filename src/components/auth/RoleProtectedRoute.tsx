// @ts-nocheck
import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { hasAnyAllowedRole, hasPermissionForAnyRole, Permission } from '@/lib/permissions';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getDevTestRole } from '@/utils/devRoleSwitch';
import { usePermissionAudit } from '@/lib/hooks';
import { checkRouteAccess } from '@/middleware/routeGuard';

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  requiredPermission?: Permission;
  redirectTo?: string;
  showUnauthorized?: boolean;
}

export function RoleProtectedRoute({
  children,
  allowedRoles,
  requiredPermission,
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

  const effectiveRoles = persistedTestRole ? [persistedTestRole] : (primaryRole ? [primaryRole] : roles);

  // NEW: Middleware-level route guard check (BEFORE component render)
  const middlewareCheck = checkRouteAccess(location.pathname, effectiveRoles);
  if (!middlewareCheck.allowed) {
    logPermissionDenial({
      path: location.pathname,
      attemptedBy: user?.email || user?.id || null,
      userRole: primaryRole,
      allowedRoles,
      severity: 'critical',
      detail: middlewareCheck.denyReason,
    }).catch(() => {});

    if (showUnauthorized) {
      return (
        <DashboardLayout>
          <div className="min-h-[70vh] flex items-center justify-center bg-background">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
              <p className="text-muted-foreground mb-6">{middlewareCheck.denyReason}</p>
              <Button onClick={() => window.history.back()}>Go Back</Button>
            </div>
          </div>
        </DashboardLayout>
      );
    }
    return <Navigate to={redirectTo} replace />;
  }

  const hasRoleAccess = hasAnyAllowedRole(effectiveRoles, allowedRoles);
  const hasRequiredPermission = requiredPermission
    ? hasPermissionForAnyRole(effectiveRoles, requiredPermission)
    : true;

  // Debug logging for RBAC enforcement
  if (import.meta.env.DEV) {
    const accessLogData = {
      path: location.pathname,
      effectiveRoles,
      allowedRoles,
      hasRoleAccess,
      requiredPermission,
      hasRequiredPermission,
      granted: hasRoleAccess && hasRequiredPermission,
    };
    if (!hasRoleAccess || !hasRequiredPermission) {
      console.warn('[RBAC] Access Denied:', accessLogData);
    }
  }

  if (!hasRoleAccess || !hasRequiredPermission) {
    // Audit log the unauthorized access attempt
    logPermissionDenial({
      path: location.pathname,
      attemptedBy: user?.email || user?.id || null,
      userRole: primaryRole,
      allowedRoles,
      severity: requiredPermission ? 'critical' : 'warning',
    }).catch(() => {
      // Silently fail if audit logging fails - don't block the access denial UI
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
              <Button onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </div>
        </DashboardLayout>
      );
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

