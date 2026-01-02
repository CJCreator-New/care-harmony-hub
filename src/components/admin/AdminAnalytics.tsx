import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Activity,
  Clock,
  UserCheck,
  FileText,
} from 'lucide-react';

interface AnalyticsData {
  totalPatients: number;
  todayAppointments: number;
  activeStaff: number;
  monthlyRevenue: number;
  completedToday: number;
  avgWaitTime: number;
  pendingPrescriptions: number;
  pendingLabOrders: number;
}

export function AdminAnalytics() {
  const { hospital } = useAuth();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics', hospital?.id],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!hospital?.id) {
        return {
          totalPatients: 0,
          todayAppointments: 0,
          activeStaff: 0,
          monthlyRevenue: 0,
          completedToday: 0,
          avgWaitTime: 0,
          pendingPrescriptions: 0,
          pendingLabOrders: 0,
        };
      }

      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Fetch all data in parallel
      const [
        patientsResult,
        todayApptResult,
        staffResult,
        revenueResult,
        completedResult,
        prescriptionsResult,
        labOrdersResult,
      ] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('hospital_id', hospital.id).eq('is_active', true),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('hospital_id', hospital.id).eq('scheduled_date', today),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('hospital_id', hospital.id).eq('is_staff', true),
        supabase.from('invoices').select('total').eq('hospital_id', hospital.id).gte('created_at', monthStart),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('hospital_id', hospital.id).eq('scheduled_date', today).eq('status', 'completed'),
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('hospital_id', hospital.id).eq('status', 'pending'),
        supabase.from('lab_orders').select('id', { count: 'exact', head: true }).eq('hospital_id', hospital.id).eq('status', 'pending'),
      ]);

      const monthlyRevenue = revenueResult.data?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      return {
        totalPatients: patientsResult.count || 0,
        todayAppointments: todayApptResult.count || 0,
        activeStaff: staffResult.count || 0,
        monthlyRevenue,
        completedToday: completedResult.count || 0,
        avgWaitTime: 15, // Placeholder - would need queue data
        pendingPrescriptions: prescriptionsResult.count || 0,
        pendingLabOrders: labOrdersResult.count || 0,
      };
    },
    enabled: !!hospital?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const stats = [
    {
      title: 'Total Patients',
      value: analytics?.totalPatients || 0,
      icon: Users,
      color: 'bg-primary/10 text-primary',
      trend: '+12%',
    },
    {
      title: "Today's Appointments",
      value: analytics?.todayAppointments || 0,
      icon: Calendar,
      color: 'bg-info/10 text-info',
      subtitle: `${analytics?.completedToday || 0} completed`,
    },
    {
      title: 'Active Staff',
      value: analytics?.activeStaff || 0,
      icon: UserCheck,
      color: 'bg-success/10 text-success',
    },
    {
      title: 'Monthly Revenue',
      value: `$${((analytics?.monthlyRevenue || 0) / 1000).toFixed(1)}K`,
      icon: DollarSign,
      color: 'bg-warning/10 text-warning',
      trend: '+8%',
    },
  ];

  const quickStats = [
    {
      title: 'Avg Wait Time',
      value: `${analytics?.avgWaitTime || 0} min`,
      icon: Clock,
      color: 'bg-muted',
    },
    {
      title: 'Pending Rx',
      value: analytics?.pendingPrescriptions || 0,
      icon: FileText,
      color: 'bg-pharmacy/10',
    },
    {
      title: 'Pending Labs',
      value: analytics?.pendingLabOrders || 0,
      icon: Activity,
      color: 'bg-laboratory/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">
                    {isLoading ? '--' : stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  )}
                  {stat.trend && (
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-3 w-3 text-success" />
                      <span className="text-xs text-success">{stat.trend} from last month</span>
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

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {quickStats.map((stat) => (
          <Card key={stat.title} className={stat.color}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{isLoading ? '--' : stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}