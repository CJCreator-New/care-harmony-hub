import { useState } from 'react';
import { usePrescriptions, useDispensePrescription } from '@/lib/hooks/pharmacy';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import { useAuth } from '@/contexts/AuthContext';
import { useClinicalMetrics } from '@/hooks/useClinicalMetrics';
import { usePrescriptionApprovalWorkflow } from '@/hooks/usePrescriptionApprovalWorkflow';
import { usePermissions } from '@/lib/hooks';
import { PrescriptionDispensingModal } from '@/components/pharmacy/PrescriptionDispensingModal';
import { AmendmentModal } from '@/components/audit/AmendmentModal';
import { Edit } from 'lucide-react';
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
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export function PrescriptionQueue() {
  const { isEnabled } = useFeatureFlags();
  // Feature gate: V2 enhanced pharmacy queue wraps behind pharmacy_flow_v2 flag
  // if (isEnabled('pharmacy_flow_v2')) { /* use enhanced v2 UI */ } else { /* legacy UI */ }
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [amendmentModalOpen, setAmendmentModalOpen] = useState(false);
  const [selectedForAmendment, setSelectedForAmendment] = useState<any>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | undefined>(undefined);
  const { data: prescriptions, isLoading } = usePrescriptions();
  const dispenseMutation = useDispensePrescription();
  const { triggerWorkflow } = useWorkflowOrchestrator();
  const { primaryRole } = useAuth();
  const permissions = usePermissions();
  const { recordOperation, recordCustomEvent, getCorrelation } = useClinicalMetrics();
  const canManagePrescriptions = permissions.can('prescriptions:write');
  
  // Prescription approval workflow integration (new in Priority 6)
  const {
    workflow: approvalWorkflow,
    advanceStep: advanceApprovalStep,
    canApprove,
    canReject,
  } = usePrescriptionApprovalWorkflow(selectedWorkflowId);

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
    const itemCount = selectedPrescription.items?.length || 0;

    // Phase 3B: Record prescription dispensing with telemetry
    await recordOperation(
      {
        operationName: 'dispense_prescription',
        workflowType: 'prescription',
        attributes: {
          'prescription.id': prescriptionId,
          'patient.id': patientId || 'unknown',
          'medication.name': firstMedName || 'unknown',
          'item.count': itemCount,
          'correlation.id': getCorrelation().id,
        },
      },
      async () => {
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
      }
    );

    // Record custom event for analytics
    recordCustomEvent('prescription.dispensed', {
      prescription_id: prescriptionId,
      patient_id: patientId,
      medication_name: firstMedName,
      item_count: itemCount,
    });

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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPrescription(p)}
                        >
                          Details
                        </Button>
                        {permissions.can('consultations:write') && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedForAmendment(p);
                              setAmendmentModalOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Amend
                          </Button>
                        )}
                      </div>
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
        isLoading={dispenseMutation.isPending || !canManagePrescriptions}
      />

      {/* Phase 2B: Amendment Modal */}
      <AmendmentModal
        isOpen={amendmentModalOpen}
        onClose={() => {
          setAmendmentModalOpen(false);
          setSelectedForAmendment(null);
        }}
        prescriptionId={selectedForAmendment?.id || ''}
        items={selectedForAmendment?.items || []}
        patientName={selectedForAmendment?.patient ?
          `${selectedForAmendment.patient.first_name} ${selectedForAmendment.patient.last_name}`
          : 'Patient'
        }
        onAmendmentSuccess={() => {
          toast.success('Amendment submitted for audit');
          setAmendmentModalOpen(false);
          setSelectedForAmendment(null);
        }}
      />
    </div>
  );
}
