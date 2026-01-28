import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Users, Clock, CheckCircle2, AlertTriangle, Award } from 'lucide-react';

interface MetricData {
  name: string;
  value: number;
  peerAverage: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

interface PeerComparison {
  metric: string;
  personal: number;
  peerAvg: number;
  top10: number;
}

export function StaffPerformanceMetrics({ role }: { role: 'doctor' | 'nurse' | 'admin' }) {
  // Mock performance data - in a real app, this would come from an edge function/analytics service
  const personalMetrics: MetricData[] = useMemo(() => [
    { name: 'Patient Throughput', value: role === 'doctor' ? 18 : 24, peerAverage: 15, unit: 'daily', trend: 'up' },
    { name: 'Completion Rate', value: 96, peerAverage: 92, unit: '%', trend: 'stable' },
    { name: 'Avg Turnaround', value: 14, peerAverage: 18, unit: 'mins', trend: 'down' }, // down is good for time
    { name: 'Patient Satisfaction', value: 4.8, peerAverage: 4.3, unit: '/ 5.0', trend: 'up' },
  ], [role]);

  const radarData: PeerComparison[] = useMemo(() => [
    { metric: 'Accuracy', personal: 98, peerAvg: 94, top10: 99 },
    { metric: 'Speed', personal: 85, peerAvg: 70, top10: 90 },
    { metric: 'Documentation', personal: 92, peerAvg: 80, top10: 95 },
    { metric: 'Communication', personal: 88, peerAvg: 85, top10: 92 },
    { metric: 'Compliance', personal: 100, peerAvg: 96, top10: 100 },
  ], []);

  const productivityTrend = [
    { day: 'Mon', personal: 12, avg: 10 },
    { day: 'Tue', personal: 15, avg: 11 },
    { day: 'Wed', personal: 14, avg: 10 },
    { day: 'Thu', personal: 19, avg: 12 },
    { day: 'Fri', personal: 16, avg: 11 },
  ];

  const getTrendIcon = (trend: string, isLowerBetter: boolean = false) => {
    if (trend === 'stable') return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    const isUp = trend === 'up';
    const isGood = isLowerBetter ? !isUp : isUp;
    
    if (isUp) return <TrendingUp className={`h-4 w-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />;
    return <TrendingDown className={`h-4 w-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Analytics</h2>
          <p className="text-muted-foreground">Comparative benchmarking against department averages</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 flex py-1">
            <Award className="h-4 w-4 text-primary" />
            Top 5% in Department
          </Badge>
          <Badge variant="secondary" className="py-1">Last 30 Days</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {personalMetrics.map((m) => (
          <Card key={m.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{m.name}</CardTitle>
              {getTrendIcon(m.trend, m.name.includes('Turnaround'))}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {m.value}{m.unit}
              </div>
              <p className="text-xs text-muted-foreground">
                Peer average: {m.peerAverage}{m.unit}
                <span className={`ml-1 ${m.value > m.peerAverage ? 'text-green-500' : 'text-muted-foreground'}`}>
                  ({Math.round(((m.value - m.peerAverage) / m.peerAverage) * 100)}%)
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Skill Proficiency & Compliance</CardTitle>
            <CardDescription>Multi-dimensional performance vs top 10% benchmark</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="You"
                  dataKey="personal"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Top 10%"
                  dataKey="top10"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.1}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Productivity Trend</CardTitle>
            <CardDescription>Daily throughput vs average</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                 />
                <Bar 
                  dataKey="personal" 
                  name="Personal" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30}
                />
                <Bar 
                  dataKey="avg" 
                  name="Peer Average" 
                  fill="hsl(var(--muted))" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30}
                />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg border bg-accent/10">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Patient Champion</p>
                <p className="text-sm text-muted-foreground">Highest satisfaction rating in the ward for 2 weeks.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Punctuality Award</p>
                <p className="text-sm text-muted-foreground">Zero discharge delays this week.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg border-l-4 border-amber-500 bg-amber-50">
              <p className="font-medium text-amber-900">Documentation Lag</p>
              <p className="text-sm text-amber-700">Average time to finalize notes is 15% slower than peers.</p>
              <Button variant="link" size="sm" className="px-0 h-auto text-amber-900 font-bold">Improve Now →</Button>
            </div>
            <div className="p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50">
              <p className="font-medium text-blue-900">CE Credits</p>
              <p className="text-sm text-blue-700">3 required continuing education modules are due next week.</p>
              <Button variant="link" size="sm" className="px-0 h-auto text-blue-900 font-bold">View Modules →</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
