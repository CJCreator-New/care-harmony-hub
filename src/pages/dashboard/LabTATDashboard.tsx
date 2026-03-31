import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCountUp } from '@/hooks/useCountUp';
import { FlaskConical, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LabOrderSummary {
  id: string;
  test_name: string;
  status: string;
  priority: string | null;
  is_critical: boolean;
  ordered_at: string;
  completed_at: string | null;
  hospital_id: string;
  patient: { first_name: string; last_name: string; mrn: string } | null;
  ordered_by_profile: { first_name: string; last_name: string } | null;
}

// ── Data hook ─────────────────────────────────────────────────────────────────

function useLabTATData(filter: 'today' | 'week' | 'month') {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['lab-tat-dashboard', hospital?.id, filter],
    queryFn: async () => {
      if (!hospital?.id) {
        console.warn('[LabTATDashboard] Hospital context not loaded');
        return [];
      }

      const now = new Date();
      let start: Date;
      if (filter === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filter === 'week') {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from('lab_orders')
        .select(`
          id, test_name, status, priority, is_critical, ordered_at, completed_at, hospital_id,
          patients ( first_name, last_name, mrn ),
          ordering_physician:profiles!lab_orders_ordered_by_fkey ( first_name, last_name )
        `)
        .eq('hospital_id', hospital.id)
        .gte('ordered_at', start.toISOString())
        .order('ordered_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      return (data ?? []).map(o => {
        const orderingPhysician = (o as any).ordering_physician;
        return ({
        // Supabase nested selects can return arrays for joined relations.
        id: o.id,
        test_name: o.test_name,
        status: o.status,
        priority: (o as { priority?: string }).priority ?? null,
        is_critical: (o as { is_critical?: boolean }).is_critical ?? false,
        ordered_at: o.ordered_at,
        completed_at: (o as { completed_at?: string }).completed_at ?? null,
        hospital_id: o.hospital_id,
        patient: Array.isArray(o.patients)
          ? ((o.patients[0] as LabOrderSummary['patient']) ?? null)
          : ((o.patients as LabOrderSummary['patient']) ?? null),
        ordered_by_profile: Array.isArray(orderingPhysician)
          ? ((orderingPhysician[0] as LabOrderSummary['ordered_by_profile']) ?? null)
          : ((orderingPhysician as LabOrderSummary['ordered_by_profile']) ?? null),
      });
      }) as LabOrderSummary[];
    },
    enabled: !!hospital?.id,
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

// ── TAT calculation ───────────────────────────────────────────────────────────

function calcTAT(order: LabOrderSummary): number | null {
  if (!order.completed_at) return null;
  return differenceInMinutes(new Date(order.completed_at), new Date(order.ordered_at));
}

function TATBadge({ minutes }: { minutes: number | null }) {
  if (minutes === null) return <span className="text-muted-foreground text-xs">—</span>;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const color = minutes <= 60 ? 'bg-success/10 text-success-700' :
                minutes <= 120 ? 'bg-warning/10 text-warning-700' :
                'bg-destructive/10 text-destructive';
  return (
    <span className={`text-xs font-medium font-mono px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  );
}

function KPIStat({ label, value, unit, icon: Icon, sub, variant = 'default' }: {
  label: string; value: number; unit?: string; icon: React.ElementType;
  sub?: string; variant?: 'default' | 'warning' | 'critical';
}) {
  const animated = useCountUp(value, 700);
  const base = variant === 'critical' ? 'cs-stat-card cs-critical' :
               variant === 'warning'  ? 'cs-stat-card border-warning-200' : 'cs-stat-card';
  return (
    <div className={`${base} p-4 rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="text-3xl font-display font-bold animate-stat-pop">
        {animated}{unit && <span className="text-base font-medium ml-1 text-muted-foreground">{unit}</span>}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
};

export default function LabTATDashboard() {
  const [filter, setFilter] = useState<'today' | 'week' | 'month'>('today');
  const { data: orders = [], isLoading, refetch, isRefetching } = useLabTATData(filter);

  const completed     = orders.filter(o => o.status === 'completed');
  const pending       = orders.filter(o => o.status === 'pending' || o.status === 'in_progress');
  const criticalUnack = orders.filter(o => o.is_critical && o.status === 'completed');
  const tatMinutes    = completed.map(calcTAT).filter((t): t is number => t !== null);
  const avgTAT        = tatMinutes.length
    ? Math.round(tatMinutes.reduce((a, b) => a + b, 0) / tatMinutes.length)
    : 0;
  const medianTAT = tatMinutes.length
    ? (tatMinutes.sort((a, b) => a - b)[Math.floor(tatMinutes.length / 2)])
    : 0;

  const slowOrders = completed
    .map(o => ({ order: o, tat: calcTAT(o)! }))
    .filter(x => x.tat > 120)
    .sort((a, b) => b.tat - a.tat)
    .slice(0, 10);

  return (
    <div className="cs-gradient-mesh min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-foreground">Lab TAT Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Turnaround time analysis · <span className="capitalize">{filter}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">7 Days</SelectItem>
              <SelectItem value="month">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 cs-stagger-children">
          <KPIStat label="Total Orders"     value={orders.length}    icon={FlaskConical} />
          <KPIStat label="Avg TAT"          value={avgTAT}           unit="min" icon={Clock}
            sub={`Median: ${medianTAT} min`}
            variant={avgTAT > 120 ? 'warning' : 'default'}
          />
          <KPIStat label="Pending"          value={pending.length}   icon={Clock}
            variant={pending.length > 10 ? 'warning' : 'default'}
          />
          <KPIStat label="Critical Results" value={criticalUnack.length} icon={AlertTriangle}
            variant={criticalUnack.length ? 'critical' : 'default'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status breakdown */}
        <Card className="cs-card-1 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded animate-shimmer" />
              ))}</div>
            ) : (
              <ul className="space-y-3 cs-stagger-children">
                {Object.entries(
                  orders.reduce((acc: Record<string, number>, o) => {
                    acc[o.status] = (acc[o.status] ?? 0) + 1;
                    return acc;
                  }, {})
                ).map(([status, count]) => (
                  <li key={status} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {STATUS_LABEL[status] ?? status}
                    </span>
                    <Badge variant="secondary" className="font-mono">{count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Slowest orders table */}
        <Card className="cs-card-1 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Slowest Orders (TAT {'>'}2h)
              {slowOrders.length > 0 && (
                <Badge variant="destructive" className="ml-2 font-mono text-xs">
                  {slowOrders.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted rounded animate-shimmer" />
                ))}
              </div>
            ) : slowOrders.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Excellent! All completed orders are within 2-hour TAT target.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">Patient</th>
                      <th className="text-left p-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">Test</th>
                      <th className="text-left p-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">Ordered</th>
                      <th className="text-center p-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">TAT</th>
                    </tr>
                  </thead>
                  <tbody className="cs-stagger-children">
                    {slowOrders.map(({ order, tat }) => (
                      <tr key={order.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="font-medium">
                            {order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : '—'}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {order.patient?.mrn}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-[160px] truncate">
                          {order.test_name}
                          {order.is_critical && (
                            <span className="ml-1 text-xs text-destructive font-medium">⚠</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {format(new Date(order.ordered_at), 'MMM d, HH:mm')}
                        </td>
                        <td className="p-3 text-center">
                          <TATBadge minutes={tat} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
