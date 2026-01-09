import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalytics } from '@/hooks/useAnalytics';
import { 
  Users, Calendar, DollarSign, Activity, 
  TrendingUp, TrendingDown, Clock, Bed 
} from 'lucide-react';
import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line 
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function BusinessIntelligenceDashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const { kpis, financialMetrics, operationalMetrics, clinicalMetrics, isLoading } = useAnalytics(period);

  if (isLoading) {
    return <div className="p-4">Loading analytics...</div>;
  }

  const revenueData = financialMetrics?.revenue_by_service ? 
    Object.entries(financialMetrics.revenue_by_service).map(([service, revenue]) => ({
      service,
      revenue: revenue as number
    })) : [];

  const diagnosisData = clinicalMetrics?.diagnosis_distribution ?
    Object.entries(clinicalMetrics.diagnosis_distribution).map(([diagnosis, count]) => ({
      diagnosis,
      count: count as number
    })) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Business Intelligence</h2>
        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 Days</SelectItem>
            <SelectItem value="30d">30 Days</SelectItem>
            <SelectItem value="90d">90 Days</SelectItem>
            <SelectItem value="1y">1 Year</SelectItem>
          </SelectContent>
        </Select>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="service" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diagnosis Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={diagnosisData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ diagnosis, percent }) => `${diagnosis} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {diagnosisData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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