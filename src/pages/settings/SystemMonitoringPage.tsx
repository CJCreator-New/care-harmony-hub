import MonitoringDashboard from '@/components/monitoring/MonitoringDashboard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function SystemMonitoringPage() {
  return (
    <DashboardLayout>
      {/* ErrorBoundary guards against any unexpected runtime errors in the monitoring dashboard (Admin #3) */}
      <ErrorBoundary>
        <MonitoringDashboard />
      </ErrorBoundary>
    </DashboardLayout>
  );
}