import React, { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pill,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  UserCheck,
  Syringe,
  Loader2,
} from 'lucide-react';
import {
  isHighAlertMedication,
  getPreconditionsForMedication,
  areFiveRightsSatisfied,
  FiveRightsChecklist,
} from '@/lib/clinical/medicationAdministrationRules';
import { toast } from 'sonner';

export interface MedicationAdministrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: any;
  patient: any;
  onAdminister: (data: {
    prescriptionId: string;
    patientId: string;
    medicationName: string;
    dosage: string;
    route: string;
    site?: string;
    preconditionValue?: number;
    witnessId?: string;
    witnessName?: string;
    notes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function MedicationAdministrationModal({
  open,
  onOpenChange,
  prescription,
  patient,
  onAdminister,
  isLoading = false,
}: MedicationAdministrationModalProps) {
  // 5 Rights
  const [fiveRights, setFiveRights] = useState<FiveRightsChecklist>({
    rightPatient: true,
    rightDrug: false,
    rightDose: false,
    rightRoute: false,
    rightTime: false,
  });

  // Precondition checks
  const [preconditionInput, setPreconditionInput] = useState('');
  const [preconditionOverridden, setPreconditionOverridden] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Dual witness for high alert
  const [witnessName, setWitnessName] = useState('');
  const [witnessConfirmed, setWitnessConfirmed] = useState(false);

  // Administration Details
  const [selectedRoute, setSelectedRoute] = useState('Oral');
  const [selectedSite, setSelectedSite] = useState('');
  const [notes, setNotes] = useState('');

  const medName = prescription?.medication_name || '';
  const isHighAlert = useMemo(() => isHighAlertMedication(medName), [medName]);
  const preconditionRule = useMemo(() => getPreconditionsForMedication(medName), [medName]);

  // Route defaults
  useEffect(() => {
    if (prescription && open) {
      setFiveRights({
        rightPatient: true,
        rightDrug: false,
        rightDose: false,
        rightRoute: false,
        rightTime: false,
      });
      setPreconditionInput('');
      setPreconditionOverridden(false);
      setOverrideReason('');
      setWitnessName('');
      setWitnessConfirmed(false);
      setNotes('');

      const dosageStr = (prescription.dosage || '').toLowerCase();
      if (dosageStr.includes('iv') || dosageStr.includes('infusion')) {
        setSelectedRoute('Intravenous (IV Push)');
        setSelectedSite('Peripheral IV Line');
      } else if (dosageStr.includes('subq') || dosageStr.includes('subcutaneous')) {
        setSelectedRoute('Subcutaneous (SubQ)');
        setSelectedSite('Right Abdomen SubQ');
      } else if (dosageStr.includes('im') || dosageStr.includes('intramuscular')) {
        setSelectedRoute('Intramuscular (IM)');
        setSelectedSite('Right Deltoid');
      } else {
        setSelectedRoute('Oral');
        setSelectedSite('');
      }
    }
  }, [prescription, open]);

  if (!prescription || !patient) return null;

  // Evaluate Precondition
  const numericPrecondition = parseFloat(preconditionInput);
  const isPreconditionBreached =
    preconditionRule &&
    Number.isFinite(numericPrecondition) &&
    preconditionRule.minAllowed !== undefined &&
    numericPrecondition < preconditionRule.minAllowed;

  const isPreconditionMissing =
    preconditionRule && (!preconditionInput || isNaN(numericPrecondition));

  const allFiveRightsSatisfied = areFiveRightsSatisfied(fiveRights);

  const canSubmit =
    allFiveRightsSatisfied &&
    (!isHighAlert || (witnessConfirmed && witnessName.trim().length >= 3)) &&
    (!preconditionRule ||
      (!isPreconditionMissing &&
        (!isPreconditionBreached ||
          (preconditionOverridden && overrideReason.trim().length >= 5))));

  const handleToggleRight = (key: keyof FiveRightsChecklist) => {
    setFiveRights((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(
        'Please complete all 5 Rights, clinical vital checks, and high-alert witness requirements.'
      );
      return;
    }

    await onAdminister({
      prescriptionId: prescription.id,
      patientId: patient.id,
      medicationName: prescription.medication_name,
      dosage: prescription.dosage,
      route: selectedRoute,
      site: selectedSite.trim() || undefined,
      preconditionValue: Number.isFinite(numericPrecondition) ? numericPrecondition : undefined,
      witnessName: isHighAlert ? witnessName.trim() : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Syringe className="h-5 w-5 text-emerald-600" />
              <span>Inpatient Medication Administration (eMAR)</span>
            </DialogTitle>
            {isHighAlert ? (
              <Badge variant="destructive" className="animate-pulse font-bold">
                ISMP High Alert
              </Badge>
            ) : (
              <Badge variant="outline">Standard Administration</Badge>
            )}
          </div>
          <DialogDescription>
            Verify the 5 Rights of Medication Administration, review pre-condition vitals, and log
            clinical administration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Patient and Drug Header */}
          <div className="rounded-lg border bg-muted/40 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block">Patient</span>
              <strong className="text-foreground">
                {patient.first_name} {patient.last_name}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground block">MRN</span>
              <span className="font-mono">{patient.mrn || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Prescription</span>
              <strong className="text-primary">{prescription.medication_name}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Prescribed Dose</span>
              <span className="font-semibold">
                {prescription.dosage} ({prescription.frequency})
              </span>
            </div>
          </div>

          {/* High-Alert Dual-Witness Banner (ISMP) */}
          {isHighAlert && (
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-destructive uppercase tracking-wide">
                    Mandatory Dual-Nurse Independent Witness Verification
                  </h4>
                  <p className="text-xs text-destructive/90">
                    High-alert medication protocol requires a secondary licensed nurse to
                    independently verify the patient, vial/bag label, dosage calculation, and pump
                    settings.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-destructive/20 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="witness-name" className="text-xs font-semibold text-destructive">
                    Witnessing Nurse Name / Staff ID *
                  </Label>
                  <Input
                    id="witness-name"
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    placeholder="e.g. Nurse Brenda Davis, RN (#5512)"
                    className="h-8 text-xs font-medium"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-5">
                  <Checkbox
                    id="witness-confirm"
                    checked={witnessConfirmed}
                    onCheckedChange={(c) => setWitnessConfirmed(Boolean(c))}
                  />
                  <label
                    htmlFor="witness-confirm"
                    className="text-xs font-semibold text-destructive cursor-pointer"
                  >
                    Witness verifies 5 Rights & syringe/pump calibration
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Precondition Vital Check */}
          {preconditionRule && (
            <div
              className={`rounded-lg border p-3 space-y-2 text-xs ${
                isPreconditionBreached
                  ? 'border-destructive bg-destructive/10'
                  : 'border-blue-500/30 bg-blue-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <HeartPulse className="h-4 w-4 text-primary" />
                  Required Clinical Pre-Condition: {preconditionRule.parameterName}
                </span>
                <Badge
                  variant={isPreconditionBreached ? 'destructive' : 'outline'}
                  className="text-[10px]"
                >
                  Safe Minimum: &gt;= {preconditionRule.minAllowed} {preconditionRule.unit}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-48">
                  <Input
                    type="number"
                    step="any"
                    placeholder={`Enter ${preconditionRule.parameterName}`}
                    value={preconditionInput}
                    onChange={(e) => setPreconditionInput(e.target.value)}
                    className="h-8 text-xs font-mono font-semibold"
                  />
                </div>
                <span className="text-muted-foreground font-medium">{preconditionRule.unit}</span>
              </div>

              {isPreconditionBreached && (
                <div className="space-y-2 pt-2 border-t border-destructive/20 text-destructive">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{preconditionRule.warningMessage}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="override-precondition"
                      checked={preconditionOverridden}
                      onCheckedChange={(c) => setPreconditionOverridden(Boolean(c))}
                    />
                    <label
                      htmlFor="override-precondition"
                      className="text-xs font-semibold cursor-pointer"
                    >
                      Physician verbal override obtained to administer despite low parameter
                    </label>
                  </div>
                  {preconditionOverridden && (
                    <Input
                      placeholder="Enter physician override rationale & ordering doctor name..."
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="h-7 text-xs"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5 Rights Checklist Matrix */}
          <div className="space-y-2 rounded-lg border p-3.5 bg-card shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              The 5 Rights of Medication Administration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div
                onClick={() => handleToggleRight('rightPatient')}
                className={`p-2 rounded border flex items-center gap-2 cursor-pointer transition-colors ${
                  fiveRights.rightPatient
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-muted/20'
                }`}
              >
                <Checkbox checked={fiveRights.rightPatient} />
                <div>
                  <strong>1. Right Patient:</strong> {patient.first_name} {patient.last_name}
                </div>
              </div>

              <div
                onClick={() => handleToggleRight('rightDrug')}
                className={`p-2 rounded border flex items-center gap-2 cursor-pointer transition-colors ${
                  fiveRights.rightDrug ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-muted/20'
                }`}
              >
                <Checkbox checked={fiveRights.rightDrug} />
                <div>
                  <strong>2. Right Drug:</strong> {prescription.medication_name}
                </div>
              </div>

              <div
                onClick={() => handleToggleRight('rightDose')}
                className={`p-2 rounded border flex items-center gap-2 cursor-pointer transition-colors ${
                  fiveRights.rightDose ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-muted/20'
                }`}
              >
                <Checkbox checked={fiveRights.rightDose} />
                <div>
                  <strong>3. Right Dose:</strong> {prescription.dosage}
                </div>
              </div>

              <div
                onClick={() => handleToggleRight('rightRoute')}
                className={`p-2 rounded border flex items-center gap-2 cursor-pointer transition-colors ${
                  fiveRights.rightRoute ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-muted/20'
                }`}
              >
                <Checkbox checked={fiveRights.rightRoute} />
                <div>
                  <strong>4. Right Route:</strong> {selectedRoute}
                </div>
              </div>

              <div
                onClick={() => handleToggleRight('rightTime')}
                className={`p-2 rounded border flex items-center gap-2 cursor-pointer transition-colors sm:col-span-2 ${
                  fiveRights.rightTime ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-muted/20'
                }`}
              >
                <Checkbox checked={fiveRights.rightTime} />
                <div>
                  <strong>5. Right Time:</strong> Within scheduled administration window (+/- 60
                  min)
                </div>
              </div>
            </div>
          </div>

          {/* Route & Injection Site Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Administration Route *</Label>
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Oral">Oral (PO)</SelectItem>
                  <SelectItem value="Intravenous (IV Push)">Intravenous (IV Push)</SelectItem>
                  <SelectItem value="Intravenous (IV Piggyback)">
                    Intravenous (IV Piggyback)
                  </SelectItem>
                  <SelectItem value="Subcutaneous (SubQ)">Subcutaneous (SubQ)</SelectItem>
                  <SelectItem value="Intramuscular (IM)">Intramuscular (IM)</SelectItem>
                  <SelectItem value="Sublingual">Sublingual</SelectItem>
                  <SelectItem value="Inhalation">Inhalation (Nebulizer / MDI)</SelectItem>
                  <SelectItem value="Topical / Transdermal">Topical / Transdermal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="admin-site" className="text-xs font-semibold">
                Anatomical Site / Line
              </Label>
              <Input
                id="admin-site"
                placeholder="e.g. Left Antecubital IV, Right Upper Arm SubQ"
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Nurse Notes */}
          <div className="space-y-1">
            <Label htmlFor="admin-notes" className="text-xs font-semibold">
              Administration Remarks / Patient Response
            </Label>
            <Textarea
              id="admin-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dose tolerated well with water, no acute discomfort."
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSubmit}
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Sign & Administer Dose
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
