import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAIClinicalSupport } from '@/hooks/useAIClinicalSupport';
import { useAIClinicalSuggestions } from '@/hooks/useAIClinicalSuggestions';
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

  const { aiInsights, riskLevels, treatmentGuidelines, isLoading } = useAIClinicalSuggestions(selectedPatient || undefined);

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
            {riskLevels.map((risk, idx) => (
              <div key={`risk-${idx}`} className="text-center p-4 border rounded-lg">
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
            {aiInsights.map((insight, idx) => {
              const getIcon = (type: string) => {
                switch (type) {
                  case 'drug_interaction':
                    return <Pill className="h-5 w-5 text-red-500" />;
                  case 'clinical_guideline':
                    return <Target className="h-5 w-5 text-yellow-500" />;
                  case 'risk_assessment':
                    return <CheckCircle className="h-5 w-5 text-green-500" />;
                  default:
                    return <AlertTriangle className="h-5 w-5 text-gray-500" />;
                }
              };

              const getDisplayType = (type: string) => {
                switch (type) {
                  case 'drug_interaction':
                    return 'Drug Interaction Alert';
                  case 'clinical_guideline':
                    return 'Clinical Guideline';
                  case 'risk_assessment':
                    return 'Risk Assessment';
                  default:
                    return type;
                }
              };

              return (
                <div key={`insight-${idx}`} className="flex items-start space-x-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{getDisplayType(insight.type)}</h4>
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
              );
            })}
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
            {treatmentGuidelines.map((guideline, idx) => (
              <div key={`guideline-${idx}`}>
                <h4 className="font-medium mb-3">{guideline.condition}</h4>
                <ul className="space-y-2 text-sm">
                  {guideline.recommendations.map((rec, recIdx) => (
                    <li key={`rec-${idx}-${recIdx}`} className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}