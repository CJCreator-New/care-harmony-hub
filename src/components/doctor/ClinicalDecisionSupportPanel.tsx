import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Lightbulb, ShieldAlert } from 'lucide-react';
import {
  clinicalDecisionSupport,
  type DrugInteraction,
  type DiagnosisSuggestion,
} from '@/services/clinicalDecisionSupport';

interface ClinicalDecisionSupportPanelProps {
  medications?: any;
  symptoms?: any;
  vitals?: any;
  patientId?: string;
  hospitalId?: string;
  allergies?: readonly string[];
}

export const ClinicalDecisionSupportPanel = ({
  medications = [],
  symptoms = [],
  vitals,
  patientId,
  hospitalId,
  allergies = [],
}: ClinicalDecisionSupportPanelProps) => {
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [suggestions, setSuggestions] = useState<DiagnosisSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      // Normalize medications if objects passed in (e.g. { name: 'warfarin' } or strings)
      const rawMeds: any[] = Array.isArray(medications) ? medications : [];
      const normalizedMeds: string[] = rawMeds
        .map((m) =>
          typeof m === 'string' ? m : m?.drugName || m?.name || m?.medication_name || ''
        )
        .filter(Boolean);

      const rawSymptoms: any[] = Array.isArray(symptoms) ? symptoms : [];
      const normalizedSymptoms: string[] = rawSymptoms
        .map((s) => (typeof s === 'string' ? s : s?.name || s?.symptom || ''))
        .filter(Boolean);

      const drugInteractions = await clinicalDecisionSupport.checkDrugInteractions(normalizedMeds, {
        patientId,
        hospitalId,
        allergies,
      });
      const diagnosisSuggestions = await clinicalDecisionSupport.suggestDiagnosis(
        normalizedSymptoms,
        vitals
      );

      setInteractions(drugInteractions);
      setSuggestions(diagnosisSuggestions);
      setAnalyzed(true);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'destructive';
      case 'moderate':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const hasSevereFinding = interactions.some((i) => i.severity === 'severe');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Clinical Decision Support (CDS)
          </span>
          <Badge variant="outline" className="text-xs">
            Fail-Closed Engine
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runAnalysis} disabled={loading} className="w-full">
          {loading ? 'Analyzing Clinical Safety...' : 'Check Interactions & Suggestions'}
        </Button>

        {hasSevereFinding && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-900 text-sm">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Severe Interaction / Contraindication Detected</p>
              <p className="text-xs text-red-700 mt-0.5">
                Fail-closed clinical policy requires pharmacist review or documented physician
                override before dispensing.
              </p>
            </div>
          </div>
        )}

        {interactions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Safety & Drug Interactions ({interactions.length})
            </h4>
            {interactions.map((interaction, idx) => (
              <div key={`int-${idx}`} className="p-3 border rounded-lg space-y-1 bg-card">
                <div className="flex items-center justify-between">
                  <Badge variant={getSeverityColor(interaction.severity)}>
                    {interaction.severity.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground">{interaction.description}</p>
                <p className="text-xs text-muted-foreground">{interaction.recommendation}</p>
              </div>
            ))}
          </div>
        )}

        {analyzed && interactions.length === 0 && (
          <div className="p-3 border border-green-200 bg-green-50 rounded-lg text-green-900 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>No contraindications or critical drug interactions identified.</span>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              Differential Diagnosis Suggestions
            </h4>
            {suggestions.map((suggestion, idx) => (
              <div key={`sug-${idx}`} className="p-3 border rounded-lg space-y-1">
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
