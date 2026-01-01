import { AlertTriangle, AlertCircle, XCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AllergyAlert, DrugInteraction } from '@/hooks/usePrescriptionSafety';

interface PrescriptionSafetyAlertsProps {
  allergyAlerts: AllergyAlert[];
  drugInteractions: DrugInteraction[];
  className?: string;
}

const allergySeverityConfig = {
  mild: { icon: Info, variant: 'default' as const, color: 'text-muted-foreground' },
  moderate: { icon: AlertCircle, variant: 'default' as const, color: 'text-warning' },
  severe: { icon: AlertTriangle, variant: 'destructive' as const, color: 'text-destructive' },
  critical: { icon: XCircle, variant: 'destructive' as const, color: 'text-destructive' },
};

const interactionSeverityConfig = {
  minor: { icon: Info, variant: 'default' as const, color: 'text-muted-foreground', label: 'Minor' },
  moderate: { icon: AlertCircle, variant: 'default' as const, color: 'text-warning', label: 'Moderate' },
  major: { icon: AlertTriangle, variant: 'destructive' as const, color: 'text-destructive', label: 'Major' },
  contraindicated: { icon: XCircle, variant: 'destructive' as const, color: 'text-destructive', label: 'Contraindicated' },
};

export function PrescriptionSafetyAlerts({
  allergyAlerts,
  drugInteractions,
  className,
}: PrescriptionSafetyAlertsProps) {
  if (allergyAlerts.length === 0 && drugInteractions.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Allergy Alerts */}
      {allergyAlerts.map((alert, index) => {
        const config = allergySeverityConfig[alert.severity];
        const Icon = config.icon;

        return (
          <Alert key={`allergy-${index}`} variant={config.variant}>
            <Icon className={cn('h-4 w-4', config.color)} />
            <AlertTitle className="flex items-center gap-2">
              Allergy Alert
              <Badge variant={alert.severity === 'severe' || alert.severity === 'critical' ? 'destructive' : 'outline'}>
                {alert.severity.toUpperCase()}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <p className="font-medium">{alert.allergen} → {alert.medication}</p>
              <p className="text-sm mt-1">{alert.message}</p>
            </AlertDescription>
          </Alert>
        );
      })}

      {/* Drug Interaction Alerts */}
      {drugInteractions.map((interaction, index) => {
        const config = interactionSeverityConfig[interaction.severity];
        const Icon = config.icon;

        return (
          <Alert key={`interaction-${index}`} variant={config.variant}>
            <Icon className={cn('h-4 w-4', config.color)} />
            <AlertTitle className="flex items-center gap-2">
              Drug Interaction
              <Badge variant={interaction.severity === 'major' || interaction.severity === 'contraindicated' ? 'destructive' : 'outline'}>
                {config.label}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <p className="font-medium">{interaction.drug1} + {interaction.drug2}</p>
              <p className="text-sm mt-1">{interaction.message}</p>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
