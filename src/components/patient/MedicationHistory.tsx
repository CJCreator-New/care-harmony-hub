import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pill, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Medication {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'discontinued';
  prescribed_by: string;
  instructions?: string;
  refills_remaining?: number;
}

interface MedicationHistoryProps {
  medications: Medication[];
}

const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'default' as const, icon: Clock },
  completed: { label: 'Completed', variant: 'secondary' as const, icon: CheckCircle },
  discontinued: { label: 'Discontinued', variant: 'destructive' as const, icon: XCircle },
};

export function MedicationHistory({ medications }: MedicationHistoryProps) {
  const activeMeds = medications?.filter(m => m.status === 'active') || [];
  const pastMeds = medications?.filter(m => m.status !== 'active') || [];

  return (
    <div className="space-y-6">
      {/* Active Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Current Medications
          </CardTitle>
          <CardDescription>
            {activeMeds.length} active {activeMeds.length === 1 ? 'medication' : 'medications'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeMeds.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No active medications
            </p>
          ) : (
            <div className="space-y-3">
              {activeMeds.map((med) => {
                const StatusIcon = STATUS_CONFIG[med.status].icon;
                return (
                  <div key={med.id} className="p-4 border rounded-lg bg-primary/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{med.medication_name}</h4>
                        <p className="text-sm text-muted-foreground">{med.dosage}</p>
                      </div>
                      <Badge variant={STATUS_CONFIG[med.status].variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_CONFIG[med.status].label}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Frequency:</span> {med.frequency}
                      </p>
                      <p>
                        <span className="font-medium">Started:</span>{' '}
                        {format(new Date(med.start_date), 'MMM d, yyyy')}
                      </p>
                      <p>
                        <span className="font-medium">Prescribed by:</span> {med.prescribed_by}
                      </p>
                      {med.refills_remaining !== undefined && (
                        <p>
                          <span className="font-medium">Refills remaining:</span>{' '}
                          <span className={med.refills_remaining === 0 ? 'text-red-600 font-semibold' : ''}>
                            {med.refills_remaining}
                          </span>
                        </p>
                      )}
                    </div>

                    {med.instructions && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm">
                        <p className="font-medium mb-1">Instructions:</p>
                        <p className="text-muted-foreground">{med.instructions}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Medications */}
      {pastMeds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Medication History
            </CardTitle>
            <CardDescription>
              Previous medications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastMeds.map((med) => {
                const StatusIcon = STATUS_CONFIG[med.status].icon;
                return (
                  <div key={med.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{med.medication_name}</h4>
                        <p className="text-sm text-muted-foreground">{med.dosage}</p>
                      </div>
                      <Badge variant={STATUS_CONFIG[med.status].variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_CONFIG[med.status].label}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        {format(new Date(med.start_date), 'MMM d, yyyy')} -{' '}
                        {med.end_date ? format(new Date(med.end_date), 'MMM d, yyyy') : 'Present'}
                      </p>
                      <p>Prescribed by: {med.prescribed_by}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
