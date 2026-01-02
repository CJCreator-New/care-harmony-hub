import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
} from 'lucide-react';
import {
  usePatientChecklist,
  useCreateChecklist,
  useUpdateChecklist,
  PatientPrepChecklist,
} from '@/hooks/useNurseWorkflow';
import { toast } from 'sonner';

interface PatientPrepChecklistCardProps {
  patientId: string;
  patientName: string;
  queueEntryId?: string;
  appointmentId?: string;
  onComplete?: () => void;
}

export function PatientPrepChecklistCard({
  patientId,
  patientName,
  queueEntryId,
  appointmentId,
  onComplete,
}: PatientPrepChecklistCardProps) {
  const { data: existingChecklist, isLoading } = usePatientChecklist(patientId);
  const createChecklist = useCreateChecklist();
  const updateChecklist = useUpdateChecklist();

  const [checklist, setChecklist] = useState<Partial<PatientPrepChecklist>>({
    vitals_completed: false,
    allergies_verified: false,
    medications_reviewed: false,
    chief_complaint_recorded: false,
    consent_obtained: false,
    ready_for_doctor: false,
    notes: '',
  });

  useEffect(() => {
    if (existingChecklist) {
      setChecklist(existingChecklist);
    }
  }, [existingChecklist]);

  const handleCreateChecklist = async () => {
    const result = await createChecklist.mutateAsync({
      patientId,
      queueEntryId,
      appointmentId,
    });
    setChecklist(result);
  };

  const handleCheckItem = async (field: keyof PatientPrepChecklist, value: boolean) => {
    if (!existingChecklist?.id) return;

    const updatedChecklist = { ...checklist, [field]: value };
    setChecklist(updatedChecklist);

    await updateChecklist.mutateAsync({
      id: existingChecklist.id,
      [field]: value,
      vitals_completed: updatedChecklist.vitals_completed,
      allergies_verified: updatedChecklist.allergies_verified,
      medications_reviewed: updatedChecklist.medications_reviewed,
      chief_complaint_recorded: updatedChecklist.chief_complaint_recorded,
    });
  };

  const handleMarkReady = async () => {
    if (!existingChecklist?.id) return;

    await updateChecklist.mutateAsync({
      id: existingChecklist.id,
      ready_for_doctor: true,
    });
    toast.success('Patient marked as ready for doctor');
    onComplete?.();
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
    <Card className={checklist.ready_for_doctor ? 'border-success/50 bg-success/5' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Pre-Consultation Checklist
          </CardTitle>
          {checklist.ready_for_doctor ? (
            <Badge variant="success">Ready</Badge>
          ) : isAllComplete ? (
            <Badge variant="warning">Review Needed</Badge>
          ) : (
            <Badge variant="secondary">In Progress</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{patientName}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Checklist Items */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id="vitals"
              checked={checklist.vitals_completed}
              onCheckedChange={(checked) => handleCheckItem('vitals_completed', checked as boolean)}
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
              onCheckedChange={(checked) => handleCheckItem('allergies_verified', checked as boolean)}
              disabled={checklist.ready_for_doctor}
            />
            <Label htmlFor="allergies" className="flex items-center gap-2 cursor-pointer">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Allergies Verified
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="medications"
              checked={checklist.medications_reviewed}
              onCheckedChange={(checked) => handleCheckItem('medications_reviewed', checked as boolean)}
              disabled={checklist.ready_for_doctor}
            />
            <Label htmlFor="medications" className="flex items-center gap-2 cursor-pointer">
              <Pill className="h-4 w-4 text-primary" />
              Current Medications Reviewed
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="complaint"
              checked={checklist.chief_complaint_recorded}
              onCheckedChange={(checked) => handleCheckItem('chief_complaint_recorded', checked as boolean)}
              disabled={checklist.ready_for_doctor}
            />
            <Label htmlFor="complaint" className="flex items-center gap-2 cursor-pointer">
              <MessageSquare className="h-4 w-4 text-info" />
              Chief Complaint Recorded
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

        {/* Ready Button */}
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
  );
}
