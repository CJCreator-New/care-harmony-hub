import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { useReceptionistStats } from '@/hooks/useReceptionistStats';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface ReceptionistAnalyticsProps {
  compact?: boolean;
}

export function ReceptionistAnalytics({ compact = false }: ReceptionistAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const { data: stats, isLoading } = useReceptionistStats();

  // Mock data for demonstration - in real implementation, this would come from analytics hooks
  const performanceData = [
    { day: 'Mon', checkIns: 45, waitTime: 12, satisfaction: 4.2 },
    { day: 'Tue', checkIns: 52, waitTime: 8, satisfaction: 4.5 },
    { day: 'Wed', checkIns: 38, waitTime: 15, satisfaction: 3.8 },
    { day: 'Thu', checkIns: 61, waitTime: 6, satisfaction: 4.7 },
    { day: 'Fri', checkIns: 49, waitTime: 10, satisfaction: 4.3 },
    { day: 'Sat', checkIns: 23, waitTime: 18, satisfaction: 3.9 },
    { day: 'Sun', checkIns: 15, waitTime: 22, satisfaction: 3.5 },
  ];

  const queueEfficiencyData = [
    { time: '8:00', avgWait: 5, patients: 12 },
    { time: '9:00', avgWait: 8, patients: 18 },
    { time: '10:00', avgWait: 12, patients: 25 },
    { time: '11:00', avgWait: 15, patients: 32 },
    { time: '12:00', avgWait: 10, patients: 28 },
    { time: '13:00', avgWait: 7, patients: 20 },
    { time: '14:00', avgWait: 9, patients: 24 },
    { time: '15:00', avgWait: 11, patients: 26 },
    { time: '16:00', avgWait: 14, patients: 30 },
    { time: '17:00', avgWait: 18, patients: 22 },
  ];

  const appointmentTypeData = [
    { name: 'General Checkup', value: 35, color: '#8884d8' },
    { name: 'Follow-up', value: 25, color: '#82ca9d' },
    { name: 'Consultation', value: 20, color: '#ffc658' },
    { name: 'Emergency', value: 12, color: '#ff7300' },
    { name: 'Specialist', value: 8, color: '#00ff00' },
  ];

  const getPerformanceMetrics = () => {
    const today = performanceData[performanceData.length - 1];
    const yesterday = performanceData[performanceData.length - 2];

    return {
      checkInsChange: ((today.checkIns - yesterday.checkIns) / yesterday.checkIns) * 100,
      waitTimeChange: ((today.waitTime - yesterday.waitTime) / yesterday.waitTime) * 100,
      satisfactionChange: ((today.satisfaction - yesterday.satisfaction) / yesterday.satisfaction) * 100,
    };
  };

  const metrics = getPerformanceMetrics();

  if (compact) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats?.completedToday || 0}
              </div>
              <div className="text-sm text-muted-foreground">Completed Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.avgWaitTime || 0}min
              </div>
              <div className="text-sm text-muted-foreground">Avg Wait Time</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Receptionist Performance Analytics
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline" className="cursor-pointer" onClick={() => setTimeRange('today')}>
            Today
          </Badge>
          <Badge variant="outline" className="cursor-pointer" onClick={() => setTimeRange('week')}>
            This Week
          </Badge>
          <Badge variant="outline" className="cursor-pointer" onClick={() => setTimeRange('month')}>
            This Month
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Check-ins</p>
                      <p className="text-2xl font-bold">{stats?.completedToday || 0}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex items-center mt-2">
                    {metrics.checkInsChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span className={`text-sm ${metrics.checkInsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(metrics.checkInsChange).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Wait Time</p>
                      <p className="text-2xl font-bold">{stats?.avgWaitTime || 0}min</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex items-center mt-2">
                    {metrics.waitTimeChange <= 0 ? (
                      <TrendingDown className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span className={`text-sm ${metrics.waitTimeChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(metrics.waitTimeChange).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Revenue Collected</p>
                      <p className="text-2xl font-bold">${(stats?.totalRevenue || 0).toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Messages Sent</p>
                      <p className="text-2xl font-bold">24</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="checkIns" fill="#8884d8" name="Check-ins" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="efficiency" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Queue Efficiency Throughout Day</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={queueEfficiencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgWait" stroke="#8884d8" name="Avg Wait Time (min)" />
                    <Line type="monotone" dataKey="patients" stroke="#82ca9d" name="Patients in Queue" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Peak Hours Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Morning Peak (8-11 AM)</span>
                    <Badge variant="warning">High Volume</Badge>
                  </div>
                  <Progress value={85} className="h-2" />
                  <p className="text-xs text-muted-foreground">Avg wait: 12 min</p>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Afternoon (12-4 PM)</span>
                    <Badge variant="secondary">Moderate</Badge>
                  </div>
                  <Progress value={60} className="h-2" />
                  <p className="text-xs text-muted-foreground">Avg wait: 8 min</p>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Evening (4-6 PM)</span>
                    <Badge variant="destructive">Critical</Badge>
                  </div>
                  <Progress value={95} className="h-2" />
                  <p className="text-xs text-muted-foreground">Avg wait: 18 min</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Efficiency Score</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">87%</div>
                    <p className="text-sm text-muted-foreground">Overall Efficiency</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Check-in Speed</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />

                    <div className="flex justify-between text-sm">
                      <span>Queue Management</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />

                    <div className="flex justify-between text-sm">
                      <span>Patient Satisfaction</span>
                      <span className="font-medium">88%</span>
                    </div>
                    <Progress value={88} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appointment Types Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={appointmentTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {appointmentTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appointment Success Rate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600">94%</div>
                    <p className="text-sm text-muted-foreground">Appointments Completed</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">On Time</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">89%</span>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Late (≤15 min)</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">8%</span>
                        <Clock className="h-4 w-4 text-yellow-600" />
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">No-Shows</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">3%</span>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    Optimization Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Peak Hour Staffing</p>
                        <p className="text-sm text-muted-foreground">
                          Consider additional staff during 4-6 PM when wait times exceed 15 minutes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Appointment Clustering</p>
                        <p className="text-sm text-muted-foreground">
                          Group similar appointment types to reduce room turnover time.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Digital Check-in Success</p>
                        <p className="text-sm text-muted-foreground">
                          78% of patients now use self-service kiosks, reducing check-in time by 40%.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Patient Satisfaction</span>
                        <span className="font-medium">4.3/5.0</span>
                      </div>
                      <Progress value={86} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">+0.2 from last week</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Process Efficiency</span>
                        <span className="font-medium">87%</span>
                      </div>
                      <Progress value={87} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">+3% from last week</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Revenue per Hour</span>
                        <span className="font-medium">$1,240</span>
                      </div>
                      <Progress value={78} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">+$180 from last week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}