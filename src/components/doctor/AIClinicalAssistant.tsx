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
          name: 'Hypertension',
          confidence: 0.85,
          icd10Code: 'I10',
          supportingFactors: ['Elevated BP readings', 'Family history', 'Age factor']
        },
        {
          name: 'Type 2 Diabetes',
          confidence: 0.72,
          icd10Code: 'E11.9',
          supportingFactors: ['Polyuria', 'Polydipsia', 'Weight loss']
        },
        {
          name: 'Anxiety Disorder',
          confidence: 0.45,
          icd10Code: 'F41.9',
          supportingFactors: ['Palpitations', 'Sleep disturbance', 'Stress factors']
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
              {suggestions.map((suggestion, idx) => (
                <div key={`diagnosis-${suggestion.icd10Code}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{suggestion.name}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={getConfidenceColor(suggestion.confidence)}>
                        {(suggestion.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                      <Badge variant="outline">{suggestion.icd10Code}</Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <h5 className="text-sm font-medium mb-1">Supporting Factors</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {suggestion.supportingFactors.map((evidence) => (
                          <li key={`evidence-${suggestion.icd10Code}-${evidence}`} className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-2 text-green-500" />
                            {evidence}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium mb-1">Recommended Tests</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {suggestion.supportingFactors.map((test) => (
                          <li key={`test-${suggestion.icd10Code}-${test}`} className="flex items-center">
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
