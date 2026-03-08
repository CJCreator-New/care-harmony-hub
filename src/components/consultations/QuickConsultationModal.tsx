import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stethoscope, Pill, FlaskConical, Send, Loader2, Mic } from 'lucide-react';
import { ICD10Autocomplete } from './ICD10Autocomplete';
import { CPTCodeMapper } from './CPTCodeMapper';
import { ICD10Code, StructuredDiagnosis } from '@/types/icd10';
import { useUpdateConsultation } from '@/hooks/useConsultations';
import { useCreatePrescription } from '@/hooks/usePrescriptions';
import { useCreateLabOrder } from '@/hooks/useLabOrders';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import { mapToCanonicalLabPriority, mapToWorkflowPriority } from '@/utils/labPriority';
import { toast } from 'sonner';
import { VoiceDocumentation } from '../doctor/VoiceDocumentation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface QuickConsultationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultation: any;
}

export function QuickConsultationModal({ open, onOpenChange, consultation }: QuickConsultationModalProps) {
  const [diagnosis, setDiagnosis] = useState<StructuredDiagnosis | null>(null);
  const [cptCodes, setCptCodes] = useState<string[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [notifyPharmacy, setNotifyPharmacy] = useState(false);
  const [notifyLab, setNotifyLab] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [newRx, setNewRx] = useState({ medication: '', dosage: '', frequency: '' });
  const [newLabOrder, setNewLabOrder] = useState({ test: '', priority: 'routine' });

  const updateConsultation = useUpdateConsultation();
  const createPrescription = useCreatePrescription();
  const createLabOrder = useCreateLabOrder();
  const { triggerWorkflow } = useWorkflowOrchestrator();

  const handleAddDiagnosis = (code: ICD10Code) => {
    setDiagnosis({
      id: crypto.randomUUID(),
      icd_code: code.code,
      description: code.short_description,
      type: 'primary',
      added_at: new Date().toISOString(),
    });
  };

  const handleAddRx = () => {
    if (!newRx.medication) return;
    setPrescriptions(prev => [...prev, { ...newRx }]);
    setNewRx({ medication: '', dosage: '', frequency: '' });
  };

  const handleAddLabOrder = () => {
    if (!newLabOrder.test) return;
    setLabOrders(prev => [...prev, { ...newLabOrder }]);
    setNewLabOrder({ test: '', priority: 'routine' });
  };

  const handleComplete = async () => {
    if (!diagnosis) {
      toast.error('Please add a diagnosis');
      return;
    }

    setIsCompleting(true);
    try {
      // Update consultation with minimal data
      await updateConsultation.mutateAsync({
        id: consultation.id,
        clinical_notes: notes,
        status: 'completed',
        completed_at: new Date().toISOString(),
      } as any);

      const patientName = `${consultation.patient?.first_name} ${consultation.patient?.last_name}`;

      // Handle prescriptions
      if (prescriptions.length > 0 && notifyPharmacy) {
        const prescriptionResult = await createPrescription.mutateAsync({
          patientId: consultation.patient_id,
          consultationId: consultation.id,
          items: prescriptions.map((rx: any) => ({
            medication_name: rx.medication,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            instructions: rx.instructions,
          })),
          notes,
        });
        await triggerWorkflow({
          type: WORKFLOW_EVENT_TYPES.PRESCRIPTION_CREATED,
          patientId: consultation.patient_id,
          data: {
            patientName,
            prescriptionId: prescriptionResult.id,
            medicationCount: prescriptions.length,
          },
        });
      }

      // Handle lab orders
      if (labOrders.length > 0 && notifyLab) {
        for (const order of labOrders) {
          // Use createLabOrder so the durable lab_queue entry is also created
          const labOrder = await createLabOrder.mutateAsync({
              hospital_id: consultation.hospital_id,
              patient_id: consultation.patient_id,
              consultation_id: consultation.id,
              ordered_by: consultation.doctor_id,
              test_name: order.test,
              priority: mapToCanonicalLabPriority(order.priority) as any,
              status: 'pending',
              notes,
            });

          await triggerWorkflow({
            type: WORKFLOW_EVENT_TYPES.LAB_ORDER_CREATED,
            patientId: consultation.patient_id,
            priority: mapToWorkflowPriority(order.priority),
            data: {
              patientName,
              testName: order.test,
              labOrderId: labOrder.id,
              priority: mapToCanonicalLabPriority(order.priority),
            },
          });
        }
      }

      await triggerWorkflow({
        type: WORKFLOW_EVENT_TYPES.CONSULTATION_COMPLETED,
        patientId: consultation.patient_id,
        data: {
          patientName,
          consultationId: consultation.id,
          diagnosisCode: diagnosis.icd_code,
          prescriptionCount: prescriptions.length,
          labOrderCount: labOrders.length,
        },
      });
      
      toast.success('Consultation completed successfully!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to complete consultation');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Quick Consultation - {consultation?.patient?.first_name} {consultation?.patient?.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Diagnosis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Primary Diagnosis</CardTitle>
            </CardHeader>
            <CardContent>
              {diagnosis ? (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{diagnosis.icd_code}</Badge>
                      <Badge className="bg-primary/10 text-primary">Primary</Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">{diagnosis.description}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDiagnosis(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <ICD10Autocomplete
                  onSelect={handleAddDiagnosis}
                  placeholder="Search for primary diagnosis..."
                />
              )}
            </CardContent>
          </Card>

          {/* CPT Codes */}
          {diagnosis && (
            <CPTCodeMapper
              selectedCodes={cptCodes}
              onChange={setCptCodes}
              diagnosisCode={diagnosis.icd_code}
            />
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prescriptions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Prescriptions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  <Input
                    value={newRx.medication}
                    onChange={(e) => setNewRx(prev => ({ ...prev, medication: e.target.value }))}
                    placeholder="Medication"
                    className="text-xs h-8"
                  />
                  <Input
                    value={newRx.dosage}
                    onChange={(e) => setNewRx(prev => ({ ...prev, dosage: e.target.value }))}
                    placeholder="Dosage"
                    className="text-xs h-8"
                  />
                  <Input
                    value={newRx.frequency}
                    onChange={(e) => setNewRx(prev => ({ ...prev, frequency: e.target.value }))}
                    placeholder="Frequency"
                    className="text-xs h-8"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-8"
                  onClick={handleAddRx}
                  disabled={!newRx.medication}
                >
                  + Add Prescription
                </Button>
                {prescriptions.map((rx: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                    <span className="truncate">{rx.medication} — {rx.dosage} {rx.frequency}</span>
                    <Button size="sm" variant="ghost" className="h-5 px-1 shrink-0" onClick={() => setPrescriptions(prev => prev.filter((_, idx) => idx !== i))}>×</Button>
                  </div>
                ))}
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="notify-pharmacy"
                    checked={notifyPharmacy}
                    onCheckedChange={(checked) => setNotifyPharmacy(checked === true)}
                  />
                  <label htmlFor="notify-pharmacy" className="text-xs">
                    Send to Pharmacy
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Lab Orders */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Lab Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <Input
                    value={newLabOrder.test}
                    onChange={(e) => setNewLabOrder(prev => ({ ...prev, test: e.target.value }))}
                    placeholder="Test name"
                    className="text-xs h-8"
                  />
                  <Select value={newLabOrder.priority} onValueChange={(v) => setNewLabOrder(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-8"
                  onClick={handleAddLabOrder}
                  disabled={!newLabOrder.test}
                >
                  + Add Lab Order
                </Button>
                {labOrders.map((order: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                    <span className="truncate">{order.test} ({order.priority})</span>
                    <Button size="sm" variant="ghost" className="h-5 px-1 shrink-0" onClick={() => setLabOrders(prev => prev.filter((_, idx) => idx !== i))}>×</Button>
                  </div>
                ))}
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="notify-lab"
                    checked={notifyLab}
                    onCheckedChange={(checked) => setNotifyLab(checked === true)}
                  />
                  <label htmlFor="notify-lab" className="text-xs">
                    Send to Lab
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Clinical Notes */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Clinical Documentation</CardTitle>
              <Badge variant="outline" className="bg-primary/5 text-primary text-[10px] gap-1">
                <Mic className="h-3 w-3" /> Dictation Enabled
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs border border-dashed border-primary/20 hover:bg-primary/5 mb-2">
                    <span className="flex items-center gap-2">
                      <Mic className="h-3.5 w-3.5 text-primary" />
                      Show Voice Dictation Assistant
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">AI Powered</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-4">
                  <VoiceDocumentation 
                    onSave={(voiceNote) => setNotes(prev => prev + (prev ? '\n\n' : '') + voiceNote)} 
                  />
                </CollapsibleContent>
              </Collapsible>

              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brief clinical notes..."
                className="min-h-24"
              />
            </CardContent>
          </Card>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={!diagnosis || isCompleting}>
              {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Consultation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
