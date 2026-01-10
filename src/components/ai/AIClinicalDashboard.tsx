import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAIClinicalSupport } from '@/hooks/useAIClinicalSupport';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';
import { useAutomatedCareCoordination } from '@/hooks/useAutomatedCareCoordination';

interface AIClinicalDashboardProps {
  patientId?: string;
}

export function AIClinicalDashboard({ patientId }: AIClinicalDashboardProps) {
  const [activeTab, setActiveTab] = useState('insights');
  const {
    generateDifferentialDiagnosis,
    isGeneratingDiagnosis,
    predictPatientRisk,
    isPredictingRisk,
    autoCodeEncounter,
    isCoding
  } = useAIClinicalSupport();

  const {
    noShowPredictions,
    staffingOptimization,
    inventoryForecasts,
    generatePredictiveReport,
    isGeneratingReport
  } = usePredictiveAnalytics();

  const {
    careGaps,
    assignCareTeam,
    isAssigningCareTeam,
    scheduleAutomatedFollowUp,
    isSchedulingFollowUp
  } = useAutomatedCareCoordination();

  const handleGenerateDiagnosis = () => {
    generateDifferentialDiagnosis({
      symptoms: ['chest pain', 'shortness of breath'],
      patientHistory: 'Hypertension, diabetes',
      vitals: { bp: '140/90', hr: 85, temp: 98.6 }
    });
  };

  const handleRiskAssessment = () => {
    if (patientId) {
      predictPatientRisk({
        patientId,
        clinicalData: { age: 65, comorbidities: ['diabetes', 'hypertension'] }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Clinical Intelligence
          </h2>
          <p className="text-muted-foreground">
            AI-powered insights and automation for enhanced clinical decision-making
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">Clinical Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="automation">Care Automation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Differential Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleGenerateDiagnosis}
                  disabled={isGeneratingDiagnosis}
                  className="w-full"
                >
                  {isGeneratingDiagnosis ? 'Analyzing...' : 'Generate AI Diagnosis'}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  AI-powered differential diagnosis with confidence scoring
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleRiskAssessment}
                  disabled={isPredictingRisk || !patientId}
                  variant="outline"
                  className="w-full"
                >
                  {isPredictingRisk ? 'Assessing...' : 'Predict Patient Risk'}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  ML-based risk stratification and recommendations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Clinical Coding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => autoCodeEncounter({
                    consultationNotes: 'Patient presents with chest pain...',
                    procedures: ['ECG', 'Blood work']
                  })}
                  disabled={isCoding}
                  variant="outline"
                  className="w-full"
                >
                  {isCoding ? 'Coding...' : 'Auto-Generate Codes'}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Automated ICD-10 and CPT code suggestions
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  No-Show Predictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {noShowPredictions?.map((prediction, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Risk Score</span>
                      <Badge variant={prediction.no_show_probability > 0.7 ? 'destructive' : 'warning'}>
                        {Math.round(prediction.no_show_probability * 100)}%
                      </Badge>
                    </div>
                    <Progress value={prediction.no_show_probability * 100} />
                    <div className="text-xs text-muted-foreground">
                      Factors: {prediction.risk_factors.join(', ')}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staffing Optimization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {staffingOptimization?.map((dept, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{dept.department}</span>
                        <Badge variant={dept.optimization_score > 0.8 ? 'default' : 'secondary'}>
                          {Math.round(dept.optimization_score * 100)}%
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Recommended: {dept.recommended_staff} | Current: {dept.current_staff}
                      </div>
                      <Progress value={dept.optimization_score * 100} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Predictive Analytics Report</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => generatePredictiveReport({
                  reportType: 'comprehensive',
                  dateRange: { start: '2026-01-01', end: '2026-01-31' }
                })}
                disabled={isGeneratingReport}
              >
                {isGeneratingReport ? 'Generating...' : 'Generate Comprehensive Report'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Care Team Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => assignCareTeam({
                    patientId: patientId || 'demo_patient',
                    condition: 'Hypertension',
                    acuity: 'medium'
                  })}
                  disabled={isAssigningCareTeam}
                  className="w-full"
                >
                  {isAssigningCareTeam ? 'Assigning...' : 'Auto-Assign Care Team'}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  AI-optimized care team assignments based on expertise and availability
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Automated Follow-ups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => scheduleAutomatedFollowUp({
                    patientId: patientId || 'demo_patient',
                    followUpType: 'post_discharge',
                    daysFromNow: 7
                  })}
                  disabled={isSchedulingFollowUp}
                  variant="outline"
                  className="w-full"
                >
                  {isSchedulingFollowUp ? 'Scheduling...' : 'Schedule Auto Follow-up'}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Intelligent follow-up scheduling based on care protocols
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Care Gaps Identified</CardTitle>
            </CardHeader>
            <CardContent>
              {careGaps?.length === 0 ? (
                <p className="text-muted-foreground">No care gaps identified</p>
              ) : (
                <div className="space-y-3">
                  {careGaps?.slice(0, 3).map((gap, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{gap.description}</p>
                        <p className="text-sm text-muted-foreground">{gap.recommended_action}</p>
                      </div>
                      <Badge variant={gap.priority === 'high' ? 'destructive' : 'secondary'}>
                        {gap.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">AI Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">92%</div>
                <Progress value={92} className="mt-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  Average across all AI models
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Time Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45min</div>
                <p className="text-sm text-muted-foreground">
                  Average per clinician per day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Automation Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">78%</div>
                <Progress value={78} className="mt-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  Tasks automated successfully
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}