/**
 * RadiologyReportingModal.tsx
 * Structured ACR Diagnostic Radiology Reporting Workspace
 *
 * Implements:
 * - Structured ACR reporting sections: History, Technique, Comparison, Findings, Impression
 * - Two-Stage Sign-Off: Preliminary Wet Read vs Finalized Digital Signature
 * - Critical Findings (Panic Read) flag & Closed-Loop Verbal Read-Back Documentation
 */

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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  PhoneCall,
  Lock,
} from 'lucide-react';
import { RadiologyOrder, useRadiologyOrders } from '@/hooks/useRadiologyOrders';
import {
  CRITICAL_RADIOLOGY_FINDINGS,
  validateCriticalReadBack,
} from '@/lib/clinical/radiologyWorkflowRules';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RadiologyReportingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: RadiologyOrder | null;
}

export function RadiologyReportingModal({
  open,
  onOpenChange,
  order,
}: RadiologyReportingModalProps) {
  const { profile } = useAuth();
  const { submitPreliminaryRead, submitFinalReport, recordCriticalFindingReadBack } =
    useRadiologyOrders();

  const [clinicalHistory, setClinicalHistory] = useState('');
  const [technique, setTechnique] = useState('');
  const [comparison, setComparison] = useState('No prior comparison studies available on PACS.');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');

  // Critical finding alert state
  const [isCritical, setIsCritical] = useState(false);
  const [criticalCode, setCriticalCode] = useState<string>('PNEUMO-TENSION');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [readBackConfirmed, setReadBackConfirmed] = useState(false);

  // Initialize fields from order
  useEffect(() => {
    if (order && open) {
      setClinicalHistory(order.metadata?.clinicalIndication || order.notes || '');
      setTechnique(
        `${order.metadata?.modality?.toUpperCase() || 'CT'} examination of the ${order.metadata?.anatomicalRegion?.replace('_', ' ') || 'chest'} performed with ${
          order.metadata?.contrastProtocol?.replace('_', ' ') || 'standard protocol'
        }. Reconstructed in axial, coronal, and sagittal planes.`
      );

      // Existing preliminary read
      if (order.metadata?.preliminaryRead) {
        setImpression(order.metadata.preliminaryRead.impression);
      }

      // Existing final report results
      if (order.results) {
        setClinicalHistory(order.results.clinicalHistory || '');
        setTechnique(order.results.technique || '');
        setComparison(order.results.comparison || '');
        setFindings(order.results.findings || '');
        setImpression(order.results.impression || '');
      }

      setIsCritical(!!order.is_critical);
      if (order.metadata?.criticalFindingCode) {
        setCriticalCode(order.metadata.criticalFindingCode);
      }
      if (order.doctor) {
        setDoctorName(`Dr. ${order.doctor.first_name} ${order.doctor.last_name}`);
      }
    }
  }, [order, open]);

  if (!order) return null;

  const isAlreadyFinalized = order.status === 'completed';
  const radiologistName = profile
    ? `Dr. ${profile.first_name} ${profile.last_name}, MD (Radiology)`
    : 'Attending Radiologist';

  const handleSavePreliminary = () => {
    if (!impression.trim()) {
      toast.error('Preliminary impression text is required.');
      return;
    }

    submitPreliminaryRead.mutate(
      {
        orderId: order.id,
        impression: impression.trim(),
        radiologistName,
        isCritical,
        criticalFindingCode: isCritical ? criticalCode : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleFinalizeReport = () => {
    if (!findings.trim()) {
      toast.error('Detailed findings are required for a finalized report.');
      return;
    }
    if (!impression.trim()) {
      toast.error('Impression summary is required for a finalized report.');
      return;
    }

    // If critical, enforce closed-loop read-back documentation
    if (isCritical) {
      const readBackValidation = validateCriticalReadBack({
        orderingDoctorName: doctorName,
        doctorPhoneNumber: doctorPhone,
        readBackConfirmed,
        calledAt: new Date().toISOString(),
        radiologistName,
      });

      if (!readBackValidation.valid) {
        toast.error(
          readBackValidation.error ||
            'Closed-loop verbal read-back documentation is mandatory for critical findings.'
        );
        return;
      }
    }

    submitFinalReport.mutate(
      {
        orderId: order.id,
        report: {
          clinicalHistory,
          technique,
          comparison,
          findings,
          impression,
          radiologistName,
          isCritical,
          criticalFindingCode: isCritical ? criticalCode : undefined,
        },
      },
      {
        onSuccess: () => {
          if (isCritical && readBackConfirmed) {
            recordCriticalFindingReadBack.mutate({
              orderId: order.id,
              readBack: {
                orderingDoctorName: doctorName,
                doctorPhoneNumber: doctorPhone,
                readBackConfirmed: true,
                calledAt: new Date().toISOString(),
                radiologistName,
              },
            });
          }
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Radiology Diagnostic Report Workspace
          </DialogTitle>
          <DialogDescription>
            Structured ACR documentation with preliminary wet read and finalized digital signature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Patient & Study Header */}
          <div className="p-3 bg-muted/60 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <p className="font-bold text-sm text-foreground">
                {order.patient?.first_name} {order.patient?.last_name}
              </p>
              <p className="text-muted-foreground font-mono">MRN: {order.patient?.mrn}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-semibold text-foreground">{order.test_name}</p>
              <Badge
                variant={isAlreadyFinalized ? 'default' : 'secondary'}
                className="text-[10px] uppercase mt-0.5"
              >
                {isAlreadyFinalized
                  ? 'Report Finalized & Locked'
                  : order.metadata?.preliminaryRead
                    ? 'Preliminary Read Active'
                    : 'Unreported Study'}
              </Badge>
            </div>
          </div>

          {/* Section 1: Clinical History */}
          <div className="space-y-1.5">
            <Label className="font-bold text-xs">1. Clinical History & Indication</Label>
            <Input
              value={clinicalHistory}
              onChange={(e) => setClinicalHistory(e.target.value)}
              disabled={isAlreadyFinalized}
              placeholder="Clinical reason, symptoms, or acute presentation..."
            />
          </div>

          {/* Section 2: Technique & Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-bold text-xs">2. Technique & Protocol</Label>
              <Input
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
                disabled={isAlreadyFinalized}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-xs">3. Comparison Studies</Label>
              <Input
                value={comparison}
                onChange={(e) => setComparison(e.target.value)}
                disabled={isAlreadyFinalized}
              />
            </div>
          </div>

          {/* Section 4: Detailed Findings */}
          <div className="space-y-1.5">
            <Label className="font-bold text-xs">4. Detailed Diagnostic Findings</Label>
            <Textarea
              rows={4}
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              disabled={isAlreadyFinalized}
              placeholder="Systematic organ-by-organ evaluation (e.g. Lungs: No focal consolidation or pneumothorax. Mediastinum: Normal contour. Osseous: No acute fractures)..."
            />
          </div>

          {/* Section 5: Impression */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs text-primary">
                5. Impression (Diagnostic Conclusion) *
              </Label>
              <span className="text-[11px] text-muted-foreground">Numbered clinical summary</span>
            </div>
            <Textarea
              rows={3}
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              disabled={isAlreadyFinalized}
              placeholder="1. Normal non-contrast head CT without acute intracranial hemorrhage or territorial infarction.&#10;2. No midline shift or mass effect."
              className="font-medium"
              required
            />
          </div>

          {/* Critical Finding Panic Read Toggle */}
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-destructive">
              <Checkbox
                checked={isCritical}
                onCheckedChange={(c) => setIsCritical(!!c)}
                disabled={isAlreadyFinalized}
              />
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                CRITICAL / LIFE-THREATENING FINDING (Joint Commission Panic Read)
              </span>
            </label>

            {isCritical && (
              <div className="space-y-3 pt-1 border-t border-destructive/20">
                <div className="space-y-1">
                  <Label className="text-xs">Critical Finding Classification *</Label>
                  <Select
                    value={criticalCode}
                    onValueChange={setCriticalCode}
                    disabled={isAlreadyFinalized}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-900 border-destructive/40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {CRITICAL_RADIOLOGY_FINDINGS.map((cf) => (
                        <SelectItem key={cf.code} value={cf.code}>
                          {cf.name} ({cf.recommendedAction})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Closed-Loop Read-Back Documentation */}
                <div className="p-2.5 bg-white dark:bg-slate-950 border border-destructive/40 rounded-md space-y-2">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <PhoneCall className="h-3.5 w-3.5 text-destructive" />
                    Closed-Loop Verbal Read-Back Documentation (Mandatory SLA: 30 Mins)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Ordering Physician Spoken To *</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Dr. Name"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        disabled={isAlreadyFinalized}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Direct Phone Number Called *</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Ext / Mobile (e.g. +91 98765 43210)"
                        value={doctorPhone}
                        onChange={(e) => setDoctorPhone(e.target.value)}
                        disabled={isAlreadyFinalized}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <Checkbox
                      checked={readBackConfirmed}
                      onCheckedChange={(c) => setReadBackConfirmed(!!c)}
                      disabled={isAlreadyFinalized}
                    />
                    <span className="text-[11px] font-medium text-foreground">
                      Physician repeated verbal read-back of the critical finding and acknowledged
                      immediate clinical action.
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Radiologist Credential Signature */}
          <div className="p-3 bg-muted/40 rounded-lg border flex justify-between items-center text-xs">
            <div>
              <p className="text-muted-foreground uppercase text-[10px] font-bold">
                Reporting Radiologist
              </p>
              <p className="font-semibold text-foreground mt-0.5">{radiologistName}</p>
            </div>
            {isAlreadyFinalized && (
              <Badge variant="default" className="bg-green-600 text-white flex items-center gap-1">
                <Lock className="h-3 w-3" /> Digitally Signed
              </Badge>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          {!isAlreadyFinalized && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSavePreliminary}
                disabled={submitPreliminaryRead.isPending || !impression.trim()}
              >
                {submitPreliminaryRead.isPending ? 'Saving...' : 'Save Preliminary Read (Wet Read)'}
              </Button>

              <Button
                type="button"
                onClick={handleFinalizeReport}
                disabled={submitFinalReport.isPending || !impression.trim() || !findings.trim()}
                className="bg-primary text-white"
              >
                {submitFinalReport.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing Report...
                  </>
                ) : (
                  'Finalize & Sign Report'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
