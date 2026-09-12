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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  LogOut,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { usePatients } from '@/lib/hooks/patients';
import { toast } from 'sonner';

export interface InitiateDischargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInitiate: (data: {
    patientId: string;
    consultationId?: string;
    isAMA: boolean;
    metadata: Record<string, unknown>;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function InitiateDischargeModal({
  open,
  onOpenChange,
  onInitiate,
  isLoading = false,
}: InitiateDischargeModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [consultationId, setConsultationId] = useState('');
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('');
  const [dischargeDisposition, setDischargeDisposition] = useState('home');
  const [conditionAtDischarge, setConditionAtDischarge] = useState('stable');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpDoctor, setFollowUpDoctor] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');

  // Against Medical Advice (AMA) fields
  const [isAMA, setIsAMA] = useState(false);
  const [mentalCapacityVerified, setMentalCapacityVerified] = useState(false);
  const [informedRefusalNotes, setInformedRefusalNotes] = useState('');
  const [waiverSigned, setWaiverSigned] = useState(false);

  const { data: patients, isLoading: isLoadingPatients } = usePatients();

  // Reset form on open
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setSelectedPatientId('');
      setConsultationId('');
      setDischargeDiagnosis('');
      setDischargeDisposition('home');
      setConditionAtDischarge('stable');
      setFollowUpDate('');
      setFollowUpDoctor('');
      setClinicalSummary('');
      setIsAMA(false);
      setMentalCapacityVerified(false);
      setInformedRefusalNotes('');
      setWaiverSigned(false);
    }
  }, [open]);

  // Filter patients by search term
  const filteredPatients = (patients || []).filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const mrn = (p.mrn || '').toLowerCase();
    return fullName.includes(term) || mrn.includes(term);
  });

  const selectedPatient = (patients || []).find((p) => p.id === selectedPatientId);

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient to initiate discharge.');
      return;
    }

    if (isAMA) {
      if (!mentalCapacityVerified) {
        toast.error(
          'AMA discharge requires clinician verification of patient decision-making capacity.'
        );
        return;
      }
      if (!waiverSigned) {
        toast.error('AMA discharge requires confirmation of signed Against Medical Advice waiver.');
        return;
      }
      if (informedRefusalNotes.trim().length < 10) {
        toast.error(
          'Please document informed refusal counseling (risks explained: decompensation, death).'
        );
        return;
      }
    } else {
      if (!dischargeDiagnosis.trim()) {
        toast.error('Please specify a primary discharge diagnosis.');
        return;
      }
    }

    const metadata: Record<string, unknown> = {
      clinicalSummary: {
        dischargeDiagnosis: dischargeDiagnosis.trim(),
        dischargeDisposition,
        conditionAtDischarge,
        followUpDate: followUpDate || null,
        followUpDoctor: followUpDoctor.trim() || null,
        clinicalNotes: clinicalSummary.trim(),
      },
      patientInfo: {
        name: selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : null,
        mrn: selectedPatient?.mrn || null,
      },
      ...(isAMA
        ? {
            amaDischarge: {
              isAMA: true,
              mentalCapacityVerified,
              informedRefusalNotes: informedRefusalNotes.trim(),
              waiverSigned,
              executedAt: new Date().toISOString(),
            },
          }
        : {}),
    };

    await onInitiate({
      patientId: selectedPatientId,
      consultationId: consultationId.trim() || undefined,
      isAMA,
      metadata,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <LogOut className="h-5 w-5" />
            <span>Initiate Inpatient Clinical Discharge</span>
          </DialogTitle>
          <DialogDescription>
            Prepare clinical discharge summary and handoff to Pharmacy for medication
            reconciliation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Patient Search & Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Select Patient *
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search patient by name or MRN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs mb-2"
              />
            </div>
            <div className="max-h-36 overflow-y-auto border rounded-md divide-y bg-muted/20">
              {isLoadingPatients ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  Loading patients...
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No matching patients found
                </div>
              ) : (
                filteredPatients.slice(0, 8).map((p) => {
                  const isSelected = p.id === selectedPatientId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`p-2 text-xs flex justify-between items-center cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 font-semibold text-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div>
                        <span>
                          {p.first_name} {p.last_name}
                        </span>
                        <span className="text-muted-foreground ml-2 font-mono">
                          MRN: {p.mrn || 'N/A'}
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {selectedPatient && (
            <div className="p-2.5 rounded-lg border bg-primary/5 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Selected: </span>
                <strong>
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">MRN: </span>
                <span className="font-mono">{selectedPatient.mrn || 'N/A'}</span>
              </div>
            </div>
          )}

          {/* Consultation ID (Optional) */}
          <div className="space-y-1">
            <Label htmlFor="consultation-id" className="text-xs">
              Linked Encounter / Consultation UUID (Optional)
            </Label>
            <Input
              id="consultation-id"
              value={consultationId}
              onChange={(e) => setConsultationId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              className="h-8 text-xs font-mono"
            />
          </div>

          {/* Discharge Diagnosis */}
          <div className="space-y-1">
            <Label htmlFor="discharge-diag" className="text-xs font-semibold">
              Primary Discharge Diagnosis (ICD-10) *
            </Label>
            <Input
              id="discharge-diag"
              value={dischargeDiagnosis}
              onChange={(e) => setDischargeDiagnosis(e.target.value)}
              placeholder="e.g. Acute Heart Failure, Exacerbation (I50.21)"
              className="h-8 text-xs"
            />
          </div>

          {/* Disposition & Condition Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Discharge Disposition *</Label>
              <Select value={dischargeDisposition} onValueChange={setDischargeDisposition}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home (Self-Care)</SelectItem>
                  <SelectItem value="home_health">Home with Home Health Care</SelectItem>
                  <SelectItem value="skilled_nursing">Skilled Nursing Facility (SNF)</SelectItem>
                  <SelectItem value="rehabilitation">Inpatient Rehabilitation</SelectItem>
                  <SelectItem value="transfer_hospital">Transfer to Acute Care Hospital</SelectItem>
                  <SelectItem value="hospice">Hospice Care</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Clinical Condition at Discharge *</Label>
              <Select value={conditionAtDischarge} onValueChange={setConditionAtDischarge}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable / Improved</SelectItem>
                  <SelectItem value="improved">Markedly Improved</SelectItem>
                  <SelectItem value="guarded">Guarded / Chronic Baseline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Follow-up Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="followup-date" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                Follow-up Appointment Date
              </Label>
              <Input
                id="followup-date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="followup-doctor" className="text-xs">
                Follow-up Clinic / Doctor
              </Label>
              <Input
                id="followup-doctor"
                value={followUpDoctor}
                onChange={(e) => setFollowUpDoctor(e.target.value)}
                placeholder="e.g. Dr. Adams, Cardiology Clinic"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Clinical Discharge Summary */}
          <div className="space-y-1">
            <Label htmlFor="clinical-notes" className="text-xs flex items-center gap-1">
              <FileText className="h-3 w-3 text-muted-foreground" />
              Clinical Discharge Summary & Patient Instructions
            </Label>
            <Textarea
              id="clinical-notes"
              value={clinicalSummary}
              onChange={(e) => setClinicalSummary(e.target.value)}
              placeholder="Summary of hospital course, resolved issues, activity restrictions, and red-flag symptoms for ER return..."
              rows={3}
              className="text-xs"
            />
          </div>

          {/* Against Medical Advice (AMA) Fast-Track Panel */}
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="is-ama"
                checked={isAMA}
                onCheckedChange={(c) => setIsAMA(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <label
                  htmlFor="is-ama"
                  className="text-xs font-bold text-destructive cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                  Discharge Against Medical Advice (AMA)
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Bypasses regular sequential clearance when a mentally competent patient refuses
                  further hospitalization against clinical recommendation.
                </p>
              </div>
            </div>

            {isAMA && (
              <div className="space-y-2.5 pt-2 border-t border-destructive/20 text-xs">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="capacity-check"
                    checked={mentalCapacityVerified}
                    onCheckedChange={(c) => setMentalCapacityVerified(Boolean(c))}
                  />
                  <label
                    htmlFor="capacity-check"
                    className="font-semibold text-foreground cursor-pointer"
                  >
                    I certify that patient demonstrates decision-making capacity (alert, oriented
                    x4, sober, non-psychotic).
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="waiver-check"
                    checked={waiverSigned}
                    onCheckedChange={(c) => setWaiverSigned(Boolean(c))}
                  />
                  <label
                    htmlFor="waiver-check"
                    className="font-semibold text-foreground cursor-pointer"
                  >
                    Signed AMA Refusal & Liability Waiver obtained (or witnessed verbal refusal
                    documented).
                  </label>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ama-notes" className="text-xs font-semibold text-destructive">
                    Informed Refusal & Risk Counseling Documentation *
                  </Label>
                  <Textarea
                    id="ama-notes"
                    value={informedRefusalNotes}
                    onChange={(e) => setInformedRefusalNotes(e.target.value)}
                    placeholder="Document specific risks explained to patient (e.g. permanent organ damage, sudden cardiac death) and patient's stated reason for leaving."
                    rows={2}
                    className="text-xs"
                  />
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
          <Button
            type="button"
            variant={isAMA ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={isLoading || !selectedPatientId}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Submitting...
              </>
            ) : isAMA ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-1.5" />
                Execute AMA Discharge
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Initiate Discharge to Pharmacy
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
