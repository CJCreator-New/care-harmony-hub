import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TestTube2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Microscope,
} from 'lucide-react';
import { useLabOrders, useLabOrderStats } from '@/hooks/useLabOrders';

export function LabTechDashboard() {
  const { profile } = useAuth();
  const { data: stats } = useLabOrderStats();
  const { data: pendingOrders = [] } = useLabOrders('pending');
  const { data: urgentOrders = [] } = useLabOrders();

  const urgentItems = urgentOrders.filter(o => o.priority === 'urgent' && o.status !== 'completed');

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
              {getGreeting()}, {profile?.first_name || 'Lab Technician'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Lab orders and test results management.
            </p>
          </div>
          <Badge variant="info" className="w-fit text-sm py-1.5 px-4">
            Lab Technician
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button asChild>
          <Link to="/laboratory">
            <TestTube2 className="h-4 w-4 mr-2" />
            Pending Orders
          </Link>
        </Button>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Upload Results
        </Button>
        <Button variant="outline">
          <Microscope className="h-4 w-4 mr-2" />
          Test Catalog
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Pending Orders"
          value={stats?.pending ?? 0}
          subtitle="To process"
          icon={FileText}
          variant="warning"
        />
        <StatsCard
          title="In Progress"
          value={stats?.inProgress ?? 0}
          subtitle="Currently testing"
          icon={TestTube2}
          variant="primary"
        />
        <StatsCard
          title="Completed Today"
          value={stats?.completedToday ?? 0}
          subtitle="Results uploaded"
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="Urgent Orders"
          value={urgentItems.length}
          subtitle="Need attention"
          icon={AlertCircle}
          variant="danger"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5 text-primary" />
                Lab Order Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TestTube2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">No pending lab orders</p>
                  <p className="text-sm">New orders will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{order.test_name}</p>
                        <p className="text-sm text-muted-foreground">{order.test_category || 'General'}</p>
                      </div>
                      <Badge variant={order.priority === 'urgent' ? 'destructive' : 'secondary'}>
                        {order.priority}
                      </Badge>
                    </div>
                  ))}
                  {pendingOrders.length > 5 && (
                    <Button asChild variant="ghost" className="w-full">
                      <Link to="/laboratory">View all {pendingOrders.length} orders</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {/* Urgent Orders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-critical" />
                Urgent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {urgentItems.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No urgent orders</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {urgentItems.slice(0, 3).map((order) => (
                    <div key={order.id} className="p-2 rounded bg-destructive/10 text-sm">
                      <p className="font-medium">{order.test_name}</p>
                      <p className="text-muted-foreground text-xs">{order.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Categories */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Microscope className="h-5 w-5 text-primary" />
                Today's Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Blood Tests</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Urine Analysis</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Imaging</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Other</span>
                <span className="font-medium">--</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
