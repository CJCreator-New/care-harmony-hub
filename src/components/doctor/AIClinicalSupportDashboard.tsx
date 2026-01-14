import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAIClinicalSupport } from '@/hooks/useAIClinicalSupport';
import { 
  Brain, AlertTriangle, CheckCircle, 
  Activity, Pill, Target, TrendingUp 
} from 'lucide-react';
import { useState } from 'react';

export function AIClinicalSupportDashboard() {
  const { 
    generateDifferentialDiagnosis, 
    isGeneratingDiagnosis,
    predictPatientRisk,
    isPredictingRisk,
    autoCodeEncounter,
    isCoding
  } = useAIClinicalSupport();

  const [selectedPatient, setSelectedPatient] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);

  const handleSymptomAnalysis = () => {
    if (symptoms.length === 0) return;
    
    generateDifferentialDiagnosis({
      symptoms,
      patientHistory: 'hypertension',
      vitals: {
        blood_pressure_systolic: 140,
        blood_pressure_diastolic: 90,
        heart_rate: 80,
        temperature: 37.2,
        oxygen_saturation: 98
      }
    });
  };

  const riskLevels = [
    { type: 'Cardiovascular', level: 'high', score: 0.85, color: 'bg-red-100 text-red-800' },
    { type: 'Diabetes', level: 'medium', score: 0.45, color: 'bg-yellow-100 text-yellow-800' },
    { type: 'Fall Risk', level: 'low', score: 0.25, color: 'bg-green-100 text-green-800' },
    { type: 'Readmission', level: 'medium', score: 0.55, color: 'bg-yellow-100 text-yellow-800' },
  ];

  const aiInsights = [
    {
      type: 'Drug Interaction Alert',
      severity: 'high',
      message: 'Warfarin + Aspirin: Increased bleeding risk detected',
      recommendation: 'Monitor INR closely, consider alternative anticoagulation',
      icon: <Pill className="h-5 w-5 text-red-500" />
    },
    {
      type: 'Clinical Guideline',
      severity: 'medium',
      message: 'Patient meets criteria for diabetes screening',
      recommendation: 'Order HbA1c and fasting glucose tests',
      icon: <Target className="h-5 w-5 text-yellow-500" />
    },
    {
      type: 'Risk Assessment',
      severity: 'low',
      message: 'Low fall risk based on current medications and age',
      recommendation: 'Continue current safety measures',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold flex items-center">
          <Brain className="h-8 w-8 mr-3 text-blue-600" />
          AI Clinical Decision Support
        </h2>
        <Badge variant="secondary">Beta</Badge>
      </div>

      {/* Quick Analysis Panel */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Symptom Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Patient Symptoms</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['chest_pain', 'shortness_of_breath', 'fever', 'headache', 'nausea'].map(symptom => (
                  <Button
                    key={symptom}
                    size="sm"
                    variant={symptoms.includes(symptom) ? "default" : "outline"}
                    onClick={() => {
                      setSymptoms(prev => 
                        prev.includes(symptom) 
                          ? prev.filter(s => s !== symptom)
                          : [...prev, symptom]
                      );
                    }}
                  >
                    {symptom.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleSymptomAnalysis}
              disabled={symptoms.length === 0 || isGeneratingDiagnosis}
              className="w-full"
            >
              {isGeneratingDiagnosis ? 'Analyzing...' : 'Analyze Symptoms'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {riskLevels.map((risk, index) => (
              <div key={index} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold mb-2">{Math.round(risk.score * 100)}%</div>
                <div className="text-sm font-medium mb-2">{risk.type}</div>
                <Badge className={risk.color}>{risk.level}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI Clinical Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {aiInsights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  {insight.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{insight.type}</h4>
                    <Badge 
                      className={
                        insight.severity === 'high' ? 'bg-red-100 text-red-800' :
                        insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }
                    >
                      {insight.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{insight.message}</p>
                  <p className="text-sm font-medium text-blue-600">{insight.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Treatment Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Evidence-Based Treatment Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Hypertension Management</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  First-line: ACE inhibitors or ARBs
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Target BP: &lt; 130/80 mmHg
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Lifestyle modifications essential
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Diabetes Type 2</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  First-line: Metformin + lifestyle
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Target HbA1c: &lt; 7%
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Annual screening for complications
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}