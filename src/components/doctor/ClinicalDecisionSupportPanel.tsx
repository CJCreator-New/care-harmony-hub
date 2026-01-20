import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';
import { clinicalDecisionSupport } from '@/services/clinicalDecisionSupport';

export const ClinicalDecisionSupportPanel = ({ medications, symptoms, vitals }: any) => {
  const [interactions, setInteractions] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    const drugInteractions = await clinicalDecisionSupport.checkDrugInteractions(medications);
    const diagnosisSuggestions = await clinicalDecisionSupport.suggestDiagnosis(symptoms, vitals);
    setInteractions(drugInteractions);
    setSuggestions(diagnosisSuggestions);
    setLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'destructive';
      case 'moderate': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Clinical Decision Support
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runAnalysis} disabled={loading} className="w-full">
          {loading ? 'Analyzing...' : 'Check Interactions & Suggestions'}
        </Button>

        {interactions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Drug Interactions
            </h4>
            {interactions.map((interaction, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-1">
                <Badge variant={getSeverityColor(interaction.severity)}>
                  {interaction.severity}
                </Badge>
                <p className="text-sm">{interaction.description}</p>
                <p className="text-xs text-muted-foreground">{interaction.recommendation}</p>
              </div>
            ))}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Diagnosis Suggestions
            </h4>
            {suggestions.map((suggestion, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{suggestion.name}</span>
                  <Badge variant="outline">{(suggestion.confidence * 100).toFixed(0)}%</Badge>
                </div>
                <p className="text-xs text-muted-foreground">ICD-10: {suggestion.icd10Code}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
