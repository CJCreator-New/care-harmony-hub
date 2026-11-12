import { useMemo } from 'react';
import { CURRENCY_SYMBOL, formatCurrency } from '@/lib/currency';
import { useAdminStats, useStaffOverview, useDepartmentPerformance, useWeeklyAppointmentTrend } from '@/hooks/useAdminStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton, useRecharts } from '@/components/ui/lazy-chart';
import { DataError, DATA_UNAVAILABLE } from '@/components/common/DataStatus';
import {
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Activity,
  Clock,
  UserCheck,
  FileText,
  Bed,
  AlertTriangle,
  Building2,
  Stethoscope,
  Pill,
  FlaskConical,
  UserCog,
  ShieldCheck,
} from 'lucide-react';

const ROLE_ICONS: Record<string, React.ElementType> = {
  doctor: Stethoscope,
  nurse: UserCheck,
  pharmacist: Pill,
  lab_technician: FlaskConical,
  receptionist: UserCog,
  admin: ShieldCheck,
};

const ROLE_COLORS: Record<string, string> = {
  doctor: 'bg-primary/10 text-primary',
  nurse: 'bg-success/10 text-success',
  pharmacist: 'bg-pharmacy/10 text-pharmacy',
  lab_technician: 'bg-laboratory/10 text-laboratory',
  receptionist: 'bg-info/10 text-info',
  admin: 'bg-warning/10 text-warning',
};

export function AdminAnalytics() {
  const { data: stats, isLoading, isError: statsError, refetch: refetchStats } = useAdminStats();
  const { data: staffOverview } = useStaffOverview();
  const {
    data: deptPerformance,
    isError: deptError,
    refetch: refetchDept,
  } = useDepartmentPerformance();
  const {
    data: weeklyTrend,
    isError: trendError,
    refetch: refetchTrend,
  } = useWeeklyAppointmentTrend();
  const { components: Recharts, loading: rechartsLoading } = useRecharts();

  const compactCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `${CURRENCY_SYMBOL}${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  // When the stats query fails, every stat shows DATA_UNAVAILABLE rather than 0.
  const mainStats = useMemo(() => ([
    {
      title: 'Total Patients',
      value: statsError ? DATA_UNAVAILABLE : (stats?.totalPatients || 0),
      icon: Users,
      color: 'bg-primary/10 text-primary',
      subtitle: statsError
        ? 'Data unavailable'
        : stats?.patientGrowthLabel || `+${stats?.newPatientsThisMonth || 0} this month`,
    },
    {
      title: stats?.appointmentMetricLabel || "Today's Appointments",
      value: statsError ? DATA_UNAVAILABLE : (stats?.todayAppointments || 0),
      icon: Calendar,
      color: 'bg-info/10 text-info',
      subtitle: statsError
        ? 'Data unavailable'
        : stats?.appointmentMetricSubtitle || `${stats?.completedToday || 0} completed, ${stats?.cancelledToday || 0} cancelled`,
    },
    {
      title: 'Active Staff',
      value: statsError ? DATA_UNAVAILABLE : (stats?.activeStaff || 0),
      icon: UserCheck,
      color: 'bg-success/10 text-success',
      breakdown: statsError ? undefined : stats?.staffByRole,
    },
    {
      title: 'Monthly Revenue',
      value: statsError ? DATA_UNAVAILABLE : compactCurrency(stats?.monthlyRevenue || 0),
      icon: DollarSign,
      color: 'bg-warning/10 text-warning',
      subtitle: statsError
        ? 'Data unavailable'
        : `${compactCurrency(stats?.pendingAmount || 0)} pending`,
    },
  ]), [stats, statsError]);

  const operationalStats = useMemo(() => ([
    {
      title: 'Queue Waiting',
      value: statsError ? DATA_UNAVAILABLE : (stats?.queueWaiting || 0),
      icon: Clock,
      color: 'bg-muted',
    },
    {
      title: 'In Service',
      value: statsError ? DATA_UNAVAILABLE : (stats?.queueInService || 0),
      icon: Activity,
      color: 'bg-success/10',
    },
    {
      title: 'Pending Rx',
      value: statsError ? DATA_UNAVAILABLE : (stats?.pendingPrescriptions || 0),
      icon: Pill,
      color: 'bg-pharmacy/10',
    },
    {
      title: 'Pending Labs',
      value: statsError ? DATA_UNAVAILABLE : (stats?.pendingLabOrders || 0),
      icon: FlaskConical,
      color: 'bg-laboratory/10',
      alert: !statsError && (stats?.criticalLabOrders || 0) > 0,
      alertText: `${stats?.criticalLabOrders} critical`,
    },
    {
      title: 'Bed Occupancy',
      value: statsError ? DATA_UNAVAILABLE : `${stats?.bedOccupancy || 0}%`,
      icon: Bed,
      color: 'bg-info/10',
    },
  ]), [stats, statsError]);

  const weeklyTrendData = useMemo(() => weeklyTrend || [], [weeklyTrend]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={`stats-skeleton-${i}`}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {statsError && (
        <DataError
          resource="admin statistics"
          onRetry={() => void refetchStats()}
        />
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainStats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  )}
                  {stat.breakdown && Object.keys(stat.breakdown).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(stat.breakdown).slice(0, 3).map(([role, count]) => (
                        <Badge key={role} variant="outline" className="text-xs capitalize">
                          {role.replace('_', ' ')}: {count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operational Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {operationalStats.map((stat) => (
          <Card key={stat.title} className={stat.color}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.alert ? 'bg-destructive/10' : 'bg-background/50'}`}>
                <stat.icon className={`h-5 w-5 ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                {stat.alert && stat.alertText && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-3 w-3" />
                    {stat.alertText}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Details Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              This Week's Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendError ? (
              <DataError resource="this week's appointments" onRetry={() => void refetchTrend()} />
            ) : weeklyTrendData.length > 0 ? (
              <WeeklyTrendChart data={weeklyTrendData} isLoading={rechartsLoading} Recharts={Recharts} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No appointment data this week
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff by Role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              Staff by Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsError ? (
              <DataError resource="staff by role" onRetry={() => void refetchStats()} />
            ) : stats?.staffByRole && Object.keys(stats.staffByRole).length > 0 ? (
              Object.entries(stats.staffByRole).map(([role, count]) => {
                const RoleIcon = ROLE_ICONS[role] || UserCheck;
                const colorClass = ROLE_COLORS[role] || 'bg-muted text-muted-foreground';
                const percentage = stats.activeStaff > 0 ? (count / stats.activeStaff) * 100 : 0;

                return (
                  <div key={role} className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <RoleIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium capitalize">{role.replace('_', ' ')}</span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-sm">No staff data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Performance */}
      {deptError && (
        <DataError resource="department performance" onRetry={() => void refetchDept()} />
      )}

      {!deptError && deptPerformance && deptPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Department Performance (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {deptPerformance.map((dept) => (
                <div key={dept.department} className="p-4 rounded-lg border bg-card">
                  <h4 className="font-medium mb-3">{dept.department}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Patients</span>
                      <span className="font-medium">{dept.patientsToday}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Wait</span>
                      <span className="font-medium">{dept.avgWaitTime} min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Completion</span>
                      <Badge variant={dept.completionRate >= 80 ? 'success' : dept.completionRate >= 50 ? 'warning' : 'destructive'}>
                        {dept.completionRate}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WeeklyTrendChart({
  data,
  isLoading,
  Recharts,
}: {
  data: Array<Record<string, any>>;
  isLoading: boolean;
  Recharts: typeof import('recharts') | null;
}) {
  if (isLoading || !Recharts) {
    return <ChartSkeleton />;
  }

  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } = Recharts;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="day" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        <Bar dataKey="scheduled" name="Scheduled" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" name="Completed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
