import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  Star, 
  TrendingUp, 
  Award,
  Download
} from 'lucide-react';
import { useState } from 'react';
import { ChartSkeleton, useRecharts } from '@/components/ui/lazy-chart';

// Mock Data
const volumeData = [
  { name: 'Mon', you: 12, deptAvg: 10, top: 15 },
  { name: 'Tue', you: 15, deptAvg: 11, top: 16 },
  { name: 'Wed', you: 10, deptAvg: 12, top: 15 },
  { name: 'Thu', you: 14, deptAvg: 10, top: 14 },
  { name: 'Fri', you: 16, deptAvg: 13, top: 18 },
];

const satisfactionData = [
  { subject: 'Wait Time', A: 4.5, B: 4.0, fullMark: 5 },
  { subject: 'Communication', A: 4.8, B: 4.5, fullMark: 5 },
  { subject: 'Diagnosis', A: 4.7, B: 4.6, fullMark: 5 },
  { subject: 'Follow-up', A: 4.2, B: 3.8, fullMark: 5 },
  { subject: 'Empathy', A: 4.9, B: 4.7, fullMark: 5 },
];

const outcomeTrend = [
  { month: 'Jan', rate: 92, dept: 88 },
  { month: 'Feb', rate: 94, dept: 89 },
  { month: 'Mar', rate: 91, dept: 88 },
  { month: 'Apr', rate: 95, dept: 90 },
  { month: 'May', rate: 96, dept: 90 },
  { month: 'Jun', rate: 98, dept: 91 },
];

export function PeerBenchmarkingDashboard() {
  const [period, setPeriod] = useState('weekly');
  const { components: Recharts, loading: rechartsLoading } = useRecharts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clinical Performance Dashboard</h2>
          <p className="text-muted-foreground">Compare your key performance indicators against department benchmarks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="quarterly">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients Seen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-green-500 font-medium">↑ 12%</span> vs last week
            </p>
            <div className="mt-2 h-1 w-full bg-secondary rounded-full overflow-hidden">
               <div className="h-full bg-blue-500 w-[75%]" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-right">Top 25% of Dept</p>
          </CardContent>
        </Card>

         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14m</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-green-500 font-medium">↓ 2m</span> vs Dept Avg (16m)
            </p>
            <div className="mt-2 h-1 w-full bg-secondary rounded-full overflow-hidden">
               <div className="h-full bg-green-500 w-[90%]" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-right">Better than 85% of peers</p>
          </CardContent>
        </Card>

         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8/5.0</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-green-500 font-medium">Top Rated</span> in Cardiology
            </p>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((s, idx) => (
                <Star key={`star-${idx}`} className={`h-3 w-3 ${s <= 5 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
              ))}
            </div>
          </CardContent>
        </Card>

         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">96%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-green-500 font-medium">+2%</span> vs Dept Avg
            </p>
            <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
               <Award className="h-3 w-3 mr-1" /> Clinical Excellence
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Main Chart */}
        <Card className="col-span-4">
          <CardHeader>
             <CardTitle>Patient Volume Analysis</CardTitle>
             <CardDescription>Daily patient consultations compared to department metrics.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              {rechartsLoading || !Recharts ? (
                <ChartSkeleton />
              ) : (
                <Recharts.ResponsiveContainer width="100%" height="100%">
                  <Recharts.BarChart data={volumeData}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Recharts.XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <Recharts.YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Recharts.Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Recharts.Legend />
                    <Recharts.Bar dataKey="you" name="Your volume" fill="#3b82f6" radius={[4, 4, 0, 0]} aria-label="Your patient volume" />
                    <Recharts.Bar dataKey="deptAvg" name="Dept Average" fill="#94a3b8" radius={[4, 4, 0, 0]} aria-label="Department average volume" />
                  </Recharts.BarChart>
                </Recharts.ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Feedback Analysis</CardTitle>
            <CardDescription>Patient satisfaction scores by category.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
               {rechartsLoading || !Recharts ? (
                 <ChartSkeleton />
               ) : (
                 <Recharts.ResponsiveContainer width="100%" height="100%">
                   <Recharts.RadarChart cx="50%" cy="50%" outerRadius="80%" data={satisfactionData}>
                     <Recharts.PolarGrid />
                     <Recharts.PolarAngleAxis dataKey="subject" fontSize={12} />
                     <Recharts.PolarRadiusAxis angle={30} domain={[0, 5]} />
                     <Recharts.Radar name="You" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                     <Recharts.Radar name="Dept Avg" dataKey="B" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
                     <Recharts.Legend />
                     <Recharts.Tooltip />
                   </Recharts.RadarChart>
                 </Recharts.ResponsiveContainer>
               )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outcome Trends (6 Months)</CardTitle>
          <CardDescription>Successful treatment vs Department baseline.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="h-[250px] w-full">
              {rechartsLoading || !Recharts ? (
                <ChartSkeleton />
              ) : (
                <Recharts.ResponsiveContainer width="100%" height="100%">
                  <Recharts.LineChart data={outcomeTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                     <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <Recharts.XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                     <Recharts.YAxis domain={[80, 100]} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                     <Recharts.Tooltip />
                     <Recharts.Legend />
                     <Recharts.Line type="monotone" dataKey="rate" name="Success Rate" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
                     <Recharts.Line type="monotone" dataKey="dept" name="Dept Average" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
                  </Recharts.LineChart>
                </Recharts.ResponsiveContainer>
              )}
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
