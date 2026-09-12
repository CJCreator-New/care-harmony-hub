import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, AlertTriangle, Clock, HeartPulse, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface PRNEffectivenessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  administrationRecord: any;
  patient: any;
  onRecordOutcome: (data: {
    administrationId: string;
    postDoseScore: string;
    outcomeResponse: 'effective' | 'partially_effective' | 'ineffective' | 'adverse_reaction';
    outcomeNotes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function PRNEffectivenessModal({
  open,
  onOpenChange,
  administrationRecord,
  patient,
  onRecordOutcome,
  isLoading = false,
}: PRNEffectivenessModalProps) {
  const [postDoseScore, setPostDoseScore] = useState('');
  const [outcomeResponse, setOutcomeResponse] = useState<
    'effective' | 'partially_effective' | 'ineffective' | 'adverse_reaction'
  >('effective');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  useEffect(() => {
    if (open) {
      setPostDoseScore('');
      setOutcomeResponse('effective');
      setOutcomeNotes('');
    }
  }, [open]);

  if (!administrationRecord || !patient) return null;

  const handleSubmit = async () => {
    if (!postDoseScore.trim()) {
      toast.error('Please record the post-administration symptom/pain score.');
      return;
    }

    await onRecordOutcome({
      administrationId: administrationRecord.id,
      postDoseScore: postDoseScore.trim(),
      outcomeResponse,
      outcomeNotes: outcomeNotes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <HeartPulse className="h-5 w-5 text-indigo-600" />
            <span>Document PRN Medication Effectiveness</span>
          </DialogTitle>
          <DialogDescription>
            Record post-administration symptom reassessment to close the clinical outcome loop.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Dose Info */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <strong className="text-foreground text-sm">
                {administrationRecord.medication_name}
              </strong>
              <Badge variant="secondary">{administrationRecord.dosage}</Badge>
            </div>
            <div className="text-muted-foreground">
              Patient:{' '}
              <strong>
                {patient.first_name} {patient.last_name}
              </strong>
            </div>
            {administrationRecord.notes && (
              <div className="text-[11px] text-muted-foreground pt-1 border-t">
                Baseline Note: {administrationRecord.notes}
              </div>
            )}
          </div>

          {/* Post-Dose Score Input */}
          <div className="space-y-1.5">
            <Label htmlFor="post-score" className="text-xs font-semibold">
              Post-Dose Symptom Score (Current Reassessment) *
            </Label>
            <Input
              id="post-score"
              value={postDoseScore}
              onChange={(e) => setPostDoseScore(e.target.value)}
              placeholder="e.g. Pain 2/10 (Mild), Nausea Resolved, Temp 37.1C"
              className="h-8 text-xs font-medium"
            />
          </div>

          {/* Response Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Clinical Therapeutic Outcome *</Label>
            <Select value={outcomeResponse} onValueChange={(val: any) => setOutcomeResponse(val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="effective">
                  Effective — Significant Relief (&gt; 50% improvement)
                </SelectItem>
                <SelectItem value="partially_effective">
                  Partially Effective — Mild Relief (Acceptable)
                </SelectItem>
                <SelectItem value="ineffective">
                  Ineffective — Refractory (No Change in Symptoms)
                </SelectItem>
                <SelectItem value="adverse_reaction">
                  Adverse Reaction / Excessive Sedation
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Outcome Notes */}
          <div className="space-y-1">
            <Label htmlFor="outcome-notes" className="text-xs">
              Reassessment Remarks
            </Label>
            <Textarea
              id="outcome-notes"
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="e.g. Patient states pain is well tolerated now, resting comfortably in bed."
              rows={2}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSubmit}
            disabled={isLoading || !postDoseScore.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Save Outcome Reassessment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
