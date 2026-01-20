import { useState } from 'react';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { useDrugUtilizationReview } from '@/hooks/useDrugUtilizationReview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pill, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function EnhancedPrescriptionQueue() {
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const { data: prescriptions, isLoading } = usePrescriptions(selectedStatus);
  const { checkInteractions } = useDrugUtilizationReview();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      verified: 'default',
      dispensed: 'default',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Prescription Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          {['pending', 'verified', 'dispensed'].map((status) => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading prescriptions...</div>
        ) : !prescriptions || prescriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No {selectedStatus} prescriptions</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {prescriptions.map((rx: any) => (
                <div
                  key={rx.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rx.medication_name}</span>
                        {getStatusBadge(rx.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {rx.dosage} - {rx.frequency} for {rx.duration}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Patient: {rx.patient?.first_name} {rx.patient?.last_name} (MRN: {rx.patient?.mrn})
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Prescribed {formatDistanceToNow(new Date(rx.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <Button size="sm">
                      {rx.status === 'pending' && 'Verify'}
                      {rx.status === 'verified' && 'Dispense'}
                      {rx.status === 'dispensed' && 'View'}
                    </Button>
                  </div>

                  {rx.has_interactions && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Drug interaction detected - Review before dispensing
                      </AlertDescription>
                    </Alert>
                  )}

                  {rx.patient_allergies && rx.patient_allergies.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Patient allergies: {rx.patient_allergies.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
