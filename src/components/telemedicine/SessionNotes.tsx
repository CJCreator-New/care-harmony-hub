import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Save, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface SessionNotesProps {
  patientId: string;
  appointmentId?: string;
  onSave?: (notes: SessionNotes) => void;
}

interface SessionNotes {
  chiefComplaint: string;
  symptoms: string;
  diagnosis: string;
  treatmentPlan: string;
  prescriptions: string;
  followUp: string;
}

export function SessionNotes({ patientId, appointmentId, onSave }: SessionNotesProps) {
  const [notes, setNotes] = useState<SessionNotes>({
    chiefComplaint: '',
    symptoms: '',
    diagnosis: '',
    treatmentPlan: '',
    prescriptions: '',
    followUp: '',
  });

  const handleSave = () => {
    if (!notes.chiefComplaint && !notes.symptoms) {
      toast.error('Please add at least chief complaint or symptoms');
      return;
    }

    onSave?.(notes);
    toast.success('Session notes saved');
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Session Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="chief-complaint">Chief Complaint</Label>
          <Input
            id="chief-complaint"
            placeholder="Main reason for visit..."
            value={notes.chiefComplaint}
            onChange={(e) => setNotes({ ...notes, chiefComplaint: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="symptoms">Symptoms</Label>
          <Textarea
            id="symptoms"
            placeholder="Patient symptoms..."
            rows={2}
            value={notes.symptoms}
            onChange={(e) => setNotes({ ...notes, symptoms: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="diagnosis">Diagnosis</Label>
          <Input
            id="diagnosis"
            placeholder="Preliminary diagnosis..."
            value={notes.diagnosis}
            onChange={(e) => setNotes({ ...notes, diagnosis: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="treatment">Treatment Plan</Label>
          <Textarea
            id="treatment"
            placeholder="Recommended treatment..."
            rows={2}
            value={notes.treatmentPlan}
            onChange={(e) => setNotes({ ...notes, treatmentPlan: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prescriptions">Prescriptions</Label>
          <Textarea
            id="prescriptions"
            placeholder="Medications prescribed..."
            rows={2}
            value={notes.prescriptions}
            onChange={(e) => setNotes({ ...notes, prescriptions: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="follow-up">Follow-up</Label>
          <Input
            id="follow-up"
            placeholder="Follow-up instructions..."
            value={notes.followUp}
            onChange={(e) => setNotes({ ...notes, followUp: e.target.value })}
          />
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Save Notes
        </Button>
      </CardContent>
    </Card>
  );
}
