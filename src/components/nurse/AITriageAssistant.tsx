import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, AlertCircle, Clock } from 'lucide-react';
import { aiTriageService, AcuityLevel } from '@/services/aiTriageService';

export const AITriageAssistant = ({ patientId, symptoms, vitals }: any) => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    const triageResult = await aiTriageService.analyzeSymptoms(symptoms);
    const acuity = aiTriageService.calculateAcuity(vitals, symptoms);
    setResult({ ...triageResult, finalAcuity: acuity });
    setLoading(false);
  };

  const getAcuityColor = (level: AcuityLevel) => {
    switch (level) {
      case AcuityLevel.CRITICAL: return 'destructive';
      case AcuityLevel.URGENT: return 'default';
      case AcuityLevel.SEMI_URGENT: return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Triage Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runAnalysis} disabled={loading} className="w-full">
          {loading ? 'Analyzing...' : 'Run AI Analysis'}
        </Button>
        
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Acuity Level</span>
              <Badge variant={getAcuityColor(result.finalAcuity)}>
                Level {result.finalAcuity}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>Est. Wait: {result.estimatedWaitTime} min</span>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Recommended Actions:</p>
              {result.recommendedActions.map((action: string) => (
                <div key={action} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
