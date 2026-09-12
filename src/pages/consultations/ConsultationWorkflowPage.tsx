// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Stethoscope,
  Pill,
  FileText,
  Send,
  Loader2,
  Keyboard,
  Layers,
  AlertTriangle,
  Activity,
  ShieldCheck,
  PenTool,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { evaluateVitalSigns, type VitalSignsEvaluation } from '@/modules/vital-signs';
import { checkPrescriptionSafety } from '@/hooks/usePrescriptionSafety';
import {
  useConsultation,
  useUpdateConsultation,
  useAdvanceConsultationStep,
  CONSULTATION_STEPS,
} from '@/hooks/useConsultations';
import { useCreatePrescription } from '@/lib/hooks/pharmacy';
import { useCreateLabOrder } from '@/hooks/useLabOrders';
import { useCreateInvoice } from '@/hooks/useBilling';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import { mapToCanonicalLabPriority, mapToWorkflowPriority } from '@/utils/labPriority';
import { ChiefComplaintStep } from '@/components/consultations/steps/ChiefComplaintStep';
import { PhysicalExamStep } from '@/components/consultations/steps/PhysicalExamStep';
import { DiagnosisStepEnhanced } from '@/components/consultations/steps/DiagnosisStepEnhanced';
import { TreatmentPlanStep } from '@/components/consultations/steps/TreatmentPlanStep';
import { SummaryStep } from '@/components/consultations/steps/SummaryStep';
import { PatientSidebar } from '@/components/consultations/PatientSidebar';
import { AIConsultationAssistant } from '@/components/consultations/AIConsultationAssistant';
import {
  ConsultationTemplateSelector,
  ConsultationTemplate,
} from '@/components/consultations/ConsultationTemplateSelector';
import { EnhancedTaskManagement } from '@/components/workflow/EnhancedTaskManagement';
import { usePermissions } from '@/lib/hooks';
import { toast } from 'sonner';

const STEP_ICONS = [User, Stethoscope, Pill, FileText, Send];

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Unknown error';
};

const buildGeneratedConsultationSummaryDescription = (summary: string) => {
  const maxLength = 1500;
  return summary.length > maxLength ? `${summary.slice(0, maxLength)}...` : summary;
};

const normalizeDiagnosisDescriptions = (value: any): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry?.description) return entry.description;
      if (entry?.short_description) return entry.short_description;
      if (entry?.icd_code) return entry.icd_code;
      return null;
    })
    .filter((entry): entry is string => Boolean(entry));
};

const normalizePrescriptionDrafts = (value: any): any[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => ({
    ...item,
    medication_name: item?.medication_name || item?.medication || '',
  }));
};

export default function ConsultationWorkflowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: consultation, isLoading, error } = useConsultation(id);
  const { logActivity } = useActivityLog();
  const updateConsultation = useUpdateConsultation();
  const advanceStep = useAdvanceConsultationStep();
  const createPrescription = useCreatePrescription();
  const createLabOrder = useCreateLabOrder();
  const createInvoice = useCreateInvoice();
  const { triggerWorkflow } = useWorkflowOrchestrator();
  const permissions = usePermissions();
  const { profile } = useAuth();
  const [activeStep, setActiveStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showStep1Errors, setShowStep1Errors] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [addendumOpen, setAddendumOpen] = useState(false);
  const [addendumText, setAddendumText] = useState('');
  const [addendumReason, setAddendumReason] = useState('');
  const [isSavingAddendum, setIsSavingAddendum] = useState(false);
  const canEditConsultation = permissions.can('consultations:write');
  const isReadOnly = consultation?.status === 'completed' || !canEditConsultation;

  const vitalEval: VitalSignsEvaluation | null = useMemo(() => {
    const v = formData.vitals || consultation?.vitals;
    if (!v || Object.keys(v).length === 0) return null;
    return evaluateVitalSigns(v);
  }, [formData.vitals, consultation?.vitals]);

  const triggerWorkflowSafely = async (
    event: Parameters<typeof triggerWorkflow>[0],
    context: string
  ) => {
    try {
      await triggerWorkflow(event);
    } catch (error) {
      console.error(
        `Workflow side effect failed during ${context}:`,
        getErrorMessage(error),
        error
      );
    }
  };

  const handleApplyTemplate = (template: ConsultationTemplate) => {
    setFormData((prev) => ({
      ...prev,
      chief_complaint: template.chiefComplaint,
      history_of_present_illness: template.hpi,
      physical_examination: template.physicalExamination,
      clinical_notes: template.clinicalNotes,
    }));
    toast.success(`${template.specialty} template applied`);
  };

  const getDiagnosisSummary = () => {
    if (Array.isArray(formData.final_diagnosis) && formData.final_diagnosis.length > 0) {
      return formData.final_diagnosis.join(', ');
    }
    return 'Not documented';
  };

  useEffect(() => {
    if (consultation) {
      setActiveStep(consultation.current_step);
      setFormData({
        chief_complaint: consultation.chief_complaint || '',
        history_of_present_illness: consultation.history_of_present_illness || '',
        vitals: consultation.vitals || {},
        physical_examination: consultation.physical_examination || {},
        symptoms: consultation.symptoms || [],
        diagnoses: (consultation as any).diagnoses || [],
        provisional_diagnosis: consultation.provisional_diagnosis || [],
        final_diagnosis: consultation.final_diagnosis?.length
          ? consultation.final_diagnosis
          : normalizeDiagnosisDescriptions((consultation as any).diagnoses),
        treatment_plan: consultation.treatment_plan || '',
        prescriptions: normalizePrescriptionDrafts(consultation.prescriptions || []),
        lab_orders: consultation.lab_orders || [],
        referrals: consultation.referrals || [],
        clinical_notes: consultation.clinical_notes || '',
        follow_up_date: consultation.follow_up_date || '',
        follow_up_notes: consultation.follow_up_notes || '',
        handoff_notes: consultation.handoff_notes || '',
        pharmacy_notified: consultation.pharmacy_notified || false,
        lab_notified: consultation.lab_notified || false,
        billing_notified: consultation.billing_notified || false,
      });
    }
  }, [consultation]);

  // Keyboard shortcuts for consultation workflow
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canEditConsultation) return;
      // Ctrl+S to save draft
      if (event.ctrlKey && event.key === 's' && !event.shiftKey) {
        event.preventDefault();
        handleSaveStep();
      }
      // Ctrl+Enter to go to next step
      else if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        handleNextStep();
      }
      // Ctrl+/ to show keyboard shortcuts help
      else if (event.ctrlKey && event.key === '/') {
        event.preventDefault();
        setShowKeyboardHelp(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canEditConsultation, formData, id]);

  const handleUpdateField = (field: string, value: any) => {
    if (isReadOnly) return;
    setIsDirty(true);
    setSaveStatus('unsaved');
    setFormData((prev) => {
      if (field === 'diagnoses') {
        return {
          ...prev,
          diagnoses: value,
          final_diagnosis: normalizeDiagnosisDescriptions(value),
        };
      }

      if (field === 'final_diagnosis') {
        return {
          ...prev,
          final_diagnosis: normalizeDiagnosisDescriptions(value),
        };
      }

      if (field === 'prescriptions') {
        return {
          ...prev,
          prescriptions: normalizePrescriptionDrafts(value),
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const handleApplyAIRecommendation = (type: string, value: any) => {
    if (!canEditConsultation) return;
    if (type === 'diagnosis') {
      const currentDiagnoses = formData.final_diagnosis || [];
      if (typeof value === 'string' && !currentDiagnoses.includes(value)) {
        handleUpdateField('final_diagnosis', [...currentDiagnoses, value]);
        toast.success(`Applied AI recommendation: ${value}`);
      }
    } else if (type === 'lab') {
      toast.info(`AI Recommendation: ${value} - Please go to Lab tab to order.`);
    }
  };

  const handleSaveStep = async () => {
    if (!id) return;
    if (!canEditConsultation) {
      toast.error('You have read-only access to this consultation');
      return;
    }

    try {
      // Clean up date fields - convert empty strings to null
      const cleanedData = {
        ...formData,
        follow_up_date:
          (typeof formData.follow_up_date === 'string'
            ? formData.follow_up_date.trim()
            : formData.follow_up_date) || null,
      };

      await updateConsultation.mutateAsync({
        id,
        ...cleanedData,
      });

      // Log the activity
      await logActivity({
        actionType: 'consultation_update',
        entityType: 'consultation',
        entityId: id,
        details: { step: CONSULTATION_STEPS[activeStep - 1] },
      });

      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setIsDirty(false);
      toast.success('Progress saved');
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // 1.5-second debounced background autosave (A4)
  useEffect(() => {
    if (!isDirty || !id || isReadOnly || isCompleting) return;

    setSaveStatus('unsaved');
    const timer = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        const cleanedData = {
          ...formData,
          follow_up_date:
            (typeof formData.follow_up_date === 'string'
              ? formData.follow_up_date.trim()
              : formData.follow_up_date) || null,
        };

        await updateConsultation.mutateAsync({
          id,
          ...cleanedData,
        });

        setSaveStatus('saved');
        setLastSavedAt(new Date());
        setIsDirty(false);
      } catch (err) {
        setSaveStatus('unsaved');
        console.error('Autosave failed:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, isDirty, id, isReadOnly, isCompleting]);

  // Page exit guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isCompleted) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isCompleted]);

  // Signed addendum handler for completed consultations (A5)
  const handleSaveAddendum = async () => {
    if (!addendumText.trim()) {
      toast.error('Please enter addendum content.');
      return;
    }
    if (!id || !consultation) return;

    setIsSavingAddendum(true);
    try {
      const doctorName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : consultation.doctor
          ? `${consultation.doctor.first_name || ''} ${consultation.doctor.last_name || ''}`.trim()
          : 'Attending Physician';
      const timestamp = new Date().toISOString();
      const formattedTimestamp = new Date().toLocaleString();
      const addendumBlock = `\n\n--- SIGNED CLINICAL ADDENDUM (${formattedTimestamp}) ---\nSigned by: Dr. ${doctorName}\nRationale: ${addendumReason || 'Post-finalization clinical update'}\nAddendum:\n${addendumText.trim()}\n--- END ADDENDUM ---`;

      const updatedNotes =
        (formData.clinical_notes || consultation.clinical_notes || '') + addendumBlock;

      await updateConsultation.mutateAsync({
        id,
        clinical_notes: updatedNotes,
      });

      await logActivity({
        actionType: 'consultation_addendum',
        entityType: 'consultation',
        entityId: id,
        details: {
          timestamp,
          doctor_name: doctorName,
          rationale: addendumReason,
        },
      });

      setFormData((prev) => ({ ...prev, clinical_notes: updatedNotes }));
      toast.success('Signed addendum appended to clinical record.');
      setAddendumOpen(false);
      setAddendumText('');
      setAddendumReason('');
    } catch (err) {
      toast.error(`Failed to save addendum: ${getErrorMessage(err)}`);
    } finally {
      setIsSavingAddendum(false);
    }
  };

  const handleNextStep = async () => {
    if (!id || !consultation) return;
    if (!canEditConsultation) {
      toast.error('You do not have permission to modify this consultation');
      return;
    }

    // Validation for DR-WF-02
    if (activeStep === 1 && (!formData.chief_complaint || formData.chief_complaint.trim() === '')) {
      toast.error('Chief Complaint is required.');
      return;
    }

    // Validate Physical Examination step (step 2)
    if (activeStep === 2) {
      const physExam = formData.physical_examination;
      const hasPhysicalData = physExam && Object.values(physExam).some((v) => v);
      if (!hasPhysicalData) {
        toast.error('At least one physical examination finding must be documented.');
        return;
      }
    }

    if (activeStep === 3) {
      const diagnoses = formData.diagnoses || [];
      if (
        diagnoses.length === 0 &&
        (!formData.final_diagnosis ||
          (Array.isArray(formData.final_diagnosis) && formData.final_diagnosis.length === 0) ||
          (typeof formData.final_diagnosis === 'string' && formData.final_diagnosis.trim() === ''))
      ) {
        toast.error('Diagnosis with ICD-10 code is required to proceed.');
        return;
      }
    }

    if (activeStep === 4) {
      if (
        !formData.treatment_plan ||
        typeof formData.treatment_plan !== 'string' ||
        formData.treatment_plan.trim() === ''
      ) {
        toast.error('Treatment Plan is required.');
        return;
      }

      // Pre-submission clinical safety verification (A1)
      const currentMeds = ((consultation.patient as any)?.current_medications || []).concat(
        (formData.prescriptions || []).map((p: any) => p.medication_name)
      );
      const allergies = consultation.patient?.allergies || [];
      let hasContraindicated = false;

      for (const rx of formData.prescriptions || []) {
        const otherMeds = currentMeds.filter((m: string) => m !== rx.medication_name);
        const safety = checkPrescriptionSafety(rx.medication_name, allergies, otherMeds);
        if (
          safety.drugInteractions.some((d: any) => d.severity === 'contraindicated') ||
          safety.allergyAlerts.some((a: any) => a.severity === 'critical')
        ) {
          hasContraindicated = true;
          break;
        }
      }

      if (
        hasContraindicated &&
        (!formData.clinical_override_reason || formData.clinical_override_reason.trim() === '')
      ) {
        toast.error(
          'Cannot proceed: Contraindicated prescription requires a documented Clinical Override Reason.'
        );
        return;
      }
    }

    try {
      // Clean up date fields - convert empty strings to null
      const cleanedData = {
        ...formData,
        follow_up_date:
          (typeof formData.follow_up_date === 'string'
            ? formData.follow_up_date.trim()
            : formData.follow_up_date) || null,
      };

      await updateConsultation.mutateAsync({
        id,
        ...cleanedData,
      });

      if (activeStep < 5) {
        await advanceStep.mutateAsync({
          consultationId: id,
          currentStep: activeStep,
        });

        // Log the step advancement
        await logActivity({
          actionType: 'consultation_advance',
          entityType: 'consultation',
          entityId: id,
          details: {
            from_step: CONSULTATION_STEPS[activeStep - 1],
            to_step: CONSULTATION_STEPS[activeStep],
          },
        });

        setActiveStep((prev) => prev + 1);
      } else {
        // Complete consultation
        setIsCompleting(true);

        // Pre-submission clinical safety check (A1)
        const currentMeds = ((consultation.patient as any)?.current_medications || []).concat(
          (formData.prescriptions || []).map((p: any) => p.medication_name)
        );
        const allergies = consultation.patient?.allergies || [];
        let hasContraindicated = false;

        for (const rx of formData.prescriptions || []) {
          const otherMeds = currentMeds.filter((m: string) => m !== rx.medication_name);
          const safety = checkPrescriptionSafety(rx.medication_name, allergies, otherMeds);
          if (
            safety.drugInteractions.some((d: any) => d.severity === 'contraindicated') ||
            safety.allergyAlerts.some((a: any) => a.severity === 'critical')
          ) {
            hasContraindicated = true;
            break;
          }
        }

        if (
          hasContraindicated &&
          (!formData.clinical_override_reason || formData.clinical_override_reason.trim() === '')
        ) {
          toast.error(
            'Cannot complete consultation: Contraindicated prescription requires a documented Clinical Override Reason.'
          );
          setIsCompleting(false);
          return;
        }

        // Extract structured diagnoses for clinical record and billing (A3)
        const structuredDx =
          Array.isArray(formData.diagnoses) && formData.diagnoses.length > 0
            ? formData.diagnoses
            : (formData.final_diagnosis || []).map((desc: string) => ({
                id: crypto.randomUUID(),
                icd_code: 'UNSPECIFIED',
                description: desc,
                type: 'primary',
              }));

        const primaryDx = structuredDx.find((d: any) => d.type === 'primary') || structuredDx[0];
        const diagnosisCodingSummary = structuredDx
          .map((d: any) => `[${d.icd_code}] ${d.description} (${d.type})`)
          .join('; ');

        // Log consultation completion
        await logActivity({
          actionType: 'consultation_complete',
          entityType: 'consultation',
          entityId: id,
          details: {
            patient_id: consultation?.patient_id,
            doctor_id: consultation?.doctor_id,
          },
        });

        // Generate clean summary without duplication
        const patientSummary = `CONSULTATION SUMMARY

Patient: ${consultation.patient?.first_name} ${consultation.patient?.last_name}
MRN: ${consultation.patient?.mrn}
Date: ${new Date().toLocaleDateString()}
Doctor: ${consultation.doctor?.first_name} ${consultation.doctor?.last_name}

CHIEF COMPLAINT:
${formData.chief_complaint || 'Not documented'}

DIAGNOSIS:
${diagnosisCodingSummary || getDiagnosisSummary()}

TREATMENT PLAN:
${formData.treatment_plan || 'Not documented'}

PRESCRIPTIONS:
${formData.prescriptions?.map((rx: any) => `- ${rx.medication_name} ${rx.dosage}, ${rx.frequency} for ${rx.duration}`).join('\n') || 'None'}

LAB ORDERS:
${formData.lab_orders?.map((order: any) => `- ${order.test} (${order.priority})`).join('\n') || 'None'}

FOLLOW-UP:
${formData.follow_up_date ? `Date: ${new Date(formData.follow_up_date).toLocaleDateString()}` : 'No follow-up scheduled'}
${formData.follow_up_notes || ''}

CLINICAL NOTES:
${formData.clinical_notes || 'None'}

SOAP NOTES:
SUBJECTIVE:
${formData.soap_subjective || 'Not documented'}

OBJECTIVE:
${formData.soap_objective || 'Not documented'}

ASSESSMENT:
${formData.soap_assessment || 'Not documented'}

PLAN:
${formData.soap_plan || 'Not documented'}`;

        // Store summary and structured diagnoses (A3)
        await updateConsultation.mutateAsync({
          id,
          status: 'completed',
          completed_at: new Date().toISOString(),
          started_at: consultation.started_at || new Date().toISOString(),
          diagnoses: structuredDx,
          final_diagnosis: structuredDx.map(
            (d: any) => `${d.icd_code ? `[${d.icd_code}] ` : ''}${d.description}`
          ),
          pharmacy_notified: formData.prescriptions?.length > 0 ? true : formData.pharmacy_notified,
          lab_notified: formData.lab_orders?.length > 0 ? true : formData.lab_notified,
        });

        // Update patient queue
        if (consultation?.patient_id) {
          await supabase
            .from('patient_queue')
            .update({ status: 'completed', service_end_time: new Date().toISOString() })
            .eq('patient_id', consultation.patient_id)
            .in('status', ['in_service', 'called', 'waiting']);

          // INT-001: Mark linked appointment as completed
          await supabase
            .from('appointments')
            .update({ status: 'completed' })
            .eq('patient_id', consultation.patient_id)
            .in('status', ['confirmed', 'checked_in', 'in_progress']);
        }

        // Best-effort generated document record. Older schemas require file metadata and do not support inline content.
        const { error: documentError } = await supabase.from('documents').insert({
          patient_id: consultation.patient_id,
          consultation_id: id,
          hospital_id: consultation.hospital_id,
          uploaded_by: consultation.doctor_id,
          document_type: 'other',
          title: `Consultation Summary - ${new Date().toLocaleDateString()}`,
          description: buildGeneratedConsultationSummaryDescription(patientSummary),
          file_name: `consultation-summary-${id}.txt`,
          file_path: `generated/consultation-summaries/${id}.txt`,
          file_size: patientSummary.length,
          mime_type: 'text/plain',
          is_confidential: true,
          tags: ['consultation', 'summary', 'generated'],
        });

        if (documentError) {
          console.error(
            'Failed to create generated consultation document:',
            getErrorMessage(documentError),
            documentError
          );
        }

        const patientName = `${consultation.patient?.first_name} ${consultation.patient?.last_name}`;

        // Create prescriptions in the database and automatically notify pharmacy
        if (formData.prescriptions?.length > 0) {
          try {
            const rxHandoffNotes = [
              formData.handoff_notes,
              formData.clinical_override_reason
                ? `[CLINICAL SAFETY OVERRIDE]: ${formData.clinical_override_reason}`
                : undefined,
            ]
              .filter(Boolean)
              .join('\n');

            const prescriptionResult = await createPrescription.mutateAsync({
              patientId: consultation.patient_id,
              consultationId: id,
              items: formData.prescriptions.map((rx: any) => ({
                medication_name: rx.medication_name,
                dosage: rx.dosage,
                frequency: rx.frequency,
                duration: rx.duration,
                instructions: rx.instructions,
              })),
              notes: rxHandoffNotes,
            });

            if (formData.clinical_override_reason) {
              await logActivity({
                actionType: 'prescription_breakglass_override',
                entityType: 'prescription',
                entityId: prescriptionResult.id,
                details: {
                  override_reason: formData.clinical_override_reason,
                  doctor_id: consultation.doctor_id,
                  patient_id: consultation.patient_id,
                },
              });
            }

            // Always notify pharmacists via workflow orchestrator when prescriptions are created
            await triggerWorkflowSafely(
              {
                type: WORKFLOW_EVENT_TYPES.PRESCRIPTION_CREATED,
                patientId: consultation.patient_id,
                data: {
                  patientName,
                  prescriptionId: prescriptionResult.id,
                  medicationCount: formData.prescriptions.length,
                  hasClinicalOverride: !!formData.clinical_override_reason,
                },
              },
              'prescription creation'
            );
            toast.success(
              `${formData.prescriptions.length} prescription(s) created and sent to pharmacy`
            );
          } catch (err) {
            const message = getErrorMessage(err);
            console.error('Error creating prescription:', message, err);
            toast.error(`Failed to create prescriptions: ${message}`);
          }
        }

        // Create lab orders in the database and notify lab
        if (formData.lab_orders?.length > 0) {
          try {
            for (const order of formData.lab_orders) {
              // Use useCreateLabOrder to also insert into lab_queue (durable work queue)
              const labOrder = await createLabOrder.mutateAsync({
                hospital_id: consultation.hospital_id,
                patient_id: consultation.patient_id,
                consultation_id: id,
                ordered_by: consultation.doctor_id,
                test_name: order.test,
                priority: mapToCanonicalLabPriority(order.priority) as any,
                status: 'pending',
                result_notes: order.notes || formData.handoff_notes,
              });

              // Notify lab technicians via workflow orchestrator
              await triggerWorkflowSafely(
                {
                  type: WORKFLOW_EVENT_TYPES.LAB_ORDER_CREATED,
                  patientId: consultation.patient_id,
                  data: {
                    patientName,
                    testName: order.test,
                    labOrderId: labOrder.id,
                    priority: mapToCanonicalLabPriority(order.priority),
                  },
                  priority: mapToWorkflowPriority(order.priority),
                },
                'lab order creation'
              );
            }
            toast.success(`${formData.lab_orders.length} lab order(s) sent to laboratory`);
          } catch (err) {
            const message = getErrorMessage(err);
            console.error('Error creating lab orders:', message, err);
            toast.error(`Failed to send lab orders to laboratory: ${message}`);
            throw err;
          }
        }

        // Create invoice and notify receptionist/billing via workflow orchestrator
        if (formData.billing_notified) {
          try {
            const primaryIcdLabel =
              primaryDx?.icd_code && primaryDx.icd_code !== 'UNSPECIFIED'
                ? ` (ICD-10: ${primaryDx.icd_code})`
                : '';
            const invoiceItems =
              formData.invoice_items && Array.isArray(formData.invoice_items)
                ? formData.invoice_items
                : [
                    {
                      description: `Consultation${primaryIcdLabel}`,
                      quantity: 1,
                      unit_price: formData.consultation_fee || 0,
                      item_type: 'service',
                    },
                  ];

            const invoice = await createInvoice.mutateAsync({
              patientId: consultation.patient_id,
              consultationId: id,
              items: invoiceItems,
              notes: `Auto-generated invoice from consultation completion. Diagnoses: ${diagnosisCodingSummary || 'None documented'}`,
              dueDate: null,
            });

            await triggerWorkflowSafely(
              {
                type: WORKFLOW_EVENT_TYPES.INVOICE_CREATED,
                patientId: consultation.patient_id,
                data: {
                  patientName,
                  consultationId: id,
                  invoiceId: invoice.id,
                  invoiceNumber: invoice.invoice_number,
                  amount: invoice.total,
                },
              },
              'invoice creation'
            );
          } catch (err) {
            const message = getErrorMessage(err);
            console.error('Error creating invoice:', message, err);
            toast.error(`Failed to create invoice for this consultation: ${message}`);
          }
        }

        // Auto-create tasks from consultation actions
        try {
          const tasksToCreate = [];

          // Follow-up task if follow-up date is scheduled
          if (formData.follow_up_date) {
            tasksToCreate.push({
              hospital_id: consultation.hospital_id,
              patient_id: consultation.patient_id,
              assigned_to: consultation.doctor_id,
              assigned_by: consultation.doctor_id,
              title: `Follow-up: ${consultation.patient?.first_name} ${consultation.patient?.last_name}`,
              description: `Scheduled follow-up consultation\n${formData.follow_up_notes || ''}\n\nOriginal consultation: ${new Date().toLocaleDateString()}`,
              priority: 'medium',
              status: 'pending',
              due_date: formData.follow_up_date,
              task_type: 'follow_up',
            });
          }

          // Lab review task if lab orders were created
          if (formData.lab_orders?.length > 0) {
            const urgentLabs = formData.lab_orders.filter(
              (order: any) => order.priority === 'urgent'
            );
            const priority = urgentLabs.length > 0 ? 'urgent' : 'high';

            tasksToCreate.push({
              hospital_id: consultation.hospital_id,
              patient_id: consultation.patient_id,
              assigned_to: consultation.doctor_id,
              assigned_by: consultation.doctor_id,
              title: `Review Lab Results: ${consultation.patient?.first_name} ${consultation.patient?.last_name}`,
              description: `Review results for ${formData.lab_orders.length} lab test(s) ordered:\n${formData.lab_orders.map((order: any) => `- ${order.test} (${order.priority})`).join('\n')}\n\nConsultation: ${new Date().toLocaleDateString()}`,
              priority,
              status: 'pending',
              due_date: null, // Will be set when results are available
              task_type: 'lab_review',
            });
          }

          // Referral follow-up task if referrals were made
          if (formData.referrals?.length > 0) {
            tasksToCreate.push({
              hospital_id: consultation.hospital_id,
              patient_id: consultation.patient_id,
              assigned_to: consultation.doctor_id,
              assigned_by: consultation.doctor_id,
              title: `Follow-up Referral: ${consultation.patient?.first_name} ${consultation.patient?.last_name}`,
              description: `Follow up on ${formData.referrals.length} referral(s) made:\n${formData.referrals.map((ref: any) => `- ${ref.specialty || ref.type}: ${ref.reason || ''}`).join('\n')}\n\nConsultation: ${new Date().toLocaleDateString()}`,
              priority: 'medium',
              status: 'pending',
              due_date: null,
              task_type: 'referral_followup',
            });
          }

          // Create tasks in database
          if (tasksToCreate.length > 0) {
            const { error: taskError } = await supabase
              .from('task_assignments')
              .insert(tasksToCreate);

            if (taskError) {
              console.error('Error creating auto-tasks:', taskError);
            } else {
              toast.success(`Created ${tasksToCreate.length} follow-up task(s)`);
            }
          }
        } catch (err) {
          console.error('Error creating consultation tasks:', err);
          // Don't show error toast as consultation completion was successful
        }

        setIsCompleted(true);
        toast.success('Consultation completed successfully!');

        // Notify all receptionists so they can begin billing/checkout.
        // This fires unconditionally — whether or not an invoice was already
        // created inside the billing block above.
        const completionPatientName = `${consultation.patient?.first_name} ${consultation.patient?.last_name}`;
        await triggerWorkflowSafely(
          {
            type: WORKFLOW_EVENT_TYPES.CONSULTATION_COMPLETED,
            patientId: consultation.patient_id,
            data: {
              patientName: completionPatientName,
              consultationId: id ?? '',
              prescriptionCount: formData.prescriptions?.length || 0,
              labOrderCount: formData.lab_orders?.length || 0,
              billingNotified: !!formData.billing_notified,
            },
          },
          'consultation completion'
        );

        // Redirect after a short delay to show completion state
        setTimeout(() => {
          navigate('/consultations');
        }, 1500);
      }
    } catch (error) {
      console.error('Consultation completion failed:', getErrorMessage(error), error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep((prev) => prev - 1);
    }
  };

  if (isCompleted) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="rounded-full bg-success/10 p-6">
            <Check className="h-16 w-16 text-success" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Consultation Completed!</h2>
            <p className="text-muted-foreground">
              Patient: {consultation?.patient?.first_name} {consultation?.patient?.last_name}
            </p>
            <p className="text-sm text-muted-foreground">Redirecting to consultations list...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !consultation) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-muted-foreground">Consultation not found</p>
          <Button onClick={() => navigate('/consultations')}>Back to Consultations</Button>
        </div>
      </DashboardLayout>
    );
  }

  const stepTitles = [
    'Chief Complaint',
    'Physical Exam',
    'Diagnosis',
    'Treatment Plan',
    'Summary & Handoff',
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/consultations')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground">Consultation Workflow</h1>
                  {consultation?.status === 'completed' && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Finalized Record
                    </Badge>
                  )}
                  {vitalEval && (
                    <Badge
                      variant={
                        vitalEval.news2.riskLevel === 'high'
                          ? 'destructive'
                          : vitalEval.news2.riskLevel === 'medium'
                            ? 'secondary'
                            : 'outline'
                      }
                      className={
                        vitalEval.news2.riskLevel === 'high'
                          ? 'bg-red-600 text-white font-bold animate-pulse'
                          : vitalEval.news2.riskLevel === 'medium'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                      }
                    >
                      <Activity className="h-3 w-3 mr-1" />
                      NEWS2: {vitalEval.news2.totalScore} ({vitalEval.news2.riskLevel.toUpperCase()}
                      )
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <span>
                    {consultation.patient?.first_name} {consultation.patient?.last_name} • MRN:{' '}
                    {consultation.patient?.mrn}
                  </span>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1.5 text-xs">
                      {saveStatus === 'saving' && (
                        <span className="flex items-center gap-1 text-primary">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Autosaving draft...
                        </span>
                      )}
                      {saveStatus === 'saved' && lastSavedAt && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3 w-3" />
                          Draft saved
                        </span>
                      )}
                      {saveStatus === 'unsaved' && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Unsaved changes
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                Step {activeStep} of 5
              </Badge>
            </div>
          </div>

          {/* Clinical Deterioration Alert Banner (A2) */}
          {vitalEval && vitalEval.news2.totalScore >= 5 && (
            <div className="rounded-lg border border-red-300 bg-red-50/90 p-4 dark:border-red-900/60 dark:bg-red-950/40">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-red-900 dark:text-red-200">
                      CLINICAL DETERIORATION ALERT — NEWS2 Score: {vitalEval.news2.totalScore} (
                      {vitalEval.news2.riskLevel.toUpperCase()} RISK)
                    </span>
                    <Badge variant="destructive" className="animate-pulse">
                      URGENT ACTION
                    </Badge>
                  </div>
                  <p className="text-xs text-red-800 dark:text-red-300">
                    <strong>Recommended Clinical Protocol:</strong>{' '}
                    {vitalEval.news2.clinicalResponse}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Immediate actions: Perform urgent sepsis screening protocol, continuous
                    SpO₂/cardiac monitoring, order STAT ECG/labs if indicated, and alert senior
                    attending physician / Rapid Response Team.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step Progress */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                {CONSULTATION_STEPS.slice(0, 5).map((step, index) => {
                  const StepIcon = STEP_ICONS[index];
                  const isActive = index + 1 === activeStep;
                  const isCompleted = index + 1 < activeStep;
                  const stepNumber = index + 1;

                  return (
                    <div key={step.step} className="flex flex-col items-center flex-1">
                      <div className="flex items-center w-full">
                        {index > 0 && (
                          <div
                            className={`flex-1 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-muted'}`}
                          />
                        )}
                        <button
                          onClick={() =>
                            stepNumber <= consultation.current_step && setActiveStep(stepNumber)
                          }
                          disabled={stepNumber > consultation.current_step}
                          className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                            isActive
                              ? 'border-primary bg-primary text-primary-foreground'
                              : isCompleted
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted bg-background text-muted-foreground'
                          } ${stepNumber <= consultation.current_step ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}`}
                        >
                          {isCompleted ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <StepIcon className="h-5 w-5" />
                          )}
                        </button>
                        {index < 4 && (
                          <div
                            className={`flex-1 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-muted'}`}
                          />
                        )}
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium text-center hidden sm:block ${
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {stepTitles[index]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Step Content */}
          <Card>
            <CardContent className="pt-6">
              {!canEditConsultation && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Read-only mode: you can review this consultation, but only users with consultation
                  write access can change steps or complete the workflow.
                </div>
              )}
              <Tabs value={String(activeStep)} className="w-full">
                <TabsContent value="1" className="mt-0">
                  <ChiefComplaintStep
                    data={formData}
                    onUpdate={canEditConsultation ? handleUpdateField : () => {}}
                    patient={consultation.patient}
                  />
                </TabsContent>
                <TabsContent value="2" className="mt-0">
                  <PhysicalExamStep
                    data={formData}
                    onUpdate={canEditConsultation ? handleUpdateField : () => {}}
                  />
                </TabsContent>
                <TabsContent value="3" className="mt-0">
                  <DiagnosisStepEnhanced
                    data={formData}
                    onUpdate={canEditConsultation ? handleUpdateField : () => {}}
                    patientId={consultation.patient_id}
                  />
                </TabsContent>
                <TabsContent value="4" className="mt-0">
                  <TreatmentPlanStep
                    data={formData}
                    onUpdate={canEditConsultation ? handleUpdateField : () => {}}
                    patientId={consultation.patient_id}
                    consultationId={consultation.id}
                    patientAllergies={consultation.patient?.allergies || []}
                    patientMedications={(consultation.patient as any)?.current_medications || []}
                  />
                </TabsContent>
                <TabsContent value="5" className="mt-0">
                  <SummaryStep
                    data={formData}
                    onUpdate={canEditConsultation ? handleUpdateField : () => {}}
                    consultation={consultation}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrevStep} disabled={activeStep === 1}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTemplateSelectorOpen(true)}
                className="px-3"
                disabled={!canEditConsultation}
              >
                <Layers className="h-4 w-4 mr-1" />
                Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyboardHelp(true)}
                className="px-3"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
              {consultation?.status === 'completed' ? (
                <Button
                  variant="default"
                  onClick={() => setAddendumOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-sm"
                >
                  <PenTool className="mr-2 h-4 w-4" />
                  Add Signed Addendum
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSaveStep}
                    disabled={!canEditConsultation || updateConsultation.isPending}
                  >
                    {updateConsultation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Progress
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={
                      !canEditConsultation ||
                      updateConsultation.isPending ||
                      advanceStep.isPending ||
                      isCompleting ||
                      isCompleted
                    }
                  >
                    {(updateConsultation.isPending || advanceStep.isPending || isCompleting) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {activeStep === 5
                      ? isCompleting
                        ? 'Completing...'
                        : 'Complete Consultation'
                      : 'Next'}
                    {activeStep < 5 && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebars */}
        <div className="w-full xl:w-80 xl:min-w-[20rem] space-y-6">
          <PatientSidebar
            patient={consultation?.patient}
            vitals={formData.vitals || consultation?.vitals}
          />
          <EnhancedTaskManagement patientId={consultation?.patient_id} />
          <div className="hidden xl:block">
            <AIConsultationAssistant
              formData={formData}
              onApplyRecommendation={handleApplyAIRecommendation}
            />
          </div>
        </div>
      </div>

      {/* Signed Addendum Modal (A5) */}
      <Dialog open={addendumOpen} onOpenChange={setAddendumOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <PenTool className="h-5 w-5" />
              Add Signed Clinical Addendum
            </DialogTitle>
            <DialogDescription>
              This consultation is finalized. All amendments are appended as an immutable,
              audit-stamped addendum signed with your clinical credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-purple-200 bg-purple-50/50 p-3 text-xs dark:border-purple-900/50 dark:bg-purple-950/30">
              <div className="flex justify-between font-mono text-purple-800 dark:text-purple-300">
                <span>
                  Signer: Dr.{' '}
                  {profile
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    : 'Attending Physician'}
                </span>
                <span>Encounter: #{id?.slice(0, 8)}</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Timestamp: {new Date().toLocaleString()} (Auto-recorded on submission)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addendum-reason">Clinical Rationale for Amendment</Label>
              <Input
                id="addendum-reason"
                placeholder="e.g., Post-consultation lab findings review, amended dosage instructions..."
                value={addendumReason}
                onChange={(e) => setAddendumReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addendum-text">Addendum Notes *</Label>
              <Textarea
                id="addendum-text"
                rows={5}
                placeholder="Enter detailed clinical addendum note here..."
                value={addendumText}
                onChange={(e) => setAddendumText(e.target.value)}
                className="font-sans"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAddendumOpen(false)}
              disabled={isSavingAddendum}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAddendum}
              disabled={isSavingAddendum || !addendumText.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSavingAddendum && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign & Append Addendum
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Help Modal */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Quick keyboard actions for saving progress and moving through the consultation
              workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Save Draft</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + S</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Next Step</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + Enter</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Show Shortcuts</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + /</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">New Consultation</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + Shift + N</kbd>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Use keyboard shortcuts to navigate and save your work efficiently during
                consultations.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConsultationTemplateSelector
        open={templateSelectorOpen}
        onOpenChange={setTemplateSelectorOpen}
        onApply={handleApplyTemplate}
      />
    </DashboardLayout>
  );
}
