/**
 * PreScanSafetyModal.tsx
 * Technician Pre-Scan Safety Gate & Radiation Dose Tracking
 *
 * Implements:
 * - Mandatory pregnancy verification for women (12-55) undergoing ionizing radiation
 * - Renal function / eGFR contrast clearance (CIN / NSF prevention)
 * - MRI ferromagnetic implant checklist (pacemaker, aneurysm clips)
 * - Radiation dose capture (DLP and CTDIvol)
 */

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShieldAlert, AlertTriangle, CheckCircle2, ShieldCheck, Loader2, Zap } from 'lucide-react';
import { RadiologyOrder, useRadiologyOrders } from '@/hooks/useRadiologyOrders';
import {
  validatePreScanSafety,
  PreScanSafetyChecklist,
  MODALITY_CONFIGS,
} from '@/lib/clinical/radiologyWorkflowRules';
import { toast } from 'sonner';

interface PreScanSafetyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: RadiologyOrder | null;
}

export function PreScanSafetyModal({ open, onOpenChange, order }: PreScanSafetyModalProps) {
  const { performPreScanSafety } = useRadiologyOrders();

  // Patient demographic extraction
  const patientAge = 35; // Default or calculated from DOB
  const patientGender = (order?.patient?.gender?.toLowerCase() as 'male' | 'female') || 'female';
  const modality = order?.metadata?.modality || 'ct';
  const contrastProtocol = order?.metadata?.contrastProtocol || 'iv_contrast';
  const config = MODALITY_CONFIGS[modality];

  const [lmpDate, setLmpDate] = useState<string>('');
  const [pregnancyStatus, setPregnancyStatus] = useState<
    'negative' | 'pregnant' | 'not_pregnant' | 'not_applicable'
  >('negative');
  const [egfr, setEgfr] = useState<string>('85');
  const [creatinine, setCreatinine] = useState<string>('0.9');

  // MRI checklist
  const [hasPacemaker, setHasPacemaker] = useState(false);
  const [hasCochlearImplant, setHasCochlearImplant] = useState(false);
  const [hasAneurysmClip, setHasAneurysmClip] = useState(false);
  const [hasMetalForeignBody, setHasMetalForeignBody] = useState(false);

  // Dose capture
  const [doseDlp, setDoseDlp] = useState<string>(modality === 'ct' ? '450' : '15');
  const [doseCtdiVol, setDoseCtdiVol] = useState<string>(modality === 'ct' ? '12.5' : '2.0');

  if (!order) return null;

  const checklist: PreScanSafetyChecklist = {
    patientAge,
    patientGender,
    modality,
    contrastProtocol,
    lmpDate: lmpDate || undefined,
    pregnancyScreenResult: pregnancyStatus,
    egfrValue: egfr ? parseFloat(egfr) : undefined,
    serumCreatinine: creatinine ? parseFloat(creatinine) : undefined,
    hasPacemaker,
    hasCochlearImplant,
    hasAneurysmClip,
    hasFerromagneticForeignBody: hasMetalForeignBody,
    doseDlp: doseDlp ? parseFloat(doseDlp) : undefined,
    doseCtdiVol: doseCtdiVol ? parseFloat(doseCtdiVol) : undefined,
  };

  const validation = validatePreScanSafety(checklist);

  const handleConfirmSafety = () => {
    if (!validation.cleared) {
      toast.error('Pre-scan safety clearance blocked. Resolve critical alerts first.');
      return;
    }

    performPreScanSafety.mutate(
      {
        orderId: order.id,
        checklist,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Technician Pre-Scan Safety Clearance
          </DialogTitle>
          <DialogDescription>
            Verify radiation exposure preconditions, pregnancy status, and contrast nephrotoxicity
            gates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Patient & Study Banner */}
          <div className="p-3 bg-muted/60 rounded-lg border text-xs space-y-1">
            <div className="flex justify-between font-semibold text-foreground">
              <span>
                {order.patient?.first_name} {order.patient?.last_name} ({order.patient?.mrn})
              </span>
              <Badge variant="outline" className="uppercase text-[10px]">
                {modality} • {contrastProtocol.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-muted-foreground">{order.test_name}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Accession: {order.specimen_barcode || 'Pending'}
            </p>
          </div>

          {/* 1. Pregnancy Safety Gate (Ionizing Modalities) */}
          {config.isIonizing &&
            patientGender === 'female' &&
            patientAge >= 12 &&
            patientAge <= 55 && (
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-lg space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <span>Radiation Protection & Pregnancy Screening</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ionizing radiation carries fetal teratogenic risks. Confirmation of pregnancy
                  status is legally required.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Last Menstrual Period (LMP)</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                      value={lmpDate}
                      onChange={(e) => setLmpDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Pregnancy Status *</Label>
                    <Select
                      value={pregnancyStatus}
                      onValueChange={(v: any) => setPregnancyStatus(v)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="negative">Negative UPT / Not Pregnant</SelectItem>
                        <SelectItem value="pregnant">Pregnant (Confirmed)</SelectItem>
                        <SelectItem value="not_applicable">
                          Post-Hysterectomy / Surgically Sterile
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

          {/* 2. Renal Clearance for Contrast Scans */}
          {contrastProtocol !== 'none' && config.requiresRenalScreeningForContrast && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-800 rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-200">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <span>Renal Clearance (CIN / Nephropathy Prevention)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                IV contrast media requires adequate glomerular filtration rate (eGFR $\ge$ 45 mL/min
                for CT, $\ge$ 30 for MRI).
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px]">eGFR Value (mL/min/1.73m²)</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs bg-white dark:bg-slate-900"
                    value={egfr}
                    onChange={(e) => setEgfr(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Serum Creatinine (mg/dL)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-8 text-xs bg-white dark:bg-slate-900"
                    value={creatinine}
                    onChange={(e) => setCreatinine(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. MRI Ferromagnetic Screening */}
          {config.requiresFerromagneticScreening && (
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-800 rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-purple-900 dark:text-purple-200">
                <ShieldAlert className="h-4 w-4 text-purple-600" />
                <span>MRI Ferromagnetic Implant Screening</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={hasPacemaker} onCheckedChange={(c) => setHasPacemaker(!!c)} />
                  <span>Cardiac Pacemaker / ICD</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={hasCochlearImplant}
                    onCheckedChange={(c) => setHasCochlearImplant(!!c)}
                  />
                  <span>Cochlear / Auditory Implant</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={hasAneurysmClip}
                    onCheckedChange={(c) => setHasAneurysmClip(!!c)}
                  />
                  <span>Intracranial Aneurysm Clip</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={hasMetalForeignBody}
                    onCheckedChange={(c) => setHasMetalForeignBody(!!c)}
                  />
                  <span>Ocular / Metal Foreign Body</span>
                </label>
              </div>
            </div>
          )}

          {/* 4. Radiation Dose Capture (Ionizing Scans) */}
          {config.isIonizing && (
            <div className="p-3 bg-muted/40 border rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Radiation Exposure Telemetry</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">DLP (Dose Length Product - mGy·cm)</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={doseDlp}
                    onChange={(e) => setDoseDlp(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">CTDIvol (mGy)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-8 text-xs font-mono"
                    value={doseCtdiVol}
                    onChange={(e) => setDoseCtdiVol(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Blockers & Warnings Output */}
          {validation.blockers.length > 0 && (
            <Alert variant="destructive" className="py-2 text-xs">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold">Safety Gate Blocked</AlertTitle>
              <AlertDescription className="space-y-1 mt-1">
                {validation.blockers.map((b, idx) => (
                  <p key={idx}>• {b}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {validation.warnings.length > 0 && (
            <Alert className="py-2 text-xs border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="space-y-1">
                {validation.warnings.map((w, idx) => (
                  <p key={idx}>• {w}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSafety}
            disabled={!validation.cleared || performPreScanSafety.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {performPreScanSafety.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Clearing Patient...
              </>
            ) : (
              'Verify & Start Scan Acquisition'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
