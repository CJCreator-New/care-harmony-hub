import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecharts, ChartSkeleton } from '@/components/ui/lazy-chart';
export function MonthlyTrendsChart() {
  const { data: trends, isLoading } = useMonthlyTrends();
  const { components: Recharts, loading: chartsLoading } = useRecharts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
          <CardDescription>6-month performance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Trends</CardTitle>
        <CardDescription>6-month performance overview</CardDescription>
      </CardHeader>
      <CardContent>
        {!trends || trends.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No trend data available
          </div>
        ) : chartsLoading ? (
          <ChartSkeleton />
        ) : Recharts ? (
          <Recharts.ResponsiveContainer width="100%" height={300}>
            <Recharts.LineChart data={trends}>
              <Recharts.CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <Recharts.XAxis dataKey="month" className="text-xs" />
              <Recharts.YAxis className="text-xs" />
              <Recharts.Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Recharts.Legend />
              <Recharts.Line
                type="monotone"
                dataKey="appointments"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Appointments"
              />
              <Recharts.Line
                type="monotone"
                dataKey="consultations"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))' }}
                name="Consultations"
              />
              <Recharts.Line
                type="monotone"
                dataKey="patients"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-3))' }}
                name="Unique Patients"
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
  );
}
