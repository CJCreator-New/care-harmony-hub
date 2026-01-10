import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Heart,
  AlertTriangle,
  Pill,
  MessageSquare,
  FileCheck,
  CheckCircle2,
  User,
  Loader2,
  Clock,
  Star,
  Shield
} from 'lucide-react';
import {
  usePatientChecklist,
  useCreateChecklist,
  useUpdateChecklist,
  PatientPrepChecklist,
} from '@/hooks/useNurseWorkflow';
import { useWorkflowNotifications } from '@/hooks/useWorkflowNotifications';
import { useActiveQueue, useUpdateQueueEntry } from '@/hooks/useQueue';
import { toast } from 'sonner';
import { AllergiesVerificationModal } from './AllergiesVerificationModal';
import { ChiefComplaintModal } from './ChiefComplaintModal';
import { MedicationsReviewModal } from './MedicationsReviewModal';
import { RecordVitalsModal } from './RecordVitalsModal';
import { TriageAssessmentModal } from './TriageAssessmentModal';
import { MedicationReconciliationCard } from './MedicationReconciliationCard';

interface PatientPrepChecklistCardProps {
  patientId: string;
  patientName: string;
  queueEntryId?: string;
  appointmentId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  esiLevel?: 1 | 2 | 3 | 4 | 5;
  onComplete?: () => void;
}

export function PatientPrepChecklistCard({
  patientId,
  patientName,
  queueEntryId,
  appointmentId,
  priority = 'normal',
  esiLevel,
  onComplete,
}: PatientPrepChecklistCardProps) {
  const { data: existingChecklist, isLoading } = usePatientChecklist(patientId);
  const createChecklist = useCreateChecklist();
  const updateChecklist = useUpdateChecklist();
  const updateQueueEntry = useUpdateQueueEntry();
  const { notifyPatientReady } = useWorkflowNotifications();
  const { data: queue = [] } = useActiveQueue();

  const [checklist, setChecklist] = useState<Partial<PatientPrepChecklist>>({
    vitals_completed: false,
    allergies_verified: false,
    medications_reviewed: false,
    chief_complaint_recorded: false,
    consent_obtained: false,
    ready_for_doctor: false,
    notes: '',
  });

  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showAllergiesModal, setShowAllergiesModal] = useState(false);
  const [showMedicationsModal, setShowMedicationsModal] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [showMedReconciliation, setShowMedReconciliation] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  useEffect(() => {
    if (existingChecklist) {
      // Convert null values to undefined for type compatibility
      setChecklist({
        ...existingChecklist,
        vitals_completed: existingChecklist.vitals_completed ?? undefined,
        allergies_verified: existingChecklist.allergies_verified ?? undefined,
        medications_reviewed: existingChecklist.medications_reviewed ?? undefined,
        chief_complaint_recorded: existingChecklist.chief_complaint_recorded ?? undefined,
        consent_obtained: existingChecklist.consent_obtained ?? undefined,
        ready_for_doctor: existingChecklist.ready_for_doctor ?? undefined,
      });
    }
  }, [existingChecklist]);

  const handleCreateChecklist = async () => {
    try {
      const result = await createChecklist.mutateAsync({
        patientId,
        queueEntryId,
        appointmentId,
      });
      // Convert null values to undefined for type compatibility
      setChecklist({
        ...result,
        vitals_completed: result.vitals_completed ?? undefined,
        allergies_verified: result.allergies_verified ?? undefined,
        medications_reviewed: result.medications_reviewed ?? undefined,
        chief_complaint_recorded: result.chief_complaint_recorded ?? undefined,
        consent_obtained: result.consent_obtained ?? undefined,
        ready_for_doctor: result.ready_for_doctor ?? undefined,
      });
      toast.success(`✅ Pre-consultation checklist started for ${patientName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to start checklist: ${errorMessage}`);
      console.error('Error creating checklist:', error);
    }
  };

  const handleVitalsComplete = () => {
    handleCheckItem('vitals_completed', true);
    setShowVitalsModal(false);
  };

  const handleAllergiesComplete = async (_data: any) => {
    try {
      await updateChecklist.mutateAsync({
        id: existingChecklist!.id,
        allergies_verified: true,
      });
      setChecklist(prev => ({ ...prev, allergies_verified: true }));
      setShowAllergiesModal(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      toast.error(`Failed to update allergies: ${errorMessage}`);
    }
  };

  const handleMedicationsComplete = async (_data: any) => {
    try {
      await updateChecklist.mutateAsync({
        id: existingChecklist!.id,
        medications_reviewed: true,
      });
      setChecklist(prev => ({ ...prev, medications_reviewed: true }));
      setShowMedicationsModal(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      toast.error(`Failed to update medications: ${errorMessage}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'emergency':
      case 'urgent': return <AlertTriangle className="h-3 w-3" />;
      case 'high': return <Star className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getESIColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-green-500';
      case 5: return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const handleCheckItem = async (field: keyof PatientPrepChecklist, value: boolean) => {
    if (!existingChecklist?.id) return;

    const updatedChecklist = { ...checklist, [field]: value };
    setChecklist(updatedChecklist);

    try {
      await updateChecklist.mutateAsync({
        id: existingChecklist.id,
        [field]: value,
        vitals_completed: updatedChecklist.vitals_completed,
        allergies_verified: updatedChecklist.allergies_verified,
        medications_reviewed: updatedChecklist.medications_reviewed,
        chief_complaint_recorded: updatedChecklist.chief_complaint_recorded,
      });
    } catch (error) {
      setChecklist(checklist);
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      toast.error(`Failed to update checklist: ${errorMessage}`);
      console.error('Error updating checklist:', error);
    }
  };

  const handleMarkReady = async () => {
    if (!existingChecklist?.id) return;

    try {
      await updateChecklist.mutateAsync({
        id: existingChecklist.id,
        ready_for_doctor: true,
      });

      const queueEntry = queue.find(q => q.patient_id === patientId);
      
      if (queueEntry) {
        await updateQueueEntry.mutateAsync({
          id: queueEntry.id,
          notes: `${queueEntry.notes || ''} [Ready for doctor - prep completed]`.trim(),
        });
      }
      
      await notifyPatientReady(patientId, patientName, queueEntry?.queue_number);

      toast.success(`✅ ${patientName} is now ready for doctor consultation`);
      onComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to mark patient as ready: ${errorMessage}`);
      console.error('Error marking patient ready:', error);
    }
  };

  const isAllComplete =
    checklist.vitals_completed &&
    checklist.allergies_verified &&
    checklist.medications_reviewed &&
    checklist.chief_complaint_recorded;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!existingChecklist) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {patientName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateChecklist} disabled={createChecklist.isPending} className="w-full">
            {createChecklist.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start Pre-Consultation Checklist
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={checklist.ready_for_doctor ? 'border-success/50 bg-success/5' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Pre-Consultation Checklist
              {(priority === 'emergency' || priority === 'urgent') && (
                <Shield className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {esiLevel && (
                <Badge className={`${getESIColor(esiLevel)} text-white text-xs`}>
                  ESI {esiLevel}
                </Badge>
              )}
              <Badge className={getPriorityColor(priority)}>
                {getPriorityIcon(priority)}
                {priority.toUpperCase()}
              </Badge>
              {checklist.ready_for_doctor ? (
                <Badge variant="success">Ready</Badge>
              ) : isAllComplete ? (
                <Badge variant="warning">Review Needed</Badge>
              ) : (
                <Badge variant="secondary">In Progress</Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{patientName}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Priority Alert */}
          {(priority === 'emergency' || priority === 'urgent') && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">
                  {priority === 'emergency' ? 'EMERGENCY PRIORITY' : 'URGENT PRIORITY'}
                </span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Complete preparation immediately. Patient requires expedited care.
              </p>
            </div>
          )}

          {/* Enhanced Checklist Items */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="vitals"
                checked={checklist.vitals_completed}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setShowVitalsModal(true);
                  } else {
                    handleCheckItem('vitals_completed', false);
                  }
                }}
                disabled={checklist.ready_for_doctor}
              />
              <Label htmlFor="vitals" className="flex items-center gap-2 cursor-pointer">
                <Heart className="h-4 w-4 text-destructive" />
                Vitals Recorded
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="allergies"
                checked={checklist.allergies_verified}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setShowAllergiesModal(true);
                  } else {
                    handleCheckItem('allergies_verified', false);
                  }
                }}
                disabled={checklist.ready_for_doctor}
              />
              <Label htmlFor="allergies" className="flex items-center gap-2 cursor-pointer">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Allergies Verified
              </Label>
            </div>

            {/* Triage Assessment - High Priority Patients */}
            {(priority === 'emergency' || priority === 'urgent' || priority === 'high') && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="triage"
                  checked={!!esiLevel}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setShowTriageModal(true);
                    }
                  }}
                  disabled={checklist.ready_for_doctor}
                />
                <Label htmlFor="triage" className="flex items-center gap-2 cursor-pointer">
                  <Shield className="h-4 w-4 text-red-500" />
                  Triage Assessment Complete
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                </Label>
              </div>
            )}

            {/* Medication Reconciliation */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="med_reconciliation"
                checked={checklist.medications_reviewed}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setShowMedReconciliation(true);
                  } else {
                    handleCheckItem('medications_reviewed', false);
                  }
                }}
                disabled={checklist.ready_for_doctor}
              />
              <Label htmlFor="med_reconciliation" className="flex items-center gap-2 cursor-pointer">
                <Pill className="h-4 w-4 text-primary" />
                Medication Reconciliation
                {priority !== 'low' && <Badge variant="outline" className="text-xs">Priority</Badge>}
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="complaint"
                checked={checklist.chief_complaint_recorded}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setShowComplaintModal(true);
                  } else {
                    handleCheckItem('chief_complaint_recorded', false);
                  }
                }}
                disabled={checklist.ready_for_doctor}
              />
              <Label htmlFor="complaint" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare className="h-4 w-4 text-info" />
                Chief Complaint Recorded
                {(priority === 'emergency' || priority === 'urgent') && (
                  <Badge variant="destructive" className="text-xs">Critical</Badge>
                )}
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="consent"
                checked={checklist.consent_obtained}
                onCheckedChange={(checked) => handleCheckItem('consent_obtained', checked as boolean)}
                disabled={checklist.ready_for_doctor}
              />
              <Label htmlFor="consent" className="flex items-center gap-2 cursor-pointer">
                <FileCheck className="h-4 w-4 text-success" />
                Consent Obtained (Optional)
              </Label>
            </div>
          </div>

          {!checklist.ready_for_doctor && isAllComplete && (
            <Button
              onClick={handleMarkReady}
              className="w-full"
              disabled={updateChecklist.isPending}
            >
              {updateChecklist.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Ready for Doctor
            </Button>
          )}

          {checklist.ready_for_doctor && (
            <div className="flex items-center justify-center gap-2 text-success py-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Patient is ready for consultation</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Modals */}
      <TriageAssessmentModal
        isOpen={showTriageModal}
        onClose={() => setShowTriageModal(false)}
        patientId={patientId}
        appointmentId={appointmentId}
        onSave={(assessment) => {
          // Handle triage assessment save
          console.log('Triage assessment saved:', assessment);
        }}
      />

      {showMedReconciliation && (
        <MedicationReconciliationCard
          patientId={patientId}
          appointmentId={appointmentId}
          onSave={(reconciliation) => {
            console.log('Medication reconciliation saved:', reconciliation);
            setShowMedReconciliation(false);
            handleCheckItem('medications_reviewed', true);
          }}
        />
      )}
      <RecordVitalsModal
        open={showVitalsModal}
        onOpenChange={setShowVitalsModal}
        patient={{
          id: patientId,
          first_name: patientName.split(' ')[0] || '',
          last_name: patientName.split(' ').slice(1).join(' ') || '',
          mrn: '',
        }}
        onComplete={handleVitalsComplete}
      />

      <AllergiesVerificationModal
        open={showAllergiesModal}
        onOpenChange={setShowAllergiesModal}
        patientName={patientName}
        onComplete={handleAllergiesComplete}
        isLoading={updateChecklist.isPending}
      />

      <MedicationsReviewModal
        open={showMedicationsModal}
        onOpenChange={setShowMedicationsModal}
        patientName={patientName}
        onComplete={handleMedicationsComplete}
        isLoading={updateChecklist.isPending}
      />

      <ChiefComplaintModal
        open={showComplaintModal}
        onOpenChange={setShowComplaintModal}
        patientName={patientName}
        onComplete={(data) => {
          handleCheckItem('chief_complaint_recorded', true);
          setShowComplaintModal(false);
        }}
        isLoading={updateChecklist.isPending}
      />
    </>
  );
}