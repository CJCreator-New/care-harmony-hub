import { usePermissions } from '@/hooks/usePermissions';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import MonitoringDashboard from '@/components/monitoring/MonitoringDashboard';

export default function SystemMonitoringPage() {
  const { hasPermission } = usePermissions();

  return (
    <RoleProtectedRoute
      requiredPermission="canViewSystemMonitoring"
      fallbackMessage="You don't have permission to access system monitoring."
    >
      <div className="container mx-auto p-6">
        <MonitoringDashboard />
      </div>
    </RoleProtectedRoute>
  );
}