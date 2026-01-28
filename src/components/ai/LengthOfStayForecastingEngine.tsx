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
import { AlertTriangle, TrendingUp, Clock, Users, Activity, BarChart3, Target, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface LengthOfStayPrediction {
  patientId: string;
  predictedDays: number;
  confidence: number;
  riskFactors: string[];
  recommendations: string[];
  modelMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

interface ForecastingMetrics {
  averageStay: number;
  medianStay: number;
  outlierRate: number;
  predictionAccuracy: number;
  costSavings: number;
}

export const LengthOfStayForecastingEngine: React.FC = () => {
  const { permissions } = usePermissions();
  const { predictLengthOfStay, isLoading } = useAI();

  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [customFactors, setCustomFactors] = useState('');
  const [prediction, setPrediction] = useState<LengthOfStayPrediction | null>(null);
  const [metrics, setMetrics] = useState<ForecastingMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('prediction');

  // Mock data for demonstration - in production this would come from ML models
  const mockMetrics: ForecastingMetrics = {
    averageStay: 5.2,
    medianStay: 4.8,
    outlierRate: 12.5,
    predictionAccuracy: 87.3,
    costSavings: 245000
  };

  const mockPrediction: LengthOfStayPrediction = {
    patientId: selectedPatient,
    predictedDays: 6.8,
    confidence: 0.82,
    riskFactors: [
      'Age > 65 years',
      'Multiple comorbidities',
      'Previous extended stays',
      'Complex surgical procedure'
    ],
    recommendations: [
      'Enhanced post-operative monitoring',
      'Early mobilization protocol',
      'Nutritional assessment and support',
      'Family caregiver education'
    ],
    modelMetrics: {
      accuracy: 0.87,
      precision: 0.84,
      recall: 0.89,
      f1Score: 0.86
    }
  };

  useEffect(() => {
    // Load forecasting metrics on component mount
    setMetrics(mockMetrics);
  }, []);

  const handlePredictStay = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    try {
      const patient = patients?.find(p => p.id === selectedPatient);
      if (!patient) {
        toast.error('Patient not found');
        return;
      }

      const result = await predictLengthOfStay({
        patientData: patient,
        context: customFactors || 'Length of stay forecasting'
      });

      if (result.success && result.data?.forecast) {
        setPrediction(result.data.forecast);
        toast.success('Length of stay prediction completed');
      } else {
        toast.error('Failed to generate prediction');
      }
    } catch (error) {
      toast.error('Failed to generate prediction');
      console.error('Prediction error:', error);
    }
  };

  const getRiskColor = (days: number) => {
    if (days < 3) return 'text-green-600';
    if (days < 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!permissions.includes('predictive-analytics')) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to access length of stay forecasting features.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Length of Stay Forecasting</h2>
          <p className="text-muted-foreground">
            AI-powered prediction of hospital stay duration for optimal resource planning
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          ML-Powered
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prediction">Stay Prediction</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Dashboard</TabsTrigger>
          <TabsTrigger value="optimization">Resource Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="prediction" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Patient Stay Duration Prediction
              </CardTitle>
              <CardDescription>
                Generate AI-powered predictions for individual patient length of stay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient">Select Patient</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients?.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name} - {patient.mrn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="factors">Additional Risk Factors (Optional)</Label>
                  <Textarea
                    id="factors"
                    placeholder="Enter any additional clinical factors..."
                    value={customFactors}
                    onChange={(e) => setCustomFactors(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <Button
                onClick={handlePredictStay}
                disabled={!selectedPatient || isLoading}
                className="w-full"
              >
                {isLoading ? 'Generating Prediction...' : 'Predict Length of Stay'}
              </Button>
            </CardContent>
          </Card>

          {prediction && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Prediction Results
                </CardTitle>
                <CardDescription>
                  AI-generated forecast for patient {prediction.patientId}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className={`text-3xl font-bold ${getRiskColor(prediction.predictedDays)}`}>
                      {prediction.predictedDays.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Predicted Days</div>
                  </div>

                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className={`text-3xl font-bold ${getConfidenceColor(prediction.confidence)}`}>
                      {(prediction.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Confidence Level</div>
                  </div>

                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-3xl font-bold text-blue-600">
                      {prediction.riskFactors.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Risk Factors</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Key Risk Factors
                    </h4>
                    <ul className="space-y-2">
                      {prediction.riskFactors.map((factor, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-orange-500 rounded-full" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-green-500" />
                      Clinical Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {prediction.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Model Performance Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-lg font-bold text-blue-600">
                        {(prediction.modelMetrics.accuracy * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Accuracy</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-lg font-bold text-green-600">
                        {(prediction.modelMetrics.precision * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Precision</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-lg font-bold text-purple-600">
                        {(prediction.modelMetrics.recall * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Recall</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-lg font-bold text-orange-600">
                        {(prediction.modelMetrics.f1Score * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">F1-Score</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Stay</p>
                    <p className="text-2xl font-bold">{metrics?.averageStay.toFixed(1)} days</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Median Stay</p>
                    <p className="text-2xl font-bold">{metrics?.medianStay.toFixed(1)} days</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Prediction Accuracy</p>
                    <p className="text-2xl font-bold text-green-600">{metrics?.predictionAccuracy.toFixed(1)}%</p>
                  </div>
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Annual Savings</p>
                    <p className="text-2xl font-bold text-blue-600">${metrics?.costSavings.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Length of Stay Distribution</CardTitle>
              <CardDescription>
                Historical distribution of patient stay durations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>1-3 days</span>
                  <span>45%</span>
                </div>
                <Progress value={45} className="h-2" />

                <div className="flex items-center justify-between text-sm">
                  <span>4-7 days</span>
                  <span>35%</span>
                </div>
                <Progress value={35} className="h-2" />

                <div className="flex items-center justify-between text-sm">
                  <span>8-14 days</span>
                  <span>15%</span>
                </div>
                <Progress value={15} className="h-2" />

                <div className="flex items-center justify-between text-sm">
                  <span>&gt;14 days</span>
                  <span>5%</span>
                </div>
                <Progress value={5} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Resource Optimization</AlertTitle>
            <AlertDescription>
              Based on current predictions, optimize bed allocation and staffing for the next 7 days.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Bed Utilization Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Current Occupancy</span>
                    <span className="font-semibold">78%</span>
                  </div>
                  <Progress value={78} />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Predicted Peak (Day 3)</span>
                    <span className="font-semibold text-orange-600">92%</span>
                  </div>
                  <Progress value={92} className="bg-orange-100" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Recommended Buffer</span>
                    <span className="font-semibold text-green-600">15 beds</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Staffing Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Nurses (Days)</span>
                    <span className="font-semibold">+2 additional</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Nurses (Nights)</span>
                    <span className="font-semibold">+1 additional</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Physicians</span>
                    <span className="font-semibold">No change</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Support Staff</span>
                    <span className="font-semibold">+3 additional</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};