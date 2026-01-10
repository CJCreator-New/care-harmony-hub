import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';
import { DataExportTool } from '@/components/audit/DataExportTool';

export default function ActivityLogsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground">
            Comprehensive audit trail for compliance and security monitoring.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AuditLogViewer />
          </div>
          <div>
            <DataExportTool />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}