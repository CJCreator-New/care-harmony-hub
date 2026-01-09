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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  BarChart3,
  Settings,
  Building2,
  Bed,
  Database,
} from 'lucide-react';

export function AdminDashboard() {
  const { profile, hospital, roles } = useAuth();
  const needsRepair = !hospital || !roles.includes('admin');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}, {profile?.first_name || 'Admin'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Hospital overview and management dashboard.
            </p>
          </div>
          <Badge variant="admin" className="w-fit text-sm py-1.5 px-4">
            Administrator
          </Badge>
        </div>
      </div>

      {/* Account Repair Tool (shown if setup incomplete) */}
      {needsRepair && (
        <div className="mb-8">
          <AdminRepairTool />
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
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

      {/* Analytics */}
      <div className="mb-8">
        <AdminAnalytics />
      </div>

      {/* Tabbed Management Section */}
      <Tabs defaultValue="overview" className="mb-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
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
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <PatientQueue />
              <UpcomingAppointments />
            </div>
            <div>
              <RecentActivity />
            </div>
          </div>
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
      </Tabs>
    </>
  );
}
