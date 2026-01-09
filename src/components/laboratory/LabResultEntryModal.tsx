import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle2, FlaskConical, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LabResultEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labOrder: {
    id: string;
    patient_name: string;
    patient_mrn: string;
    test_name: string;
    test_category: string;
    sample_type: string;
    priority: string;
    ordered_by: string;
    ordered_at: string;
    reference_ranges: {
      normal_min: number;
      normal_max: number;
      critical_low: number;
      critical_high: number;
      unit: string;
    };
  } | null;
  onSubmitResults: (data: {
    results: string;
    notes: string;
    isCritical: boolean;
    qualityControlPassed: boolean;
  }) => void;
  isLoading?: boolean;
}

export function LabResultEntryModal({
  open,
  onOpenChange,
  labOrder,
  onSubmitResults,
  isLoading = false,
}: LabResultEntryModalProps) {
  const [results, setResults] = useState('');
  const [notes, setNotes] = useState('');
  const [qualityControlPassed, setQualityControlPassed] = useState(false);

  const checkCriticalValue = (value: string) => {
    if (!labOrder?.reference_ranges || !value) return false;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;
    
    const { critical_low, critical_high } = labOrder.reference_ranges;
    return numValue <= critical_low || numValue >= critical_high;
  };

  const checkNormalRange = (value: string) => {
    if (!labOrder?.reference_ranges || !value) return null;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;
    
    const { normal_min, normal_max } = labOrder.reference_ranges;
    if (numValue < normal_min) return 'low';
    if (numValue > normal_max) return 'high';
    return 'normal';
  };

  const isCritical = checkCriticalValue(results);
  const rangeStatus = checkNormalRange(results);

  const handleSubmit = () => {
    if (!results.trim()) {
      toast.error('Please enter test results');
      return;
    }
    if (!qualityControlPassed) {
      toast.error('Please confirm quality control checks');
      return;
    }

    onSubmitResults({
      results: results.trim(),
      notes: notes.trim(),
      isCritical,
      qualityControlPassed,
    });

    setResults('');
    setNotes('');
    setQualityControlPassed(false);
  };

  if (!labOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Enter Lab Results
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              <h3 className="font-medium">Test Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Patient:</span>
                <p className="font-medium">{labOrder.patient_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">MRN:</span>
                <p className="font-medium">{labOrder.patient_mrn}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Test:</span>
                <p className="font-medium">{labOrder.test_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Sample:</span>
                <p className="font-medium">{labOrder.sample_type}</p>
              </div>
            </div>
          </div>

          {/* Reference Ranges */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">Reference Ranges</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Normal Range:</span>
                <p className="font-medium text-success">
                  {labOrder.reference_ranges.normal_min} - {labOrder.reference_ranges.normal_max} {labOrder.reference_ranges.unit}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Critical Values:</span>
                <p className="font-medium text-destructive">
                  &lt;{labOrder.reference_ranges.critical_low} or &gt;{labOrder.reference_ranges.critical_high} {labOrder.reference_ranges.unit}
                </p>
              </div>
            </div>
          </div>

          {/* Result Entry */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="results">Test Results *</Label>
              <div className="flex gap-2">
                <Input
                  id="results"
                  placeholder="Enter numerical result..."
                  value={results}
                  onChange={(e) => setResults(e.target.value)}
                  className={isCritical ? 'border-destructive' : ''}
                />
                <span className="flex items-center text-sm text-muted-foreground">
                  {labOrder.reference_ranges.unit}
                </span>
              </div>
              
              {/* Range Status Indicator */}
              {rangeStatus && (
                <div className="flex items-center gap-2">
                  {rangeStatus === 'normal' && (
                    <Badge variant="success">Within Normal Range</Badge>
                  )}
                  {rangeStatus === 'low' && (
                    <Badge variant="warning">Below Normal</Badge>
                  )}
                  {rangeStatus === 'high' && (
                    <Badge variant="warning">Above Normal</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Critical Value Alert */}
            {isCritical && (
              <Alert className="border-destructive bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Critical Value Detected!</strong> This result requires immediate physician notification.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Result Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional observations, comments, or technical notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Quality Control */}
          <div className="space-y-3">
            <h3 className="font-medium">Quality Control Verification</h3>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="qcPassed"
                checked={qualityControlPassed}
                onChange={(e) => setQualityControlPassed(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="qcPassed" className="cursor-pointer">
                Quality control checks passed (calibration verified, controls within range)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !qualityControlPassed}
            className={isCritical ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isCritical ? 'Submit Critical Result' : 'Submit Results'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}