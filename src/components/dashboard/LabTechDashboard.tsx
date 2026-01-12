import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { useLabTechStats, usePendingLabOrders } from '@/hooks/usePharmacyLabStats';
import { formatDistanceToNow, differenceInYears } from 'date-fns';

export function LabTechDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useLabTechStats();
  const { data: pendingOrders, isLoading: ordersLoading } = usePendingLabOrders();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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
        <Button variant="outline" asChild>
          <Link to="/laboratory?tab=collected">
            <Syringe className="h-4 w-4 mr-2" />
            Sample Collection
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/laboratory?tab=results">
            <Upload className="h-4 w-4 mr-2" />
            Enter Results
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Pending Orders"
          value={statsLoading ? '--' : String(stats?.pending || 0)}
          subtitle="Awaiting collection"
          icon={FileText}
          variant="warning"
        />
        <StatsCard
          title="In Progress"
          value={statsLoading ? '--' : String((stats?.collected || 0) + (stats?.inProgress || 0))}
          subtitle="Being processed"
          icon={TestTube2}
          variant="primary"
        />
        <StatsCard
          title="Completed Today"
          value={statsLoading ? '--' : String(stats?.completedToday || 0)}
          subtitle="Results uploaded"
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="Critical Values"
          value={statsLoading ? '--' : String(stats?.critical || 0)}
          subtitle="Need notification"
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5 text-primary" />
                Lab Order Queue
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/laboratory">View All</Link>
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
                        <Button size="sm">
                          {order.status === 'pending' ? 'Collect' : 'Process'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">All caught up!</p>
                  <p className="text-sm">No pending lab orders</p>
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
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No urgent orders</p>
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
                <span className="text-sm text-muted-foreground">Imaging</span>
                <span className="font-medium">{statsLoading ? '--' : stats?.imaging || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Other</span>
                <span className="font-medium">{statsLoading ? '--' : stats?.other || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
