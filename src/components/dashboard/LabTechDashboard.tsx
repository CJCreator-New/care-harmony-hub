import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TestTube2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Microscope,
  Droplets,
  Syringe,
  User,
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import { useLabTechStats, usePendingLabOrders } from '@/hooks/usePharmacyLabStats';
import { useUpdateLabOrder } from '@/hooks/useLabOrders';
import { CriticalValueAlert } from '@/components/lab/CriticalValueAlert';
import { LabAutomationPanel } from '@/components/laboratory/LabAutomationPanel';
import { toast } from 'sonner';
import { formatDistanceToNow, differenceInYears } from 'date-fns';
import { DashboardPageTransition, DashboardSection } from './DashboardPageTransition';
import { EmptyState } from '@/components/ui/empty-state';

export function LabTechDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: stats, isLoading: statsLoading } = useLabTechStats();
  const { data: pendingOrders, isLoading: ordersLoading } = usePendingLabOrders();
  const updateLabOrder = useUpdateLabOrder();

  const handleCollect = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    try {
      await updateLabOrder.mutateAsync({ id: orderId, updates: { status: 'sample_collected' } });
      toast.success('Sample collected');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleStart = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    try {
      await updateLabOrder.mutateAsync({ id: orderId, status: 'in_progress' });
      toast.success('Processing started');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getDisplayName = () => {
    const name = profile?.first_name?.trim() || '';
    if (!name) return 'Lab Technician';
    // Use the first word as the first name (BUG-008)
    return name.split(' ')[0].replace(/'s$/i, '');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'collected':
        return <Badge className="bg-blue-500 text-white">Collected</Badge>;
      case 'in_progress':
        return <Badge className="bg-orange-500 text-white">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">High</Badge>;
      default:
        return null;
    }
  };

  const getAge = (dob: string | undefined) => {
    if (!dob) return 'N/A';
    const date = new Date(dob);
    if (isNaN(date.getTime())) return 'N/A';
    return differenceInYears(new Date(), date);
  };

  return (
    <DashboardPageTransition className="space-y-8">
      {/* Critical Value Alert Background Component */}
      <CriticalValueAlert />

      <DashboardSection>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}, {getDisplayName()}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Lab orders and test results management.
            </p>
          </div>
          <Badge variant="info" className="w-fit text-sm py-1.5 px-4 self-start md:self-auto">
            Lab Technician
          </Badge>
        </div>
      </div>
      </DashboardSection>

      <DashboardSection>
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button 
          variant={location.search.includes('tab=pending') || location.pathname === '/laboratory' && !location.search ? "default" : "outline"}
          asChild
        >
          <Link to="/laboratory">
            <TestTube2 className="h-4 w-4 mr-2" />
            Pending Orders
          </Link>
        </Button>
        <Button 
          variant={location.search.includes('tab=collected') ? "default" : "outline"}
          asChild
        >
          <Link to="/laboratory?tab=collected">
            <Syringe className="h-4 w-4 mr-2" />
            Sample Collection
          </Link>
        </Button>
        <Button 
          variant={location.search.includes('tab=results') ? "default" : "outline"}
          asChild
        >
          <Link to="/laboratory?tab=results">
            <Upload className="h-4 w-4 mr-2" />
            Enter Results
          </Link>
        </Button>
      </div>
      </DashboardSection>

      <DashboardSection>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Pending Orders"
          value={statsLoading ? '...' : (stats?.pending || 0)}
          subtitle="Awaiting collection"
          icon={FileText}
          variant="warning"
          className="border-warning/20 shadow-sm"
        />
        <StatsCard
          title="In Progress"
          value={statsLoading ? '...' : ((stats?.collected || 0) + (stats?.inProgress || 0))}
          subtitle="Being processed"
          icon={TestTube2}
          variant="primary"
          className="border-primary/20 shadow-sm"
        />
        <StatsCard
          title="Completed Today"
          value={statsLoading ? '...' : (stats?.completedToday || 0)}
          subtitle="Results uploaded"
          icon={CheckCircle2}
          variant="success"
          className="border-success/20 shadow-sm"
        />
        <StatsCard
          title="Critical Values"
          value={statsLoading ? '...' : (stats?.critical || 0)}
          subtitle="Need notification"
          icon={AlertTriangle}
          variant="danger"
          className="border-destructive/20 shadow-sm"
        />
      </div>
      </DashboardSection>

      <DashboardSection>
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[450px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Order Queue
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Lab Automation
            {(stats?.critical ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] animate-pulse">
                !
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube2 className="h-5 w-5 text-primary" />
                      Active Lab Orders
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Pending &amp; in-progress for today</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/laboratory">View All Orders</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : pendingOrders && pendingOrders.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3 pr-4">
                        {pendingOrders.slice(0, 10).map((order: any) => (
                          <div
                            key={order.id}
                            className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => navigate('/laboratory')}
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{order.test_name}</span>
                                {getPriorityBadge(order.priority)}
                                {getStatusBadge(order.status)}
                                {order.is_critical && (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Critical
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>
                                  {order.patient?.first_name} {order.patient?.last_name}
                                </span>
                                <span>•</span>
                                <span>MRN: {order.patient?.mrn}</span>
                                <span>•</span>
                                <span>{getAge(order.patient?.date_of_birth)} yrs</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Microscope className="h-3 w-3" />
                                  {order.test_category || 'General'}
                                </span>
                                {order.specimen_type && (
                                  <span className="flex items-center gap-1">
                                    <Droplets className="h-3 w-3" />
                                    {order.specimen_type}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={(e) =>
                                order.status === 'pending'
                                  ? handleCollect(e, order.id)
                                  : handleStart(e, order.id)
                              }
                              disabled={updateLabOrder.isPending}
                            >
                              {order.status === 'pending' ? 'Collect' : 'Process'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <EmptyState
                      icon={CheckCircle2}
                      title="All caught up!"
                      description="No pending lab orders"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              {/* Urgent Orders */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Urgent Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : (stats?.urgent || 0) === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-70" />
                      <p className="text-sm font-medium">No urgent orders</p>
                      <p className="text-xs mt-0.5">All orders are normal priority</p>
                      <Button variant="outline" size="sm" className="mt-3" asChild>
                        <Link to="/laboratory">View All Orders</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingOrders
                        ?.filter((o: any) => o.priority === 'urgent')
                        .slice(0, 3)
                        .map((order: any) => (
                          <div key={order.id} className="p-3 rounded bg-destructive/10">
                            <p className="font-medium text-sm">{order.test_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.patient?.first_name} {order.patient?.last_name}
                            </p>
                          </div>
                        ))}
                      {(stats?.urgent || 0) > 3 && (
                        <Button variant="ghost" size="sm" className="w-full" asChild>
                          <Link to="/laboratory?priority=urgent">
                            View all {stats?.urgent} urgent orders
                          </Link>
                        </Button>
                      )}
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
                    <span className="font-medium">{statsLoading ? '--' : stats?.bloodTests || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Urine Analysis</span>
                    <span className="font-medium">{statsLoading ? '--' : stats?.urineAnalysis || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Other</span>
                    <span className="font-medium">{statsLoading ? '--' : stats?.other || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="automation">
          <LabAutomationPanel />
        </TabsContent>
      </Tabs>
      </DashboardSection>
    </DashboardPageTransition>
  );
}
