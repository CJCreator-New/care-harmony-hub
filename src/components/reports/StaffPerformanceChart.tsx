import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecharts, ChartSkeleton } from '@/components/ui/lazy-chart';
import { useStaffPerformanceMetrics } from '@/hooks/useStaffAnalytics';

export function StaffPerformanceChart() {
  const { data: metrics, isLoading } = useStaffPerformanceMetrics();
  const { components: Recharts, loading: chartsLoading } = useRecharts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Performance</CardTitle>
          <CardDescription>This month's performance by staff member</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = metrics?.slice(0, 10).map((m) => ({
    name: m.staff_name.replace('Dr. ', ''),
    consultations: m.consultations_completed,
    prescriptions: m.prescriptions_written,
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Performance</CardTitle>
        <CardDescription>This month's performance by staff member</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No performance data available
          </div>
        ) : chartsLoading ? (
          <ChartSkeleton />
        ) : Recharts ? (
          <Recharts.ResponsiveContainer width="100%" height={300}>
            <Recharts.BarChart data={chartData} layout="vertical">
              <Recharts.CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <Recharts.XAxis type="number" className="text-xs" />
              <Recharts.YAxis type="category" dataKey="name" width={100} className="text-xs" />
              <Recharts.Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Recharts.Legend />
              <Recharts.Bar dataKey="consultations" fill="hsl(var(--primary))" name="Consultations" />
              <Recharts.Bar dataKey="prescriptions" fill="hsl(var(--chart-2))" name="Prescriptions" />
            </Recharts.BarChart>
          </Recharts.ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Failed to load charts
          </div>
        )}
      </CardContent>
    </Card>
  );
}
