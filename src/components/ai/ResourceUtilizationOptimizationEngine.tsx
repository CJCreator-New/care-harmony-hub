import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAI } from '@/hooks/useAI';
import { usePermissions } from '@/hooks/usePermissions';
import { usePatients } from '@/hooks/usePatients';
import { useAppointments } from '@/hooks/useAppointments';
import { AlertTriangle, TrendingUp, Users, Bed, Stethoscope, Clock, BarChart3, Target, Zap, Activity, Calendar, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface ResourceOptimization {
  beds: {
    currentOccupancy: number;
    optimalOccupancy: number;
    recommendedCapacity: number;
    utilizationRate: number;
    costSavings: number;
  };
  staffing: {
    nurses: {
      current: number;
      recommended: number;
      optimal: number;
      costImpact: number;
    };
    physicians: {
      current: number;
      recommended: number;
      optimal: number;
      costImpact: number;
    };
    support: {
      current: number;
      recommended: number;
      optimal: number;
      costImpact: number;
    };
  };
  equipment: {
    utilization: Record<string, number>;
    recommendations: string[];
    efficiency: number;
  };
  scheduling: {
    optimizationScore: number;
    bottleneckHours: string[];
    recommendations: string[];
  };
}

interface OptimizationMetrics {
  overallEfficiency: number;
  resourceWaste: number;
  costSavings: number;
  patientSatisfaction: number;
  waitTimeReduction: number;
}

export const ResourceUtilizationOptimizationEngine: React.FC = () => {
  const permissions = usePermissions();
  const { data: patients } = usePatients();
  const { data: appointments } = useAppointments();
  const { optimizeResourceUtilization, isLoading } = useAI({ purpose: 'resource_optimization' });

  const [selectedDepartment, setSelectedDepartment] = useState<string>('emergency');
  const [timeframe, setTimeframe] = useState<string>('24h');
  const [optimization, setOptimization] = useState<ResourceOptimization | null>(null);
  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for demonstration - in production this would come from ML models
  const mockOptimization: ResourceOptimization = {
    beds: {
      currentOccupancy: 78,
      optimalOccupancy: 85,
      recommendedCapacity: 120,
      utilizationRate: 82.3,
      costSavings: 45000
    },
    staffing: {
      nurses: {
        current: 24,
        recommended: 22,
        optimal: 20,
        costImpact: -15000
      },
      physicians: {
        current: 8,
        recommended: 9,
        optimal: 8,
        costImpact: 0
      },
      support: {
        current: 15,
        recommended: 18,
        optimal: 16,
        costImpact: 8000
      }
    },
    equipment: {
      utilization: {
        'ventilators': 65,
        'monitors': 78,
        'infusion_pumps': 82,
        'defibrillators': 45
      },
      recommendations: [
        'Redistribute 3 ventilators to ICU from general wards',
        'Schedule preventive maintenance for 2 cardiac monitors',
        'Procure 5 additional infusion pumps for peak hours'
      ],
      efficiency: 71.5
    },
    scheduling: {
      optimizationScore: 87.3,
      bottleneckHours: ['14:00-16:00', '18:00-20:00'],
      recommendations: [
        'Shift 2 nurses from night shift to afternoon bottleneck',
        'Schedule elective procedures during low-demand hours',
        'Implement appointment clustering for similar procedures'
      ]
    }
  };

  const mockMetrics: OptimizationMetrics = {
    overallEfficiency: 78.5,
    resourceWaste: 21.5,
    costSavings: 125000,
    patientSatisfaction: 4.2,
    waitTimeReduction: 35
  };

  useEffect(() => {
    // Load optimization metrics on component mount
    setMetrics(mockMetrics);
  }, []);

  const handleOptimizeResources = async () => {
    try {
      // In production, this would call the actual AI service
      // const result = await optimizeResourceUtilization({
      //   department: selectedDepartment,
      //   timeframe,
      //   currentPatients: patients?.length || 0,
      //   currentAppointments: appointments?.length || 0
      // });
      setOptimization(mockOptimization);
      toast.success('Resource optimization analysis completed');
    } catch (error) {
      toast.error('Failed to generate optimization analysis');
      console.error('Optimization error:', error);
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return 'text-green-600';
    if (efficiency >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'text-green-600';
    if (utilization >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!permissions.includes('resource-utilization-optimization')) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to access resource utilization optimization features.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Resource Utilization Optimization</h2>
          <p className="text-muted-foreground">
            AI-powered optimization of hospital resources for maximum efficiency and cost savings
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          AI-Optimized
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bed-management">Bed Management</TabsTrigger>
          <TabsTrigger value="staffing">Staffing</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Resource Optimization Analysis
              </CardTitle>
              <CardDescription>
                Generate AI-powered optimization recommendations for hospital resources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emergency">Emergency Department</SelectItem>
                      <SelectItem value="icu">Intensive Care Unit</SelectItem>
                      <SelectItem value="surgery">Surgical Ward</SelectItem>
                      <SelectItem value="medicine">Medical Ward</SelectItem>
                      <SelectItem value="pediatrics">Pediatrics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeframe">Time Frame</Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeframe..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">Next 24 Hours</SelectItem>
                      <SelectItem value="7d">Next 7 Days</SelectItem>
                      <SelectItem value="30d">Next 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleOptimizeResources}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Analyzing...' : 'Optimize Resources'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Overall Efficiency</p>
                      <p className={`text-2xl font-bold ${getEfficiencyColor(metrics.overallEfficiency)}`}>
                        {metrics.overallEfficiency.toFixed(1)}%
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Resource Waste</p>
                      <p className="text-2xl font-bold text-red-600">
                        {metrics.resourceWaste.toFixed(1)}%
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Annual Savings</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${metrics.costSavings.toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Wait Time Reduction</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {metrics.waitTimeReduction}%
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {optimization && (
            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
                <CardDescription>
                  AI-generated recommendations for resource optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Scheduling Optimization</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Optimization Score</span>
                          <span className="font-semibold text-green-600">
                            {optimization.scheduling.optimizationScore.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={optimization.scheduling.optimizationScore} />
                      </div>
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground mb-2">Bottleneck Hours:</p>
                        <div className="flex flex-wrap gap-2">
                          {optimization.scheduling.bottleneckHours.map((hour, idx) => (
                            <Badge key={`bottleneck-${idx}`} variant="destructive">{hour}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Key Recommendations</h4>
                      <ul className="space-y-2">
                        {optimization.scheduling.recommendations.slice(0, 3).map((rec, idx) => (
                          <li key={`rec-${idx}`} className="flex items-start gap-2 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bed-management" className="space-y-6">
          {optimization && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bed className="h-5 w-5" />
                    Bed Utilization Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Current Occupancy</span>
                      <span className="font-semibold">{optimization.beds.currentOccupancy}%</span>
                    </div>
                    <Progress value={optimization.beds.currentOccupancy} />

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Optimal Occupancy</span>
                      <span className="font-semibold text-green-600">{optimization.beds.optimalOccupancy}%</span>
                    </div>
                    <Progress value={optimization.beds.optimalOccupancy} className="bg-green-100" />

                    <div className="pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Recommended Capacity</span>
                        <span className="font-semibold">{optimization.beds.recommendedCapacity} beds</span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span>Utilization Rate</span>
                        <span className={`font-semibold ${getUtilizationColor(optimization.beds.utilizationRate)}`}>
                          {optimization.beds.utilizationRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span>Annual Cost Savings</span>
                        <span className="font-semibold text-green-600">
                          ${optimization.beds.costSavings.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bed Management Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Capacity Optimization</p>
                      <p className="text-sm text-blue-600">
                        Increase bed capacity by 15% during peak hours to reduce patient wait times
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-800">Discharge Planning</p>
                      <p className="text-sm text-green-600">
                        Implement early discharge protocols to free up beds for incoming patients
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">Transfer Optimization</p>
                      <p className="text-sm text-yellow-600">
                        Optimize inter-departmental transfers to balance bed utilization across wards
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="staffing" className="space-y-6">
          {optimization && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Nursing Staff
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Current</span>
                      <span className="font-semibold">{optimization.staffing.nurses.current}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Recommended</span>
                      <span className="font-semibold text-blue-600">{optimization.staffing.nurses.recommended}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Optimal</span>
                      <span className="font-semibold text-green-600">{optimization.staffing.nurses.optimal}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Cost Impact</span>
                        <span className={`font-semibold ${optimization.staffing.nurses.costImpact < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${optimization.staffing.nurses.costImpact.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Physicians
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Current</span>
                      <span className="font-semibold">{optimization.staffing.physicians.current}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Recommended</span>
                      <span className="font-semibold text-blue-600">{optimization.staffing.physicians.recommended}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Optimal</span>
                      <span className="font-semibold text-green-600">{optimization.staffing.physicians.optimal}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Cost Impact</span>
                        <span className={`font-semibold ${optimization.staffing.physicians.costImpact < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${optimization.staffing.physicians.costImpact.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Support Staff
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Current</span>
                      <span className="font-semibold">{optimization.staffing.support.current}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Recommended</span>
                      <span className="font-semibold text-blue-600">{optimization.staffing.support.recommended}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Optimal</span>
                      <span className="font-semibold text-green-600">{optimization.staffing.support.optimal}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Cost Impact</span>
                        <span className={`font-semibold ${optimization.staffing.support.costImpact < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${optimization.staffing.support.costImpact.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="equipment" className="space-y-6">
          {optimization && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Equipment Utilization</CardTitle>
                  <CardDescription>
                    Current utilization rates for critical medical equipment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(optimization.equipment.utilization).map(([equipment, utilization], idx) => (
                      <div key={`equip-${idx}`} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{equipment.replace('_', ' ')}</span>
                          <span className={`font-semibold ${getUtilizationColor(utilization)}`}>
                            {utilization.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={utilization} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Equipment Optimization</CardTitle>
                  <CardDescription>
                    AI recommendations for equipment utilization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium">Overall Efficiency</span>
                      <span className={`font-semibold ${getEfficiencyColor(optimization.equipment.efficiency)}`}>
                        {optimization.equipment.efficiency.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={optimization.equipment.efficiency} />

                    <div className="pt-4">
                      <h4 className="font-semibold mb-3">Recommendations</h4>
                      <ul className="space-y-2">
                        {optimization.equipment.recommendations.map((rec, idx) => (
                          <li key={`equip-rec-${idx}`} className="flex items-start gap-2 text-sm">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};