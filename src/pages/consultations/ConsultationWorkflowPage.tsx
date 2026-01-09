import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import {
  useConsultation,
  useUpdateConsultation,
  useAdvanceConsultationStep,
  CONSULTATION_STEPS,
} from "@/hooks/useConsultations";
import { useCreatePrescription } from "@/hooks/usePrescriptions";
import { useWorkflowNotifications } from "@/hooks/useWorkflowNotifications";
import { ChiefComplaintStep } from "@/components/consultations/steps/ChiefComplaintStep";
import { PhysicalExamStep } from "@/components/consultations/steps/PhysicalExamStep";
import { DiagnosisStepEnhanced } from "@/components/consultations/steps/DiagnosisStepEnhanced";
import { TreatmentPlanStep } from "@/components/consultations/steps/TreatmentPlanStep";
import { SummaryStep } from "@/components/consultations/steps/SummaryStep";
import { PatientSidebar } from "@/components/consultations/PatientSidebar";
import { toast } from "sonner";

const STEP_ICONS = [User, Stethoscope, Pill, FileText, Send];

export default function ConsultationWorkflowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: consultation, isLoading, error } = useConsultation(id);
  const updateConsultation = useUpdateConsultation();
  const advanceStep = useAdvanceConsultationStep();
  const createPrescription = useCreatePrescription();
  const { 
    notifyPrescriptionCreated, 
    notifyLabOrderCreated, 
    notifyConsultationComplete 
  } = useWorkflowNotifications();
  const [activeStep, setActiveStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (consultation) {
      setActiveStep(consultation.current_step);
      setFormData({
        chief_complaint: consultation.chief_complaint || "",
        history_of_present_illness: consultation.history_of_present_illness || "",
        vitals: consultation.vitals || {},
        physical_examination: consultation.physical_examination || {},
        symptoms: consultation.symptoms || [],
        diagnoses: consultation.diagnoses || [],
        provisional_diagnosis: consultation.provisional_diagnosis || [],
        final_diagnosis: consultation.final_diagnosis || [],
        treatment_plan: consultation.treatment_plan || "",
        prescriptions: consultation.prescriptions || [],
        lab_orders: consultation.lab_orders || [],
        referrals: consultation.referrals || [],
        clinical_notes: consultation.clinical_notes || "",
        follow_up_date: consultation.follow_up_date || "",
        follow_up_notes: consultation.follow_up_notes || "",
        handoff_notes: consultation.handoff_notes || "",
        pharmacy_notified: consultation.pharmacy_notified || false,
        lab_notified: consultation.lab_notified || false,
        billing_notified: consultation.billing_notified || false,
      });
    }
  }, [consultation]);

  const handleUpdateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveStep = async () => {
    if (!id) return;

    try {
      // Clean up date fields - convert empty strings to null
      const cleanedData = {
        ...formData,
        follow_up_date: formData.follow_up_date?.trim() || null,
      };

      await updateConsultation.mutateAsync({
        id,
        ...cleanedData,
      });
      toast.success("Progress saved");
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleNextStep = async () => {
    if (!id || !consultation) return;

    try {
      // Clean up date fields - convert empty strings to null
      const cleanedData = {
        ...formData,
        follow_up_date: formData.follow_up_date?.trim() || null,
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
        setActiveStep((prev) => prev + 1);
      } else {
        // Complete consultation
        await updateConsultation.mutateAsync({
          id,
          status: "completed",
          completed_at: new Date().toISOString(),
        });

        const patientName = `${consultation.patient?.first_name} ${consultation.patient?.last_name}`;

        // Create prescriptions in the database and notify pharmacy
        if (formData.prescriptions?.length > 0 && formData.pharmacy_notified) {
          try {
            const prescriptionResult = await createPrescription.mutateAsync({
              patientId: consultation.patient_id,
              consultationId: id,
              items: formData.prescriptions.map((rx: any) => ({
                medication_name: rx.medication,
                dosage: rx.dosage,
                frequency: rx.frequency,
                duration: rx.duration,
                instructions: rx.instructions,
              })),
              notes: formData.handoff_notes,
            });
            // Notify pharmacists
            await notifyPrescriptionCreated(
              consultation.patient_id,
              patientName,
              prescriptionResult.id
            );
          } catch (err) {
            console.error('Error creating prescription:', err);
          }
        }

        // Notify lab for any unsubmitted lab orders
        if (formData.lab_orders?.length > 0 && formData.lab_notified) {
          for (const order of formData.lab_orders) {
            if (!order.isSubmitted) {
              await notifyLabOrderCreated(
                consultation.patient_id,
                patientName,
                order.test,
                order.labOrderId || '',
                order.priority
              );
            }
          }
        }

        // Notify receptionist/billing when consultation is complete
        if (formData.billing_notified) {
          await notifyConsultationComplete(
            consultation.patient_id,
            patientName,
            id
          );
        }

        toast.success("Consultation completed!");
        navigate("/consultations");
      }
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep((prev) => prev - 1);
    }
  };

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
          <Button onClick={() => navigate("/consultations")}>
            Back to Consultations
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const stepTitles = [
    "Chief Complaint",
    "Physical Exam",
    "Diagnosis",
    "Treatment Plan",
    "Summary & Handoff",
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/consultations")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Consultation Workflow
                </h1>
                <p className="text-sm text-muted-foreground">
                  {consultation.patient?.first_name} {consultation.patient?.last_name} •{" "}
                  {consultation.patient?.mrn}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Step {activeStep} of 5
            </Badge>
          </div>

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
                    <div
                      key={step.step}
                      className="flex flex-col items-center flex-1"
                    >
                      <div className="flex items-center w-full">
                        {index > 0 && (
                          <div
                            className={`flex-1 h-0.5 ${
                              isCompleted ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        )}
                        <button
                          onClick={() => stepNumber <= consultation.current_step && setActiveStep(stepNumber)}
                          disabled={stepNumber > consultation.current_step}
                          className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                            isActive
                              ? "border-primary bg-primary text-primary-foreground"
                              : isCompleted
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted bg-background text-muted-foreground"
                          } ${stepNumber <= consultation.current_step ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed"}`}
                        >
                          {isCompleted ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <StepIcon className="h-5 w-5" />
                          )}
                        </button>
                        {index < 4 && (
                          <div
                            className={`flex-1 h-0.5 ${
                              isCompleted ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        )}
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium text-center hidden sm:block ${
                          isActive ? "text-primary" : "text-muted-foreground"
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
              <Tabs value={String(activeStep)} className="w-full">
                <TabsContent value="1" className="mt-0">
                  <ChiefComplaintStep
                    data={formData}
                    onUpdate={handleUpdateField}
                    patient={consultation.patient}
                  />
                </TabsContent>
                <TabsContent value="2" className="mt-0">
                  <PhysicalExamStep
                    data={formData}
                    onUpdate={handleUpdateField}
                  />
                </TabsContent>
                <TabsContent value="3" className="mt-0">
                  <DiagnosisStepEnhanced
                    data={formData}
                    onUpdate={handleUpdateField}
                  />
                </TabsContent>
                <TabsContent value="4" className="mt-0">
                  <TreatmentPlanStep
                    data={formData}
                    onUpdate={handleUpdateField}
                  />
                </TabsContent>
                <TabsContent value="5" className="mt-0">
                  <SummaryStep
                    data={formData}
                    onUpdate={handleUpdateField}
                    consultation={consultation}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={activeStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSaveStep}
                disabled={updateConsultation.isPending}
              >
                {updateConsultation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Progress
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={updateConsultation.isPending || advanceStep.isPending}
              >
                {(updateConsultation.isPending || advanceStep.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {activeStep === 5 ? "Complete" : "Next"}
                {activeStep < 5 && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Patient Sidebar */}
        <div className="w-full lg:w-80">
          <PatientSidebar patient={consultation.patient} />
        </div>
      </div>
    </DashboardLayout>
  );
}
