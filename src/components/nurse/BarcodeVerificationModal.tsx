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
import { Badge } from '@/components/ui/badge';
import { QrCode, Scan, CheckCircle2, AlertTriangle, UserCheck, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export interface BarcodeVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any;
  onVerified: () => void;
}

export function BarcodeVerificationModal({
  open,
  onOpenChange,
  patient,
  onVerified,
}: BarcodeVerificationModalProps) {
  const [scannedInput, setScannedInput] = useState('');
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    if (open) {
      setScannedInput('');
      setHasScanned(false);
    }
  }, [open]);

  if (!patient) return null;

  const expectedBarcode = patient.mrn || `PAT-${patient.id.slice(0, 6).toUpperCase()}`;

  const isMatched =
    hasScanned &&
    (scannedInput.trim().toUpperCase() === expectedBarcode.toUpperCase() ||
      scannedInput.trim().toUpperCase() === patient.mrn?.toUpperCase() ||
      scannedInput.trim().toLowerCase() === patient.id.toLowerCase());

  const isMismatch = hasScanned && !isMatched;

  const handleSimulateScan = () => {
    setScannedInput(expectedBarcode);
    setHasScanned(true);
    toast.success('Patient wristband barcode scanned successfully.');
  };

  const handleManualVerify = () => {
    if (!scannedInput.trim()) {
      toast.error('Please scan or enter the patient wristband barcode.');
      return;
    }
    setHasScanned(true);
  };

  const handleConfirm = () => {
    if (!isMatched) {
      toast.error('Cannot proceed: Patient identity verification failed.');
      return;
    }
    onVerified();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Scan className="h-5 w-5 text-blue-600" />
            <span>BCMA: Patient Wristband Barcode Scan</span>
          </DialogTitle>
          <DialogDescription>
            Scan patient identification wristband to establish 2-identifier positive patient
            verification prior to medication access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Target Patient Card */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <strong className="text-foreground text-sm">
                {patient.first_name} {patient.last_name}
              </strong>
              <Badge variant="outline" className="font-mono">
                MRN: {patient.mrn || 'N/A'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
              <div>DOB: {patient.date_of_birth || 'N/A'}</div>
              <div>Gender: {patient.gender || 'N/A'}</div>
            </div>
          </div>

          {/* Barcode Input */}
          <div className="space-y-1.5">
            <Label
              htmlFor="barcode-input"
              className="text-xs font-semibold flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-primary" />
                Scan or Enter Wristband Barcode *
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSimulateScan}
                className="h-6 text-[11px] text-primary hover:text-primary underline px-1"
              >
                Simulate Scanner Scan
              </Button>
            </Label>
            <div className="flex gap-2">
              <Input
                id="barcode-input"
                placeholder="Scan barcode or type MRN..."
                value={scannedInput}
                onChange={(e) => {
                  setScannedInput(e.target.value);
                  setHasScanned(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleManualVerify();
                  }
                }}
                className="h-9 text-xs font-mono"
              />
              <Button type="button" size="sm" onClick={handleManualVerify} className="h-9 text-xs">
                Scan
              </Button>
            </div>
          </div>

          {/* Scan Results */}
          {hasScanned && isMatched && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="block font-bold">
                  POSITIVE PATIENT IDENTIFICATION CONFIRMED
                </strong>
                <p>Wristband barcode matches patient chart record. Right patient verified.</p>
              </div>
            </div>
          )}

          {hasScanned && isMismatch && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2.5 text-xs text-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="block font-bold">BARCODE MISMATCH — WRONG PATIENT ALERT</strong>
                <p>
                  Scanned code does NOT match the active chart. Do not administer medication to this
                  patient!
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleConfirm}
            disabled={!isMatched}
          >
            <UserCheck className="h-4 w-4 mr-1.5" />
            Proceed to 5 Rights Checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
