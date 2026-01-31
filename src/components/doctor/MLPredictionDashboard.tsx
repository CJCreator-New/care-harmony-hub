import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle } from 'lucide-react';
import { machineLearningService } from '@/services/machineLearningService';

export const MLPredictionDashboard = ({ patientId, vitals }: any) => {
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runPredictions = async () => {
    setLoading(true);
    const deterioration = await machineLearningService.predictDeterioration(patientId, vitals);
    const readmission = await machineLearningService.assessReadmissionRisk(patientId);
    setPredictions({ deterioration, readmission });
    setLoading(false);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          ML Predictions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runPredictions} disabled={loading} className="w-full">
          {loading ? 'Analyzing...' : 'Run Predictions'}
        </Button>

        {predictions && (
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">Deterioration Risk</span>
                <Badge variant={getRiskColor(predictions.deterioration.risk)}>
                  {predictions.deterioration.risk}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Probability: {(predictions.deterioration.probability * 100).toFixed(0)}%
              </p>
              <div className="space-y-1">
                {predictions.deterioration.recommendations.map((rec: string, idx: number) => (
                  <div key={`rec-${idx}`} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="h-3 w-3 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">Readmission Risk</span>
                <Badge variant={getRiskColor(predictions.readmission.risk)}>
                  {predictions.readmission.risk}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Probability: {(predictions.readmission.probability * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
