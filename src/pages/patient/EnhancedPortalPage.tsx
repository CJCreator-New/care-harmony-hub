import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Activity,
  Heart,
  Thermometer,
  Weight,
  Droplets,
  Moon,
  Flame,
  Target,
  AlertTriangle,
  Calendar,
  BookOpen,
  TrendingUp,
  Plus,
  Edit,
  CheckCircle,
  Clock,
  Bell
} from 'lucide-react';
import { SymptomChecker } from '@/components/patient/SymptomChecker';
import { AllergyRecords } from '@/components/patient/AllergyRecords';
import { ImmunizationRecords } from '@/components/patient/ImmunizationRecords';
import { MedicationHistory } from '@/components/patient/MedicationHistory';
import { useHealthMonitoring, VitalSign, HealthMetric, HealthGoal } from '@/hooks/useHealthMonitoring';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const VITAL_SIGNS_CONFIG = [
  { type: 'blood_pressure', name: 'Blood Pressure', unit: 'mmHg', icon: Heart, color: 'text-red-500' },
  { type: 'heart_rate', name: 'Heart Rate', unit: 'bpm', icon: Activity, color: 'text-blue-500' },
  { type: 'temperature', name: 'Temperature', unit: '°F', icon: Thermometer, color: 'text-orange-500' },
  { type: 'weight', name: 'Weight', unit: 'lbs', icon: Weight, color: 'text-green-500' },
  { type: 'blood_glucose', name: 'Blood Glucose', unit: 'mg/dL', icon: Activity, color: 'text-purple-500' },
  { type: 'oxygen_saturation', name: 'Oxygen Saturation', unit: '%', icon: Activity, color: 'text-cyan-500' },
];

const HEALTH_METRICS_CONFIG = [
  { type: 'steps', name: 'Daily Steps', unit: 'steps', icon: Activity, color: 'text-blue-500' },
  { type: 'sleep_hours', name: 'Sleep Hours', unit: 'hours', icon: Moon, color: 'text-indigo-500' },
  { type: 'water_intake', name: 'Water Intake', unit: 'oz', icon: Droplets, color: 'text-blue-400' },
  { type: 'calories_burned', name: 'Calories Burned', unit: 'cal', icon: Flame, color: 'text-orange-500' },
  { type: 'mood', name: 'Mood', unit: '/10', icon: Activity, color: 'text-yellow-500' },
  { type: 'pain_level', name: 'Pain Level', unit: '/10', icon: Activity, color: 'text-red-400' },
  { type: 'energy_level', name: 'Energy Level', unit: '/10', icon: Activity, color: 'text-green-400' },
];

export function EnhancedPortalPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVitalType, setSelectedVitalType] = useState<string>('');
  const [vitalValue, setVitalValue] = useState('');
  const [selectedMetricType, setSelectedMetricType] = useState<string>('');
  const [metricValue, setMetricValue] = useState('');
  const [metricNotes, setMetricNotes] = useState('');

  const {
    vitalSigns,
    healthMetrics,
    healthGoals,
    healthAlerts,
    isLoading,
    recordVitalSign,
    recordHealthMetric,
    updateGoalProgress,
    resolveAlert,
    getHealthTrendsQueryOptions,
    isVitalSignAbnormal,
    isRecordingVital,
    isRecordingMetric,
  } = useHealthMonitoring();

  const { data: trends30d } = useQuery(getHealthTrendsQueryOptions('30d'));

  const handleRecordVital = () => {
    if (!selectedVitalType || !vitalValue) return;

    recordVitalSign({
      patient_id: profile?.id || '',
      type: selectedVitalType as VitalSign['type'],
      value: parseFloat(vitalValue),
      unit: VITAL_SIGNS_CONFIG.find(c => c.type === selectedVitalType)?.unit || '',
      recorded_by: profile?.id || '',
    });

    setSelectedVitalType('');
    setVitalValue('');
  };

  const handleRecordMetric = () => {
    if (!selectedMetricType || !metricValue) return;

    recordHealthMetric({
      patient_id: profile?.id || '',
      metric_type: selectedMetricType as HealthMetric['metric_type'],
      value: parseFloat(metricValue),
      unit: HEALTH_METRICS_CONFIG.find(c => c.type === selectedMetricType)?.unit || '',
      date: new Date().toISOString().split('T')[0],
      notes: metricNotes,
    });

    setSelectedMetricType('');
    setMetricValue('');
    setMetricNotes('');
  };

  const getLatestVital = (type: string) => {
    return vitalSigns?.find(v => v.type === type);
  };

  const getLatestMetric = (type: string) => {
    return healthMetrics?.find(m => m.metric_type === type);
  };

  const getGoalProgress = (goal: HealthGoal) => {
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading health data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Health Portal</h1>
          <p className="text-muted-foreground">
            Monitor your health, track symptoms, and manage your wellness goals
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Record Vital Signs
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Vital Signs</DialogTitle>
                <DialogDescription>
                  Enter your current vital sign measurements
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Vital Sign Type</Label>
                  <Select value={selectedVitalType} onValueChange={setSelectedVitalType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vital sign" />
                    </SelectTrigger>
                    <SelectContent>
                      {VITAL_SIGNS_CONFIG.map((config) => (
                        <SelectItem key={config.type} value={config.type}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    type="number"
                    placeholder="Enter value"
                    value={vitalValue}
                    onChange={(e) => setVitalValue(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleRecordVital}
                  disabled={isRecordingVital || !selectedVitalType || !vitalValue}
                  className="w-full"
                >
                  {isRecordingVital ? 'Recording...' : 'Record Vital Sign'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Log Health Metric
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Health Metric</DialogTitle>
                <DialogDescription>
                  Track your daily health metrics and activities
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Metric Type</Label>
                  <Select value={selectedMetricType} onValueChange={setSelectedMetricType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {HEALTH_METRICS_CONFIG.map((config) => (
                        <SelectItem key={config.type} value={config.type}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    type="number"
                    placeholder="Enter value"
                    value={metricValue}
                    onChange={(e) => setMetricValue(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={metricNotes}
                    onChange={(e) => setMetricNotes(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleRecordMetric}
                  disabled={isRecordingMetric || !selectedMetricType || !metricValue}
                  className="w-full"
                >
                  {isRecordingMetric ? 'Logging...' : 'Log Metric'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Health Alerts */}
      {healthAlerts && healthAlerts.length > 0 && (
        <div className="space-y-2">
          {healthAlerts.map((alert) => (
            <Alert key={alert.id} className={getAlertSeverityColor(alert.severity)}>
              <Bell className="h-4 w-4" />
              <AlertTitle>{alert.alert_type.replace('_', ' ').toUpperCase()}</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <span className="whitespace-pre-wrap break-words">
                  {alert.message?.replace(/<[^>]*>/g, '')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resolveAlert(alert.id)}
                >
                  Mark as Read
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
          <TabsTrigger value="records">Medical Records</TabsTrigger>
          <TabsTrigger value="symptoms">Symptom Checker</TabsTrigger>
          <TabsTrigger value="goals">Health Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {VITAL_SIGNS_CONFIG.slice(0, 4).map((config) => {
              const latest = getLatestVital(config.type);
              const Icon = config.icon;
              return (
                <Card key={config.type}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{config.name}</p>
                        <p className="text-2xl font-bold">
                          {latest ? `${latest.value} ${latest.unit}` : '--'}
                        </p>
                        {latest && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(latest.recorded_at), 'MMM d, h:mm a')}
                          </p>
                        )}
                      </div>
                      <Icon className={`h-8 w-8 ${config.color}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Health Goals Progress */}
          {healthGoals && healthGoals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Health Goals Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {healthGoals.map((goal) => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {goal.goal_type.replace('_', ' ').toUpperCase()}
                        </span>
                        <Badge variant={goal.status === 'completed' ? 'default' : 'secondary'}>
                          {goal.status}
                        </Badge>
                      </div>
                      <Progress value={getGoalProgress(goal)} className="h-2" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{goal.current_value} / {goal.target_value} {goal.unit}</span>
                        <span>{Math.round(getGoalProgress(goal))}% complete</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Health Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Health Metrics</CardTitle>
              <CardDescription>Your latest health tracking data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {HEALTH_METRICS_CONFIG.map((config) => {
                  const latest = getLatestMetric(config.type);
                  const Icon = config.icon;
                  return (
                    <div key={config.type} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Icon className={`h-8 w-8 ${config.color}`} />
                      <div>
                        <p className="font-medium">{config.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {latest ? `${latest.value} ${latest.unit}` : 'Not recorded'}
                        </p>
                        {latest && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(latest.date), 'MMM d')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vitals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VITAL_SIGNS_CONFIG.map((config) => {
              const latest = getLatestVital(config.type);
              const Icon = config.icon;
              const isAbnormal = latest ? isVitalSignAbnormal(latest.type, latest.value) : false;

              return (
                <Card key={config.type} className={isAbnormal ? 'border-red-200' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      {config.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {latest ? (
                        <>
                          <div className="text-3xl font-bold">
                            {latest.value} <span className="text-lg font-normal text-muted-foreground">{latest.unit}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Recorded {format(new Date(latest.recorded_at), 'MMM d, h:mm a')}
                          </div>
                          {isAbnormal && (
                            <Alert className="border-red-200">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-red-700">
                                This value is outside normal range. Please consult your healthcare provider.
                              </AlertDescription>
                            </Alert>
                          )}
                        </>
                      ) : (
                        <div className="text-muted-foreground">No recent readings</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Vital Signs History */}
          {vitalSigns && vitalSigns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Vital Signs History</CardTitle>
                <CardDescription>Recent measurements and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vitalSigns.slice(0, 10).map((vital) => {
                    const config = VITAL_SIGNS_CONFIG.find(c => c.type === vital.type);
                    const Icon = config?.icon || Activity;
                    return (
                      <div key={vital.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 ${config?.color}`} />
                          <div>
                            <p className="font-medium">{config?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(vital.recorded_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{vital.value} {vital.unit}</p>
                          {vital.notes && (
                            <p className="text-xs text-muted-foreground">
                              {vital.notes.replace(/<[^>]*>/g, '')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="records" className="space-y-6">
          <div className="grid gap-6">
            <AllergyRecords patientId={profile?.id || ''} />
            <ImmunizationRecords patientId={profile?.id || ''} />
            <MedicationHistory patientId={profile?.id || ''} />
          </div>
        </TabsContent>

        <TabsContent value="symptoms">
          <SymptomChecker />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Health Goals
              </CardTitle>
              <CardDescription>
                Set and track your health improvement goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthGoals && healthGoals.length > 0 ? (
                <div className="space-y-6">
                  {healthGoals.map((goal) => (
                    <div key={goal.id} className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {goal.goal_type.replace('_', ' ').toUpperCase()}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Target: {goal.target_value} {goal.unit} by {format(new Date(goal.deadline), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant={goal.status === 'completed' ? 'default' : 'secondary'}>
                          {goal.status}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{Math.round(getGoalProgress(goal))}%</span>
                        </div>
                        <Progress value={getGoalProgress(goal)} className="h-3" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Current: {goal.current_value} {goal.unit}</span>
                          <span>Target: {goal.target_value} {goal.unit}</span>
                        </div>
                      </div>

                      {goal.status !== 'completed' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateGoalProgress(goal.id, goal.current_value + 1)}
                          >
                            +1 Progress
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateGoalProgress(goal.id, goal.target_value)}
                          >
                            Mark Complete
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No health goals set yet.</p>
                  <p className="text-sm">Work with your healthcare provider to set personalized goals.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Trends */}
          {trends30d && trends30d.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Health Trends (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trends30d.map((trend) => (
                    <div key={trend.metric} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{trend.metric}</span>
                        <Badge variant={
                          trend.trend === 'improving' ? 'default' :
                          trend.trend === 'declining' ? 'destructive' : 'secondary'
                        }>
                          {trend.trend}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">
                        {trend.current_value}
                        <span className={`text-sm ml-2 ${
                          trend.change_percentage > 0 ? 'text-green-600' :
                          trend.change_percentage < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {trend.change_percentage > 0 ? '+' : ''}{trend.change_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnhancedPortalPage;