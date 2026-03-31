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
import { Users, BedDouble, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

// ── Data hook ─────────────────────────────────────────────────────────────────

function useWardCensus(view: 'daily' | 'weekly' | 'monthly') {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['ward-census', hospital?.id, view],
    queryFn: async () => {
      if (!hospital?.id) {
        console.warn('[WardCensusDashboard] Hospital context not loaded');
        return {} as CensusReport;
      }

      const { data, error } = await supabase.functions.invoke('census-reports', {
        body: { hospital_id: hospital.id, view },
      });
      if (error) throw error;
      return data as CensusReport;
    },
    enabled: !!hospital?.id,
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

interface CensusReport {
  report_date: string;
  view: string;
  census: {
    current_inpatient_count: number;
    admissions_today: number;
    discharges_today: number;
    occupancy_by_department: Record<string, number>;
  };
  queue: Record<string, number>;
  alerts: { pending_critical_lab_acks: number };
  inpatients: Array<{
    consultation_id: string;
    status: string;
    chief_complaint: string;
    department: string;
    admitted_at: string;
    patient: { first_name: string; last_name: string; mrn: string } | null;
    attending_physician: { first_name: string; last_name: string } | null;
  }>;
  trend: Array<{ date: string; admissions: number; discharges: number }>;
}

// ── Animated KPI ──────────────────────────────────────────────────────────────

function KPIStat({
  label, value, icon: Icon, variant = 'default',
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'critical';
}) {
  const animated = useCountUp(value, 800);

  const variantClass = {
    default:  'cs-stat-card',
    success:  'cs-stat-card border-success-200',
    warning:  'cs-stat-card border-warning-200',
    critical: 'cs-stat-card cs-critical',
  }[variant];

  return (
    <div className={`${variantClass} p-4 rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="text-3xl font-display font-bold animate-stat-pop">
        {animated}
      </div>
    </div>
  );
}

// ── Department badge ──────────────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
  ICU:       'bg-destructive/10 text-destructive-700',
  Emergency: 'bg-warning/10  text-warning-700',
  Surgery:   'bg-info/10     text-info-700',
  General:   'bg-secondary/10 text-secondary-700',
};

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function WardCensusDashboard() {
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const { data: report, isLoading, refetch, isRefetching } = useWardCensus(view);

  const deptEntries = Object.entries(report?.census.occupancy_by_department ?? {}).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <div className="cs-gradient-mesh min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-foreground">Ward Census</h1>
          {report && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(new Date(report.report_date), 'MMMM d, yyyy')} ·{' '}
              <span className="capitalize">{view} view</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Select value={view} onValueChange={(v) => setView(v as typeof view)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline" size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
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
          <KPIStat
            label="Current Inpatients"
            value={report?.census.current_inpatient_count ?? 0}
            icon={BedDouble}
          />
          <KPIStat
            label="Admissions Today"
            value={report?.census.admissions_today ?? 0}
            icon={TrendingUp}
            variant="success"
          />
          <KPIStat
            label="Discharges Today"
            value={report?.census.discharges_today ?? 0}
            icon={Users}
          />
          <KPIStat
            label="Critical Lab Acks Pending"
            value={report?.alerts.pending_critical_lab_acks ?? 0}
            icon={AlertTriangle}
            variant={report?.alerts.pending_critical_lab_acks ? 'critical' : 'default'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department occupancy */}
        <Card className="cs-card-1 cs-card-hover lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Occupancy by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 rounded bg-muted animate-shimmer" />
                ))}
              </div>
            ) : deptEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active inpatients.</p>
            ) : (
              <ul className="space-y-3 cs-stagger-children">
                {deptEntries.map(([dept, count]) => (
                  <li key={dept} className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        DEPT_COLORS[dept] ?? 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {dept}
                    </span>
                    <span className="text-sm font-mono font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Active inpatients table */}
        <Card className="cs-card-1 cs-card-hover lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Active Inpatients
              {report && (
                <Badge variant="secondary" className="ml-2 font-mono text-xs">
                  {report.census.current_inpatient_count}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 rounded bg-muted animate-shimmer" />
                ))}
              </div>
            ) : !report?.inpatients.length ? (
              <p className="p-4 text-sm text-muted-foreground">No active inpatients at this time.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Patient</th>
                      <th className="text-left p-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Dept</th>
                      <th className="text-left p-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Chief Complaint</th>
                      <th className="text-left p-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Attending</th>
                      <th className="text-left p-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Admitted</th>
                    </tr>
                  </thead>
                  <tbody className="cs-stagger-children">
                    {report.inpatients.slice(0, 15).map((pt) => (
                      <tr
                        key={pt.consultation_id}
                        className="border-b border-border/30 hover:bg-muted/40 transition-colors"
                      >
                        <td className="p-3">
                          <div className="font-medium">
                            {pt.patient ? `${pt.patient.first_name} ${pt.patient.last_name}` : '—'}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {pt.patient?.mrn}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${DEPT_COLORS[pt.department] ?? 'bg-muted text-muted-foreground'}`}>
                            {pt.department}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-[180px] truncate">
                          {pt.chief_complaint}
                        </td>
                        <td className="p-3">
                          {pt.attending_physician
                            ? `Dr. ${pt.attending_physician.last_name}`
                            : '—'}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {format(new Date(pt.admitted_at), 'MMM d, HH:mm')}
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
