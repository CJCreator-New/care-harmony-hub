import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useAnalytics } from '@/hooks/useAnalytics';
import { 
  Users, Calendar, DollarSign, 
  TrendingUp, Bed 
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { ChartSkeleton, useRecharts } from '@/components/ui/lazy-chart';
import { DateRange } from 'react-day-picker';
import { format, parseISO, subDays } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function BusinessIntelligenceDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialEnd = searchParams.get('end') ? parseISO(searchParams.get('end')!) : new Date();
  const initialStart = searchParams.get('start') ? parseISO(searchParams.get('start')!) : subDays(initialEnd, 29);
  const [dateRange, setDateRange] = useState<DateRange>({ from: initialStart, to: initialEnd });
  const { kpis, financialMetrics, operationalMetrics, clinicalMetrics, isLoading } = useAnalytics({
    start: dateRange.from || initialStart,
    end: dateRange.to || initialEnd,
  });
  const { components: Recharts, loading: rechartsLoading } = useRecharts();

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      const next = new URLSearchParams(searchParams);
      next.set('start', format(dateRange.from, 'yyyy-MM-dd'));
      next.set('end', format(dateRange.to, 'yyyy-MM-dd'));
      setSearchParams(next, { replace: true });
    }
  }, [dateRange, searchParams, setSearchParams]);

  if (isLoading) {
    return <div className="p-4">Loading analytics...</div>;
  }

  const revenueData = useMemo(() => (
    financialMetrics?.revenue_by_service
      ? Object.entries(financialMetrics.revenue_by_service).map(([service, revenue]) => ({
          service,
          revenue: revenue as number,
        }))
      : []
  ), [financialMetrics?.revenue_by_service]);

  const diagnosisData = useMemo(() => (
    clinicalMetrics?.diagnosis_distribution
      ? Object.entries(clinicalMetrics.diagnosis_distribution).map(([diagnosis, count]) => ({
          diagnosis,
          count: count as number,
        }))
      : []
  ), [clinicalMetrics?.diagnosis_distribution]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Business Intelligence</h2>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.patient_metrics.total_patients || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{kpis?.patient_metrics.new_patients || 0} new this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(kpis?.financial_metrics.total_revenue || 0).toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              {kpis?.financial_metrics.collection_rate || 0}% collection rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.appointment_metrics.total_appointments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {kpis?.appointment_metrics.no_show_rate || 0}% no-show rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bed Occupancy</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operationalMetrics?.bed_occupancy_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Avg wait: {operationalMetrics?.avg_wait_time_minutes || 0} min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service</CardTitle>
          </CardHeader>
          <CardContent>
            {rechartsLoading || !Recharts ? (
              <ChartSkeleton />
            ) : (
              <Recharts.ResponsiveContainer width="100%" height={300}>
                <Recharts.BarChart data={revenueData}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" />
                  <Recharts.XAxis dataKey="service" />
                  <Recharts.YAxis />
                  <Recharts.Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Recharts.Bar
                    dataKey="revenue"
                    fill="#8884d8"
                    onClick={(data) => {
                      const service = data?.payload?.service;
                      if (!service) return;
                      const params = new URLSearchParams({
                        metric: 'revenue',
                        service,
                        start: format(dateRange.from || initialStart, 'yyyy-MM-dd'),
                        end: format(dateRange.to || initialEnd, 'yyyy-MM-dd'),
                      });
                      navigate(`/reports?${params.toString()}`);
                    }}
                  />
                </Recharts.BarChart>
              </Recharts.ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diagnosis Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {rechartsLoading || !Recharts ? (
              <ChartSkeleton />
            ) : (
              <Recharts.ResponsiveContainer width="100%" height={300}>
                <Recharts.PieChart>
                  <Recharts.Pie
                    data={diagnosisData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ diagnosis, percent }) => `${diagnosis} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    onClick={(data) => {
                      const diagnosis = data?.payload?.diagnosis;
                      if (!diagnosis) return;
                      const params = new URLSearchParams({
                        metric: 'diagnosis',
                        diagnosis,
                        start: format(dateRange.from || initialStart, 'yyyy-MM-dd'),
                        end: format(dateRange.to || initialEnd, 'yyyy-MM-dd'),
                      });
                      navigate(`/reports?${params.toString()}`);
                    }}
                  >
                    {diagnosisData.map((entry, index) => (
                      <Recharts.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Recharts.Pie>
                  <Recharts.Tooltip />
                </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Clinical Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Treatment Success Rate</span>
                <Badge variant="secondary">{clinicalMetrics?.treatment_success_rate || 0}%</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Prescriptions</span>
                <span className="text-sm font-medium">{clinicalMetrics?.total_prescriptions || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Financial Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Pending Payments</span>
                <span className="text-sm font-medium text-orange-600">
                  ${(kpis?.financial_metrics.pending_payments || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pharmacy Revenue</span>
                <span className="text-sm font-medium">
                  ${(financialMetrics?.pharmacy_revenue || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Staff Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Avg Consultations/Doctor</span>
                <span className="text-sm font-medium">
                  {kpis?.operational_metrics.avg_consultations_per_doctor || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Avg Consultation Duration</span>
                <span className="text-sm font-medium">
                  {operationalMetrics?.avg_consultation_duration || 0} min
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
