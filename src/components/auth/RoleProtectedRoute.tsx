import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { hasAnyAllowedRole, hasPermissionForAnyRole, Permission } from '@/lib/permissions';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

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
  const { isAuthenticated, isLoading, roles } = useAuth();
  const location = useLocation();

  if (isLoading || (isAuthenticated && roles.length === 0)) {
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

  const hasRoleAccess = hasAnyAllowedRole(roles, allowedRoles);
  const hasRequiredPermission = requiredPermission
    ? hasPermissionForAnyRole(roles, requiredPermission)
    : true;

  if (!hasRoleAccess || !hasRequiredPermission) {
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
