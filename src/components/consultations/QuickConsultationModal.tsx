import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Stethoscope, Pill, FlaskConical, Send, Loader2, Mic } from 'lucide-react';
import { ICD10Autocomplete } from './ICD10Autocomplete';
import { CPTCodeMapper } from './CPTCodeMapper';
import { ICD10Code, StructuredDiagnosis } from '@/types/icd10';
import { useUpdateConsultation } from '@/hooks/useConsultations';
import { useCreatePrescription } from '@/hooks/usePrescriptions';
import { useWorkflowNotifications } from '@/hooks/useWorkflowNotifications';
import { supabase } from '@/integrations/supabase/client';
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
        diagnosis: [diagnosis],
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
                    onCheckedChange={(checked) => setNotifyPharmacy(checked === true)}
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
                    onCheckedChange={(checked) => setNotifyLab(checked === true)}
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