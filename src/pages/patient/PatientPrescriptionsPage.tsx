import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Pill, Calendar, User, Clock } from 'lucide-react';
import { usePatientPrescriptions } from '@/hooks/usePatientPortal';
import { format, parseISO } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  dispensed: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function PatientPrescriptionsPage() {
  const { data: prescriptions = [], isLoading } = usePatientPrescriptions();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Prescriptions</h1>
          <p className="text-muted-foreground">View your medication prescriptions</p>
        </div>

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
                    <Badge className={statusColors[rx.status] || statusColors.pending}>
                      {rx.status}
                    </Badge>
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
    </DashboardLayout>
  );
}
