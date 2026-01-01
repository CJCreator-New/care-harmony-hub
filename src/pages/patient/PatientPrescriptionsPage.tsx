import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pill, Calendar, User, RefreshCw } from 'lucide-react';
import { usePatientPrescriptions } from '@/hooks/usePatientPortal';
import { usePatientRefillRequests } from '@/hooks/useRefillRequests';
import { RefillRequestModal } from '@/components/prescriptions/RefillRequestModal';
import { format, parseISO } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  dispensed: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const refillStatusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-info/10 text-info border-info/20',
  denied: 'bg-destructive/10 text-destructive border-destructive/20',
  fulfilled: 'bg-success/10 text-success border-success/20',
};

export default function PatientPrescriptionsPage() {
  const { data: prescriptions = [], isLoading } = usePatientPrescriptions();
  const { data: refillRequests = [] } = usePatientRefillRequests();
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);

  const hasPendingRefill = (prescriptionId: string) => {
    return refillRequests.some(
      (r) => r.prescription_id === prescriptionId && r.status === 'pending'
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Prescriptions</h1>
          <p className="text-muted-foreground">View your medication prescriptions and request refills</p>
        </div>

        {/* Pending Refill Requests */}
        {refillRequests.filter((r) => r.status === 'pending').length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader className="pb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Pending Refill Requests
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {refillRequests
                  .filter((r) => r.status === 'pending')
                  .map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                      <div>
                        <p className="font-medium">
                          {request.prescription?.items?.map((i) => i.medication_name).join(', ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Requested {format(parseISO(request.requested_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge className={refillStatusColors[request.status]}>
                        {request.status}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : prescriptions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Pill className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No prescriptions</h3>
              <p className="text-muted-foreground text-center">
                You don't have any prescriptions on record.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((rx) => (
              <Card key={rx.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(parseISO(rx.created_at), 'MMMM d, yyyy')}
                      </div>
                      {rx.prescriber && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          Dr. {rx.prescriber.first_name} {rx.prescriber.last_name}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[rx.status] || statusColors.pending}>
                        {rx.status}
                      </Badge>
                      {rx.status === 'dispensed' && !hasPendingRefill(rx.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPrescription(rx)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Request Refill
                        </Button>
                      )}
                      {hasPendingRefill(rx.id) && (
                        <Badge variant="secondary">Refill Pending</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rx.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Pill className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{item.medication_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.dosage} • {item.frequency} • {item.duration}
                              </p>
                              {item.instructions && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  <span className="font-medium">Instructions:</span> {item.instructions}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {rx.notes && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/30 border-l-4 border-primary">
                      <p className="text-sm">
                        <span className="font-medium">Notes:</span> {rx.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedPrescription && (
        <RefillRequestModal
          open={!!selectedPrescription}
          onOpenChange={(open) => !open && setSelectedPrescription(null)}
          prescription={{
            id: selectedPrescription.id,
            patient_id: selectedPrescription.patient_id,
            hospital_id: selectedPrescription.hospital_id,
            items: selectedPrescription.items,
          }}
        />
      )}
    </DashboardLayout>
  );
}
