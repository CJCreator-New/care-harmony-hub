import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DrugInteractionAlertProps {
  interactions: Array<{
    severity: 'high' | 'moderate' | 'low';
    drug1: string;
    drug2: string;
    description: string;
    recommendation: string;
  }>;
  onAcknowledge: () => void;
  onOverride: () => void;
}

export function DrugInteractionAlert({
  interactions,
  onAcknowledge,
  onOverride,
}: DrugInteractionAlertProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'moderate': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const hasHighSeverity = interactions.some(i => i.severity === 'high');

  return (
    <Alert className="border-warning bg-warning/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Drug Interaction Alert</h4>
            <Badge variant={hasHighSeverity ? 'destructive' : 'warning'}>
              {interactions.length} interaction{interactions.length > 1 ? 's' : ''} found
            </Badge>
          </div>

          <div className="space-y-3">
            {interactions.map((interaction, index) => (
              <div key={index} className="border rounded-lg p-3 bg-background">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(interaction.severity)}>
                      {interaction.severity.toUpperCase()}
                    </Badge>
                    <span className="font-medium">
                      {interaction.drug1} + {interaction.drug2}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {interaction.description}
                </p>
                <p className="text-sm font-medium">
                  Recommendation: {interaction.recommendation}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAcknowledge}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Acknowledge & Continue
            </Button>
            {!hasHighSeverity && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOverride}
                className="flex-1"
              >
                Override Alert
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}