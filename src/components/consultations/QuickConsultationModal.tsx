import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Stethoscope, Pill, FlaskConical, Send, Loader2 } from 'lucide-react';
import { ICD10Autocomplete } from './ICD10Autocomplete';
import { CPTCodeMapper } from './CPTCodeMapper';
import { ICD10Code, StructuredDiagnosis } from '@/types/icd10';
import { useUpdateConsultation } from '@/hooks/useConsultations';
import { useCreatePrescription } from '@/hooks/usePrescriptions';
import { useWorkflowNotifications } from '@/hooks/useWorkflowNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const updateConsultation = useUpdateConsultation();
  const createPrescription = useCreatePrescription();
  const { notifyPrescriptionCreated, notifyLabOrderCreated, notifyConsultationComplete } = useWorkflowNotifications();

  const handleAddDiagnosis = (code: ICD10Code) => {
    setDiagnosis({
      id: crypto.randomUUID(),
      icd_code: code.code,
      description: code.short_description,
      type: 'primary',
      added_at: new Date().toISOString(),
    });
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
        diagnoses: [diagnosis],
        cpt_codes: cptCodes,
        prescriptions,
        lab_orders: labOrders,
        clinical_notes: notes,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

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
        await notifyPrescriptionCreated(consultation.patient_id, patientName, prescriptionResult.id);
      }

      // Handle lab orders
      if (labOrders.length > 0 && notifyLab) {
        for (const order of labOrders) {
          const { data: labOrder } = await supabase
            .from('lab_orders')
            .insert({
              hospital_id: consultation.hospital_id,
              patient_id: consultation.patient_id,
              consultation_id: consultation.id,
              ordered_by: consultation.doctor_id,
              test_name: order.test,
              priority: order.priority || 'routine',
              status: 'pending',
              notes,
            })
            .select()
            .single();

          await notifyLabOrderCreated(consultation.patient_id, patientName, order.test, labOrder.id, order.priority || 'routine');
        }
      }

      await notifyConsultationComplete(consultation.patient_id, patientName, consultation.id);
      
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
              <CardContent>
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="notify-pharmacy"
                    checked={notifyPharmacy}
                    onCheckedChange={setNotifyPharmacy}
                  />
                  <label htmlFor="notify-pharmacy" className="text-sm">
                    Send to Pharmacy
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {prescriptions.length} prescription(s) added
                </p>
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
              <CardContent>
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="notify-lab"
                    checked={notifyLab}
                    onCheckedChange={setNotifyLab}
                  />
                  <label htmlFor="notify-lab" className="text-sm">
                    Send to Lab
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {labOrders.length} lab order(s) added
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Clinical Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Clinical Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brief clinical notes..."
                className="min-h-20"
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