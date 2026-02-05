import { useEffect, useMemo, useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Stethoscope,
  Pill,
  DollarSign,
  Users,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useReportStats, useDailyBreakdown, useYearOverYearMetrics } from '@/hooks/useReports';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, subDays } from 'date-fns';
import { exportToCSV, exportToPDF, sendReportByEmail } from '@/utils/reportExport';
import { toast } from 'sonner';
import { useRecharts, ChartSkeleton } from '@/components/ui/lazy-chart';
import { StaffPerformanceChart } from '@/components/reports/StaffPerformanceChart';
import { MonthlyTrendsChart } from '@/components/reports/MonthlyTrendsChart';
import { AppointmentTypePieChart } from '@/components/reports/AppointmentTypePieChart';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useSearchParams } from 'react-router-dom';

export default function ReportsPage() {
  const monthlySkeletonKeys = ['summary-1', 'summary-2', 'summary-3', 'summary-4'];
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEnd = searchParams.get('end') ? parseISO(searchParams.get('end')!) : new Date();
  const initialStart = searchParams.get('start') ? parseISO(searchParams.get('start')!) : subDays(initialEnd, 6);
  const [dateRange, setDateRange] = useState<DateRange>({ from: initialStart, to: initialEnd });
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { data: stats, isLoading: statsLoading } = useReportStats();
  const { data: dailyData, isLoading: dailyLoading } = useDailyBreakdown({
    start: dateRange.from || initialStart,
    end: dateRange.to || initialEnd,
  });
  const { data: yoyMetrics, isLoading: yoyLoading } = useYearOverYearMetrics({
    start: dateRange.from || initialStart,
    end: dateRange.to || initialEnd,
  });
  const { hospital } = useAuth();
  const { components: Recharts, loading: chartsLoading } = useRecharts();
  const drillMetric = searchParams.get('metric');
  const drillDate = searchParams.get('date');

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      const next = new URLSearchParams(searchParams);
      next.set('start', format(dateRange.from, 'yyyy-MM-dd'));
      next.set('end', format(dateRange.to, 'yyyy-MM-dd'));
      setSearchParams(next, { replace: true });
    }
  }, [dateRange, searchParams, setSearchParams]);

  const rangeLabel = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return 'Custom Range';
    return `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
  }, [dateRange]);

  const handleExportCSV = () => {
    exportToCSV({
      stats,
      dailyData,
      period: rangeLabel,
      hospitalName: hospital?.name || 'Hospital',
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      stats,
      dailyData,
      period: rangeLabel,
      hospitalName: hospital?.name || 'Hospital',
    });
  };

  const handleSendEmail = async () => {
    if (!emailAddress.trim()) return;

    setIsSendingEmail(true);
    try {
      await sendReportByEmail({
        stats,
        dailyData,
        period: rangeLabel,
        hospitalName: hospital?.name || 'Hospital',
        recipientEmail: emailAddress.trim(),
      });
      toast.success('Report sent successfully');
      setEmailDialogOpen(false);
      setEmailAddress('');
    } catch (error) {
      toast.error('Failed to send report');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const chartData = dailyData?.map((day) => ({
    date: format(parseISO(day.date), 'MMM dd'),
    dateISO: day.date,
    consultations: day.consultations,
    prescriptions: day.prescriptions,
    revenue: day.revenue,
    patients: day.patients_seen,
  })) || [];

  const filteredDailyData = drillDate
    ? dailyData?.filter((day) => day.date === drillDate)
    : dailyData;

  const handleDrillDown = (metric: string, payload: any) => {
    const dateISO = payload?.payload?.dateISO;
    if (!dateISO) return;
    const next = new URLSearchParams(searchParams);
    next.set('metric', metric);
    next.set('date', dateISO);
    setSearchParams(next);
  };

  const clearDrillDown = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('metric');
    next.delete('date');
    setSearchParams(next);
  };

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
              <DropdownMenuItem onClick={() => setEmailDialogOpen(true)} className="gap-2 cursor-pointer">
                <Mail className="h-4 w-4" />
                Send by Email
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

        {/* Date Range */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          {drillDate && (
            <Button variant="outline" size="sm" onClick={clearDrillDown}>
              Back to full range
            </Button>
          )}
        </div>

        {/* YoY Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Year-over-Year Comparison</CardTitle>
            <CardDescription>Revenue, patient volume, and quality compliance</CardDescription>
          </CardHeader>
          <CardContent>
            {yoyLoading || !yoyMetrics ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Revenue</div>
                  <div className="text-xl font-semibold">{formatCurrency(yoyMetrics.revenue.current)}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {yoyMetrics.revenue.changePercent >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    {Math.abs(yoyMetrics.revenue.changePercent).toFixed(1)}% vs last year
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Patient Volume</div>
                  <div className="text-xl font-semibold">{yoyMetrics.patients.current}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {yoyMetrics.patients.changePercent >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    {Math.abs(yoyMetrics.patients.changePercent).toFixed(1)}% vs last year
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Quality Compliance</div>
                  <div className="text-xl font-semibold">{yoyMetrics.quality.current.toFixed(1)}%</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {yoyMetrics.quality.changePercent >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    {Math.abs(yoyMetrics.quality.changePercent).toFixed(1)}% vs last year
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Consultations & Prescriptions</CardTitle>
              <CardDescription>Daily breakdown over selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyLoading || chartsLoading ? (
                <ChartSkeleton />
              ) : Recharts ? (
                <Recharts.ResponsiveContainer width="100%" height={300}>
                  <Recharts.BarChart data={chartData}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <Recharts.XAxis dataKey="date" className="text-xs" />
                    <Recharts.YAxis className="text-xs" />
                    <Recharts.Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Recharts.Legend />
                    <Recharts.Bar
                      dataKey="consultations"
                      fill="hsl(var(--primary))"
                      name="Consultations"
                      onClick={(data) => handleDrillDown('consultations', data)}
                    />
                    <Recharts.Bar
                      dataKey="prescriptions"
                      fill="hsl(var(--chart-2))"
                      name="Prescriptions"
                      onClick={(data) => handleDrillDown('prescriptions', data)}
                    />
                  </Recharts.BarChart>
                </Recharts.ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Failed to load charts
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Daily revenue over selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyLoading || chartsLoading ? (
                <ChartSkeleton />
              ) : Recharts ? (
                <Recharts.ResponsiveContainer width="100%" height={300}>
                  <Recharts.LineChart data={chartData}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <Recharts.XAxis dataKey="date" className="text-xs" />
                    <Recharts.YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
                    <Recharts.Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Recharts.Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-1))' }}
                      activeDot={{ onClick: (data) => handleDrillDown('revenue', data) }}
                    />
                  </Recharts.LineChart>
                </Recharts.ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Failed to load charts
                </div>
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
                {monthlySkeletonKeys.map((key) => (
                  <Skeleton key={key} className="h-20" />
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
                    {filteredDailyData?.length ? (
                      filteredDailyData.map((day) => (
                        <tr key={day.date} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{format(parseISO(day.date), 'EEE, MMM d')}</td>
                          <td className="py-3 px-4 text-right">{day.consultations}</td>
                          <td className="py-3 px-4 text-right">{day.prescriptions}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(day.revenue)}</td>
                          <td className="py-3 px-4 text-right">{day.patients_seen}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No daily data available for the selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold bg-muted/30">
                      <td className="py-3 px-4">Total</td>
                      <td className="py-3 px-4 text-right">
                        {filteredDailyData?.reduce((sum, d) => sum + d.consultations, 0) || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {filteredDailyData?.reduce((sum, d) => sum + d.prescriptions, 0) || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(filteredDailyData?.reduce((sum, d) => sum + d.revenue, 0) || 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {filteredDailyData?.reduce((sum, d) => sum + d.patients_seen, 0) || 0}
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

        {/* Email Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Send Report by Email</DialogTitle>
              <DialogDescription>
                Enter the email address where you want to send this report.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={!emailAddress.trim() || isSendingEmail}
              >
                {isSendingEmail ? 'Sending...' : 'Send Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
