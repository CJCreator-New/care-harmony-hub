import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PatientQueue } from './PatientQueue';
import { UpcomingAppointments } from './UpcomingAppointments';
import { RecentActivity } from './RecentActivity';
import { AdminRepairTool } from '@/components/admin/AdminRepairTool';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { ResourceManagement } from '@/components/admin/ResourceManagement';
import { DepartmentManagement } from '@/components/admin/DepartmentManagement';
import { StaffOnboardingWizard } from '@/components/admin/StaffOnboardingWizard';
import { TestDataSeederCard } from '@/components/admin/TestDataSeederCard';
import { RealTimeDashboard } from '@/components/admin/RealTimeDashboard';
import { WorkflowOrchestrationPanel } from '@/components/admin/WorkflowOrchestrationPanel';
import { WorkflowMetricsDashboard } from '@/components/workflow/WorkflowMetricsDashboard';
import { StaffPerformanceMetrics } from '@/components/analytics/StaffPerformanceMetrics';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  BarChart3,
  Settings,
  Building2,
  Bed,
  Database,
  Activity,
  Zap,
} from 'lucide-react';
import { memo, useMemo } from 'react';
import { DashboardPageTransition, DashboardSection } from './DashboardPageTransition';

export function AdminDashboardComponent() {
  const { profile, hospital, roles } = useAuth();
  const needsRepair = useMemo(() => !hospital || !roles.includes('admin'), [hospital, roles]);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <DashboardPageTransition className="space-y-8">
      {/* Header */}
      <DashboardSection className="mb-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting}, {profile?.first_name?.trim() || 'Admin'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Hospital overview and management dashboard.
            </p>
          </div>
        </div>
      </DashboardSection>

      {/* Account Repair Tool (shown if setup incomplete) */}
      {needsRepair && (
        <DashboardSection>
          <AdminRepairTool />
        </DashboardSection>
      )}

      {/* Quick Actions */}
      <DashboardSection>
        <div className="flex flex-wrap gap-3">
          <StaffOnboardingWizard />
          <Button variant="outline" asChild>
            <Link to="/reports">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </DashboardSection>

      {/* Analytics */}
      <DashboardSection>
        <AdminAnalytics />
      </DashboardSection>

      {/* Tabbed Management Section */}
      <DashboardSection>
        <Tabs defaultValue="overview">
        {/* BUG-30: flex-wrap + h-auto let tabs wrap to a second line on narrow viewports,
            ensuring every tab's clickable hit-target matches its visual area. */}
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-time Monitoring
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Bed className="h-4 w-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Test Data
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff Performance
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <div className="space-y-6">
            <WorkflowMetricsDashboard />
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <PatientQueue />
                <UpcomingAppointments />
              </div>
              <div>
                <RecentActivity />
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="monitoring" className="mt-6">
          <RealTimeDashboard />
        </TabsContent>
        <TabsContent value="workflows" className="mt-6">
          <WorkflowOrchestrationPanel />
        </TabsContent>
        <TabsContent value="resources" className="mt-6">
          <ResourceManagement />
        </TabsContent>
        <TabsContent value="departments" className="mt-6">
          <DepartmentManagement />
        </TabsContent>
        <TabsContent value="testing" className="mt-6">
          <div className="max-w-2xl">
            <TestDataSeederCard />
          </div>
        </TabsContent>
        <TabsContent value="performance" className="mt-6">
          <StaffPerformanceMetrics role="admin" />
        </TabsContent>
      </Tabs>
      </DashboardSection>
    </DashboardPageTransition>
  );
}

export const AdminDashboard = memo(AdminDashboardComponent);
