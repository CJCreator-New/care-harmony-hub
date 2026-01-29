import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Stethoscope, AlertTriangle, CheckCircle } from 'lucide-react';
import { DiagnosisSuggestion } from '@/services/clinicalDecisionSupport';

interface ClinicalAI {
  diagnosisSupport: {
    symptomAnalysis: boolean;
    differentialDiagnosis: string[];
    confidenceScore: number;
    recommendedTests: string[];
  };
  treatmentPlanning: {
    evidenceBasedGuidelines: boolean;
    drugInteractionChecks: boolean;
    allergyAlerts: boolean;
    dosageCalculations: boolean;
  };
}

interface DrugInteraction {
  drugs: string[];
  severity: string;
  mechanism: string;
  recommendation: string;
}

export const AIClinicalAssistant = ({ patientId }: { patientId: string }) => {
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<DiagnosisSuggestion[]>([]);
  const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>([]);

  const analyzeSymptoms = async () => {
    setIsAnalyzing(true);
    
    try {
      // Mock AI analysis - in production, integrate with medical AI service
      const mockSuggestions: DiagnosisSuggestion[] = [
        {
          condition: 'Hypertension',
          probability: 0.85,
          icd10: 'I10',
          evidence: ['Elevated BP readings', 'Family history', 'Age factor'],
          recommendedTests: ['ECG', 'Echocardiogram', 'Blood chemistry']
        },
        {
          condition: 'Type 2 Diabetes',
          probability: 0.72,
          icd10: 'E11.9',
          evidence: ['Polyuria', 'Polydipsia', 'Weight loss'],
          recommendedTests: ['HbA1c', 'Fasting glucose', 'Oral glucose tolerance test']
        },
        {
          condition: 'Anxiety Disorder',
          probability: 0.45,
          icd10: 'F41.9',
          evidence: ['Palpitations', 'Sleep disturbance', 'Stress factors'],
          recommendedTests: ['Thyroid function', 'Cardiac enzymes']
        }
      ];

      setSuggestions(mockSuggestions);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkDrugInteractions = async (medications: string[]) => {
    // Mock drug interaction check
    const interactions = [
      {
        drugs: ['Warfarin', 'Aspirin'],
        severity: 'major',
        mechanism: 'Increased bleeding risk',
        recommendation: 'Monitor INR closely'
      }
    ];
    setDrugInteractions(interactions);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            AI Clinical Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Patient Symptoms & History</label>
            <Textarea
              placeholder="Enter patient symptoms, vital signs, and relevant history..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="mt-1"
              rows={4}
            />
          </div>
          
          <Button 
            onClick={analyzeSymptoms}
            disabled={!symptoms.trim() || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Symptoms'}
          </Button>
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Stethoscope className="w-5 h-5 mr-2" />
              Differential Diagnosis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{suggestion.condition}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={getConfidenceColor(suggestion.probability)}>
                        {(suggestion.probability * 100).toFixed(0)}% confidence
                      </Badge>
                      <Badge variant="outline">{suggestion.icd10}</Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <h5 className="text-sm font-medium mb-1">Supporting Evidence</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {suggestion.evidence.map((evidence, i) => (
                          <li key={i} className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-2 text-green-500" />
                            {evidence}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium mb-1">Recommended Tests</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {suggestion.recommendedTests.map((test, i) => (
                          <li key={i} className="flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-2 text-blue-500" />
                            {test}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Treatment Planning Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <div className="text-sm font-medium">Evidence-Based Guidelines</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            
            <div className="text-center p-3 border rounded-lg">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <div className="text-sm font-medium">Drug Interactions</div>
              <div className="text-xs text-muted-foreground">Monitoring</div>
            </div>
            
            <div className="text-center p-3 border rounded-lg">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <div className="text-sm font-medium">Allergy Alerts</div>
              <div className="text-xs text-muted-foreground">No alerts</div>
            </div>
            
            <div className="text-center p-3 border rounded-lg">
              <Brain className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <div className="text-sm font-medium">Dosage Calculator</div>
              <div className="text-xs text-muted-foreground">Ready</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};