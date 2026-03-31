import MonitoringDashboard from '@/components/monitoring/MonitoringDashboard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminProtectedPage } from '@/components/auth/ProtectedPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function SystemMonitoringPageContent() {
  return (
    <DashboardLayout>
      {/* ErrorBoundary guards against any unexpected runtime errors in the monitoring dashboard (Admin #3) */}
      <ErrorBoundary>
        <MonitoringDashboard />
      </ErrorBoundary>
    </DashboardLayout>
  );
}

// Export wrapped with protection layer to prevent unauthorized direct access
export default function SystemMonitoringPage() {
  return (
    <AdminProtectedPage label="System Monitoring">
      <SystemMonitoringPageContent />
    </AdminProtectedPage>
  );
}