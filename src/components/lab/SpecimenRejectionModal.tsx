import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, XCircle, RefreshCw, FileWarning, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface SpecimenRejectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onRejectSpecimen: (data: {
    orderId: string;
    reasonCode: string;
    reasonLabel: string;
    clinicalNotes: string;
    dispatchRedraw: boolean;
    redrawPriority: 'urgent' | 'high' | 'normal';
  }) => Promise<void>;
  isLoading?: boolean;
}

export const REJECTION_REASONS = [
  {
    code: 'gross_hemolysis',
    label: 'Gross Hemolysis (Free hemoglobin invalidates K+, AST, LDH, Coag)',
    recommendedContainer: 'Gentle Venipuncture Redraw',
  },
  {
    code: 'clotted_specimen',
    label: 'Clotted Specimen (Micro-clots in EDTA / Citrate invalidate counts)',
    recommendedContainer: 'Prompt Inversion Redraw',
  },
  {
    code: 'quantity_not_sufficient',
    label: 'Quantity Not Sufficient (QNS) for analytical assay volume',
    recommendedContainer: 'Full Draw Required',
  },
  {
    code: 'wrong_container',
    label: 'Incorrect Tube / Anticoagulant additive (e.g. EDTA vs Heparin)',
    recommendedContainer: 'Correct Tube Redraw',
  },
  {
    code: 'unlabeled_or_mismatched',
    label: 'Specimen Unlabeled or 2-Identifier Mismatch',
    recommendedContainer: 'Mandatory Patient Re-identification Redraw',
  },
  {
    code: 'iv_fluid_contamination',
    label: 'Specimen Contaminated / Diluted by IV Line Infusion',
    recommendedContainer: 'Opposite Limb Venipuncture Redraw',
  },
  {
    code: 'other',
    label: 'Other Pre-Analytical Laboratory Rejection Reason',
    recommendedContainer: 'Standard Redraw',
  },
];

export function SpecimenRejectionModal({
  open,
  onOpenChange,
  order,
  onRejectSpecimen,
  isLoading = false,
}: SpecimenRejectionModalProps) {
  const [reasonCode, setReasonCode] = useState('gross_hemolysis');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [dispatchRedraw, setDispatchRedraw] = useState(true);
  const [redrawPriority, setRedrawPriority] = useState<'urgent' | 'high' | 'normal'>('urgent');

  if (!order) return null;

  const currentReason = REJECTION_REASONS.find((r) => r.code === reasonCode);

  const handleSubmit = async () => {
    if (!reasonCode) {
      toast.error('Please select a specimen rejection reason.');
      return;
    }
    if (reasonCode === 'other' && clinicalNotes.trim().length < 5) {
      toast.error('Please provide specific rejection notes for this non-standard rejection.');
      return;
    }

    await onRejectSpecimen({
      orderId: order.id,
      reasonCode,
      reasonLabel: currentReason?.label || reasonCode,
      clinicalNotes: clinicalNotes.trim(),
      dispatchRedraw,
      redrawPriority,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5 text-destructive" />
            <span>Reject Specimen & Request Redraw</span>
          </DialogTitle>
          <DialogDescription>
            Document pre-analytical rejection rationale and automatically dispatch a priority redraw
            task to nursing and phlebotomy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Order Details */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <strong className="text-foreground text-sm">{order.test_name}</strong>
              <Badge variant="destructive" className="uppercase font-semibold">
                Accession: {order.results?.accession?.barcode || order.id.slice(0, 8)}
              </Badge>
            </div>
            <div className="text-muted-foreground">
              Patient:{' '}
              <strong>
                {order.patient
                  ? `${order.patient.first_name} ${order.patient.last_name}`
                  : order.patient_id}
              </strong>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Rejection Reason *</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r.code} value={r.code} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label
              htmlFor="rejection-notes"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <FileWarning className="h-3.5 w-3.5 text-muted-foreground" />
              Pre-Analytical Observations & Phlebotomy Guidance
            </Label>
            <Textarea
              id="rejection-notes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g. Visual index 3+ hemolysis observed post-centrifugation. Please recollect from right arm without prolonged tourniquet."
              rows={3}
              className="text-xs"
            />
          </div>

          {/* Automated Redraw Dispatch Option */}
          <div className="rounded-lg border p-3 bg-amber-500/10 border-amber-500/20 space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="dispatch-redraw"
                checked={dispatchRedraw}
                onCheckedChange={(c) => setDispatchRedraw(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <label
                  htmlFor="dispatch-redraw"
                  className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                  Auto-Dispatch Priority Redraw Order
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Creates an immediate replacement collection order and broadcasts an urgent redraw
                  notification to the nursing unit.
                </p>
              </div>
            </div>

            {dispatchRedraw && (
              <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20 text-xs">
                <span className="font-medium text-muted-foreground">Redraw Priority:</span>
                <div className="flex gap-1.5">
                  {(['urgent', 'high', 'normal'] as const).map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={redrawPriority === p ? 'default' : 'outline'}
                      onClick={() => setRedrawPriority(p)}
                      className="h-6 text-[11px] uppercase py-0 px-2"
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
            )}
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
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-1.5" />
                Reject Specimen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
