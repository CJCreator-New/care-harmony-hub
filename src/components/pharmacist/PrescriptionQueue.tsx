import { useState } from 'react';
import { usePrescriptions, useDispensePrescription } from '@/hooks/usePrescriptions';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import { PrescriptionDispensingModal } from '@/components/pharmacy/PrescriptionDispensingModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Search, 
  Pill, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreHorizontal,
  Printer,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function PrescriptionQueue() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const { data: prescriptions, isLoading } = usePrescriptions();
  const dispenseMutation = useDispensePrescription();
  const { triggerWorkflow } = useWorkflowOrchestrator();

  const filteredPrescriptions = prescriptions?.filter(p => 
    p.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDispense = async (_safetyData: {
    batchNumber: string;
    patientVerified: boolean;
    safetyChecksComplete: boolean;
    notes: string;
  }) => {
    if (!selectedPrescription) return;
    // Capture before clearing selection
    const prescriptionId = selectedPrescription.id as string;
    const patientId = selectedPrescription.patient_id as string | undefined;
    const firstMedName = selectedPrescription.items?.[0]?.medication_name as string | undefined;

    await dispenseMutation.mutateAsync(prescriptionId);

    // Emit canonical dispense event for downstream patient notification rules.
    if (patientId && firstMedName) {
      await triggerWorkflow({
        type: WORKFLOW_EVENT_TYPES.MEDICATION_DISPENSED,
        patientId,
        data: {
          prescriptionId,
          medicationName: firstMedName,
        },
      });
    }

    setSelectedPrescription(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'verified': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Verified</Badge>;
      case 'dispensed': return <Badge variant="default" className="bg-green-100 text-green-800">Dispensed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by patient or MRN..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescription Queue</CardTitle>
          <CardDescription>Real-time list of prescriptions awaiting processing</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Medications</TableHead>
                <TableHead>Prescribed By</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading prescriptions...
                  </TableCell>
                </TableRow>
              ) : filteredPrescriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No prescriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrescriptions?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.patient?.first_name} {p.patient?.last_name}
                    </TableCell>
                    <TableCell>{p.patient?.mrn}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {p.items?.slice(0, 2).map((item: any) => (
                          <span key={`med-${item.id}`} className="text-xs">
                            • {item.medication_name} ({item.dosage})
                          </span>
                        ))}
                        {p.items && p.items.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            + {p.items.length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>Dr. {p.prescriber?.last_name}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(p.created_at), 'HH:mm')}
                    </TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedPrescription(p)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dispensing Safety-Check Modal */}
      <PrescriptionDispensingModal
        open={!!selectedPrescription}
        onOpenChange={(open) => { if (!open) setSelectedPrescription(null); }}
        prescription={
          selectedPrescription
            ? {
                id: selectedPrescription.id,
                patient_name: `${selectedPrescription.patient?.first_name ?? ''} ${selectedPrescription.patient?.last_name ?? ''}`.trim(),
                patient_mrn: selectedPrescription.patient?.mrn ?? '',
                doctor_name: `Dr. ${selectedPrescription.prescriber?.first_name ?? ''} ${selectedPrescription.prescriber?.last_name ?? ''}`.trim(),
                items: (selectedPrescription.items ?? []).map((item: any) => ({
                  medication_name: item.medication_name,
                  dosage: item.dosage ?? '',
                  frequency: item.frequency ?? '',
                  duration: item.duration ?? '',
                  quantity: item.quantity ?? 0,
                  instructions: item.instructions ?? '',
                })),
                created_at: selectedPrescription.created_at,
              }
            : null
        }
        onDispense={handleDispense}
        isLoading={dispenseMutation.isPending}
      />
    </div>
  );
}
