import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Stethoscope,
  Pill,
  DollarSign,
  Users,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useReportStats, useDailyBreakdown } from '@/hooks/useReports';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { exportToCSV, exportToPDF } from '@/utils/reportExport';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { StaffPerformanceChart } from '@/components/reports/StaffPerformanceChart';
import { MonthlyTrendsChart } from '@/components/reports/MonthlyTrendsChart';
import { AppointmentTypePieChart } from '@/components/reports/AppointmentTypePieChart';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'7' | '14' | '30'>('7');
  const { data: stats, isLoading: statsLoading } = useReportStats();
  const { data: dailyData, isLoading: dailyLoading } = useDailyBreakdown(parseInt(period));
  const { hospital } = useAuth();

  const handleExportCSV = () => {
    exportToCSV({
      stats,
      dailyData,
      period,
      hospitalName: hospital?.name || 'Hospital',
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      stats,
      dailyData,
      period,
      hospitalName: hospital?.name || 'Hospital',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const chartData = dailyData?.map((day) => ({
    date: format(parseISO(day.date), 'MMM dd'),
    consultations: day.consultations,
    prescriptions: day.prescriptions,
    revenue: day.revenue,
    patients: day.patients_seen,
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground">View daily and weekly summaries</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs for different report views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs sm:text-sm">Staff Performance</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm">Monthly Trends</TabsTrigger>
            <TabsTrigger value="appointments" className="text-xs sm:text-sm">Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Consultations</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.today.consultations || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.week.consultations || 0} this week
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Prescriptions</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.today.prescriptions || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.week.prescriptions || 0} this week
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.today.revenue || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats?.week.revenue || 0)} this week
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients Seen Today</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.today.patients || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.week.patients || 0} this week
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          <Button
            variant={period === '7' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('7')}
          >
            Last 7 Days
          </Button>
          <Button
            variant={period === '14' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('14')}
          >
            Last 14 Days
          </Button>
          <Button
            variant={period === '30' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('30')}
          >
            Last 30 Days
          </Button>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Consultations & Prescriptions</CardTitle>
              <CardDescription>Daily breakdown over selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="consultations" fill="hsl(var(--primary))" name="Consultations" />
                    <Bar dataKey="prescriptions" fill="hsl(var(--chart-2))" name="Prescriptions" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Daily revenue over selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-1))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>Overview of this month's performance</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Stethoscope className="h-4 w-4" />
                    Consultations
                  </div>
                  <div className="text-2xl font-bold">{stats?.month.consultations || 0}</div>
                </div>
                <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Pill className="h-4 w-4" />
                    Prescriptions
                  </div>
                  <div className="text-2xl font-bold">{stats?.month.prescriptions || 0}</div>
                </div>
                <div className="p-4 rounded-lg bg-chart-1/10 border border-chart-1/20">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    Revenue
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.month.revenue || 0)}</div>
                </div>
                <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/20">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    Patients Seen
                  </div>
                  <div className="text-2xl font-bold">{stats?.month.patients || 0}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
            <CardDescription>Detailed view of each day's activity</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-right py-3 px-4 font-medium">Consultations</th>
                      <th className="text-right py-3 px-4 font-medium">Prescriptions</th>
                      <th className="text-right py-3 px-4 font-medium">Revenue</th>
                      <th className="text-right py-3 px-4 font-medium">Patients</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData?.map((day) => (
                      <tr key={day.date} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{format(parseISO(day.date), 'EEE, MMM d')}</td>
                        <td className="py-3 px-4 text-right">{day.consultations}</td>
                        <td className="py-3 px-4 text-right">{day.prescriptions}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(day.revenue)}</td>
                        <td className="py-3 px-4 text-right">{day.patients_seen}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold bg-muted/30">
                      <td className="py-3 px-4">Total</td>
                      <td className="py-3 px-4 text-right">
                        {dailyData?.reduce((sum, d) => sum + d.consultations, 0) || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {dailyData?.reduce((sum, d) => sum + d.prescriptions, 0) || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(dailyData?.reduce((sum, d) => sum + d.revenue, 0) || 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {dailyData?.reduce((sum, d) => sum + d.patients_seen, 0) || 0}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <StaffPerformanceChart />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <MonthlyTrendsChart />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <AppointmentTypePieChart />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
