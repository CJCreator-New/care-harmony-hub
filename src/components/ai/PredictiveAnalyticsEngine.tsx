import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  Users,
  BarChart3,
  Target,
  Shield,
  Calculator,
  Clock
} from 'lucide-react';
import { useAI } from '@/hooks/useAI';
import { useToast } from '@/hooks/use-toast';

interface ReadmissionRisk {
  patientId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedReadmissionDate: string;
  confidence: number;
  factors: {
    name: string;
    impact: number;
    description: string;
  }[];
  interventions: {
    type: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: number;
  }[];
  modelMetrics: {
    auc: number;
    accuracy: number;
    precision: number;
    recall: number;
  };
}

interface PatientData {
  id: string;
  age: number;
  gender: string;
  diagnosis: string[];
  comorbidities: string[];
  previousAdmissions: number;
  lengthOfStay: number;
  dischargeDate: string;
  medications: string[];
  vitals: {
    bloodPressure: string;
    heartRate: number;
    oxygenSaturation: number;
    temperature: number;
  };
  labResults: Record<string, any>;
  socialFactors: {
    livingSituation: string;
    supportSystem: string;
    transportation: string;
    insurance: string;
  };
}

export default function PredictiveAnalyticsEngine() {
  const { predictReadmissionRisk, isLoading } = useAI({ purpose: 'research' });
  const { toast } = useToast();

  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [readmissionRisk, setReadmissionRisk] = useState<ReadmissionRisk | null>(null);
  const [patientHistory, setPatientHistory] = useState<PatientData[]>([]);
  const [analytics, setAnalytics] = useState({
    totalPatients: 0,
    highRiskPatients: 0,
    predictedReadmissions: 0,
    modelAccuracy: 0
  });

  // Mock patient data for demonstration
  const mockPatients: PatientData[] = [
    {
      id: 'P001',
      age: 68,
      gender: 'female',
      diagnosis: ['Heart Failure', 'Diabetes'],
      comorbidities: ['Hypertension', 'COPD'],
      previousAdmissions: 3,
      lengthOfStay: 7,
      dischargeDate: '2026-01-20',
      medications: ['Lisinopril', 'Metformin', 'Aspirin'],
      vitals: {
        bloodPressure: '140/90',
        heartRate: 88,
        oxygenSaturation: 95,
        temperature: 98.6
      },
      labResults: {
        creatinine: 1.8,
        hemoglobin: 11.2,
        glucose: 180
      },
      socialFactors: {
        livingSituation: 'alone',
        supportSystem: 'limited',
        transportation: 'limited',
        insurance: 'medicare'
      }
    },
    {
      id: 'P002',
      age: 45,
      gender: 'male',
      diagnosis: ['Pneumonia'],
      comorbidities: ['Asthma'],
      previousAdmissions: 1,
      lengthOfStay: 3,
      dischargeDate: '2026-01-25',
      medications: ['Azithromycin', 'Albuterol'],
      vitals: {
        bloodPressure: '120/80',
        heartRate: 72,
        oxygenSaturation: 98,
        temperature: 98.2
      },
      labResults: {
        wbc: 12.5,
        chestXray: 'clear'
      },
      socialFactors: {
        livingSituation: 'with family',
        supportSystem: 'good',
        transportation: 'own vehicle',
        insurance: 'private'
      }
    }
  ];

  useEffect(() => {
    setPatientHistory(mockPatients);
    setAnalytics({
      totalPatients: mockPatients.length,
      highRiskPatients: 1,
      predictedReadmissions: 2,
      modelAccuracy: 87.5
    });
  }, []);

  const handlePredictRisk = async (patient: PatientData) => {
    setSelectedPatient(patient);

    try {
      const result = await predictReadmissionRisk({
        patientData: patient,
        context: '30-day readmission risk prediction with intervention recommendations'
      });

      if (result.success && result.risk) {
        setReadmissionRisk(result.risk);
        toast({
          title: "Risk Assessment Complete",
          description: `Readmission risk calculated for patient ${patient.id}`,
        });
      } else {
        throw new Error(result.error || 'Failed to predict readmission risk');
      }
    } catch (error) {
      console.error('Readmission risk prediction error:', error);
      toast({
        title: "Prediction Failed",
        description: "Failed to calculate readmission risk. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'high': return <TrendingUp className="h-5 w-5 text-orange-600" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Predictive Analytics Engine
          </CardTitle>
          <CardDescription>
            AI-powered patient readmission risk prediction and clinical outcome forecasting
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{analytics.totalPatients}</div>
                <p className="text-xs text-muted-foreground">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{analytics.highRiskPatients}</div>
                <p className="text-xs text-muted-foreground">High Risk Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{analytics.predictedReadmissions}</div>
                <p className="text-xs text-muted-foreground">Predicted Readmissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{analytics.modelAccuracy}%</div>
                <p className="text-xs text-muted-foreground">Model Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Selection and Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Patient Readmission Risk Assessment</CardTitle>
          <CardDescription>
            Select a patient to calculate their 30-day readmission risk using advanced ML models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patientHistory.map((patient) => (
              <Card key={patient.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Patient {patient.id}</h4>
                    <Badge variant="outline">{patient.age}y {patient.gender}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Diagnosis: {patient.diagnosis.join(', ')}</p>
                    <p>Previous Admissions: {patient.previousAdmissions}</p>
                    <p>Discharged: {formatDate(patient.dischargeDate)}</p>
                  </div>
                  <Button
                    onClick={() => handlePredictRisk(patient)}
                    disabled={isLoading}
                    className="w-full mt-3"
                    size="sm"
                  >
                    {isLoading ? 'Calculating...' : 'Assess Risk'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment Results */}
      {readmissionRisk && selectedPatient && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Risk Assessment Results</CardTitle>
                <CardDescription>
                  Patient {selectedPatient.id} - 30-day readmission risk analysis
                </CardDescription>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getRiskColor(readmissionRisk.riskLevel)}`}>
                {getRiskIcon(readmissionRisk.riskLevel)}
                <span className="font-medium capitalize">{readmissionRisk.riskLevel} Risk</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="factors">Risk Factors</TabsTrigger>
                <TabsTrigger value="interventions">Interventions</TabsTrigger>
                <TabsTrigger value="metrics">Model Metrics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                          {readmissionRisk.riskScore}%
                        </div>
                        <p className="text-sm text-muted-foreground">Readmission Risk Score</p>
                        <Progress value={readmissionRisk.riskScore} className="mt-3" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600 mb-2">
                          {formatDate(readmissionRisk.predictedReadmissionDate)}
                        </div>
                        <p className="text-sm text-muted-foreground">Predicted Readmission Date</p>
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-muted-foreground">
                            {Math.ceil((new Date(readmissionRisk.predictedReadmissionDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days from now
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Patient Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Age:</strong> {selectedPatient.age}</p>
                        <p><strong>Gender:</strong> {selectedPatient.gender}</p>
                        <p><strong>Diagnosis:</strong> {selectedPatient.diagnosis.join(', ')}</p>
                        <p><strong>Previous Admissions:</strong> {selectedPatient.previousAdmissions}</p>
                      </div>
                      <div>
                        <p><strong>Length of Stay:</strong> {selectedPatient.lengthOfStay} days</p>
                        <p><strong>Medications:</strong> {selectedPatient.medications.join(', ')}</p>
                        <p><strong>Support System:</strong> {selectedPatient.socialFactors.supportSystem}</p>
                        <p><strong>Model Confidence:</strong> {readmissionRisk.confidence}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="factors" className="space-y-4">
                <div className="space-y-3">
                  {readmissionRisk.factors.map((factor, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{factor.name}</h4>
                            <p className="text-sm text-muted-foreground">{factor.description}</p>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${factor.impact > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {factor.impact > 0 ? '+' : ''}{factor.impact}%
                            </div>
                            <p className="text-xs text-muted-foreground">Risk Impact</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="interventions" className="space-y-4">
                <div className="space-y-3">
                  {readmissionRisk.interventions.map((intervention, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{intervention.type}</h4>
                              <Badge variant={intervention.priority === 'high' ? 'destructive' : intervention.priority === 'medium' ? 'default' : 'secondary'}>
                                {intervention.priority} priority
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{intervention.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-bold text-green-600">
                              -{intervention.expectedImpact}%
                            </div>
                            <p className="text-xs text-muted-foreground">Risk Reduction</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="metrics" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{readmissionRisk.modelMetrics.auc.toFixed(3)}</div>
                        <p className="text-xs text-muted-foreground">AUC Score</p>
                        <Progress value={readmissionRisk.modelMetrics.auc * 100} className="mt-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{readmissionRisk.modelMetrics.accuracy.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                        <Progress value={readmissionRisk.modelMetrics.accuracy} className="mt-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{readmissionRisk.modelMetrics.precision.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Precision</p>
                        <Progress value={readmissionRisk.modelMetrics.precision} className="mt-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{readmissionRisk.modelMetrics.recall.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Recall</p>
                        <Progress value={readmissionRisk.modelMetrics.recall} className="mt-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Clinical Decision Support Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Advanced Predictive Analytics</AlertTitle>
        <AlertDescription>
          Readmission risk predictions use machine learning models trained on clinical data.
          All predictions should be used as decision support tools alongside clinical judgment.
          Regular model validation and updates ensure accuracy and reliability.
        </AlertDescription>
      </Alert>
    </div>
  );
}