import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ChiefComplaintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  onComplete: (data: { complaint: string; duration: string; severity: string; notes: string }) => void;
  isLoading?: boolean;
}

export function ChiefComplaintModal({
  open,
  onOpenChange,
  patientName,
  onComplete,
  isLoading = false,
}: ChiefComplaintModalProps) {
  const [complaint, setComplaint] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!complaint.trim()) {
      toast.error('Please record the chief complaint');
      return;
    }
    onComplete({ 
      complaint: complaint.trim(), 
      duration: duration.trim(), 
      severity, 
      notes: notes.trim() 
    });
    setComplaint('');
    setDuration('');
    setSeverity('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-info" />
            Record Chief Complaint - {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Chief Complaint *</Label>
            <Textarea
              placeholder="Patient's primary reason for visit in their own words..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Textarea
                placeholder="How long has this been going on?"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Associated symptoms, triggers, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Record Complaint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}