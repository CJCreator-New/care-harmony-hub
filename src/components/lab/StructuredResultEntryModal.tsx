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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, TestTube2, FileText, Sparkles, Loader2 } from 'lucide-react';
import {
  matchLabPanel,
  evaluateLabPanel,
  LabPanelDefinition,
  PanelEvaluationResult,
} from '@/modules/critical-lab-escalation';
import { AIResultInterpretation } from '@/components/lab/AIResultInterpretation';
import { toast } from 'sonner';

export interface StructuredResultEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSubmitResults: (data: {
    orderId: string;
    rawValues: Record<string, any>;
    resultNotes: string;
    isCritical: boolean;
    criticalSummary?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function StructuredResultEntryModal({
  open,
  onOpenChange,
  order,
  onSubmitResults,
  isLoading = false,
}: StructuredResultEntryModalProps) {
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [genericResult, setGenericResult] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [manualCritical, setManualCritical] = useState(false);
  const [verifiedOnRepeat, setVerifiedOnRepeat] = useState(false);

  // Match test panel definition
  const matchedPanel: LabPanelDefinition | null = useMemo(() => {
    if (!order?.test_name) return null;
    return matchLabPanel(order.test_name);
  }, [order?.test_name]);

  // Evaluate panel results in real time
  const panelEvaluation: PanelEvaluationResult | null = useMemo(() => {
    if (!matchedPanel) return null;
    return evaluateLabPanel(matchedPanel, paramValues);
  }, [matchedPanel, paramValues]);

  // Determine if critical panic values exist (automated or manual)
  const isCritical = Boolean(panelEvaluation?.hasCriticalPanic || manualCritical);

  // Reset or initialize state when order changes
  useEffect(() => {
    if (order && open) {
      setParamValues({});
      setGenericResult('');
      setResultNotes(order.result_notes || '');
      setManualCritical(Boolean(order.is_critical));
      setVerifiedOnRepeat(false);

      // Pre-fill if previous results exist
      if (order.results && typeof order.results === 'object' && !Array.isArray(order.results)) {
        const prevParams = (order.results as any).rawValues;
        if (prevParams && typeof prevParams === 'object') {
          const stringified: Record<string, string> = {};
          for (const [k, v] of Object.entries(prevParams)) {
            stringified[k] = String(v ?? '');
          }
          setParamValues(stringified);
        }
      }
    }
  }, [order, open]);

  // Auto-sync formatted report into resultNotes if user clicks generate
  const handleAutoGenerateReport = () => {
    if (panelEvaluation) {
      setResultNotes(panelEvaluation.formattedReport);
      toast.success('Generated structured report preview from panel parameters.');
    }
  };

  const handleParamChange = (paramId: string, val: string) => {
    setParamValues((prev) => ({
      ...prev,
      [paramId]: val,
    }));
  };

  const handleSubmit = async () => {
    if (!order?.id) return;

    if (matchedPanel) {
      const enteredCount = Object.values(paramValues).filter((v) => v.trim() !== '').length;
      if (enteredCount === 0) {
        toast.error('Please enter at least one parameter result for this panel.');
        return;
      }
    } else if (!genericResult.trim() && !resultNotes.trim()) {
      toast.error('Please enter result findings or notes before submitting.');
      return;
    }

    if (isCritical && !verifiedOnRepeat) {
      toast.error(
        'Please acknowledge that critical panic values have been verified prior to submission.'
      );
      return;
    }

    const finalNotes =
      resultNotes.trim() ||
      (panelEvaluation ? panelEvaluation.formattedReport : genericResult.trim());

    await onSubmitResults({
      orderId: order.id,
      rawValues: matchedPanel ? paramValues : { value: genericResult },
      resultNotes: finalNotes,
      isCritical,
      criticalSummary: panelEvaluation?.hasCriticalPanic
        ? panelEvaluation.criticalSummary
        : undefined,
    });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-primary" />
              <span>Structured Lab Result Entry</span>
            </DialogTitle>
            <Badge variant="outline" className="capitalize">
              {order.priority || 'Normal'} Priority
            </Badge>
          </div>
          <DialogDescription>
            Enter analytical test values. Reference ranges and critical panic thresholds will be
            automatically evaluated per CAP / CLIA protocols.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2 text-sm">
          {/* Order Details Banner */}
          <div className="rounded-lg border bg-muted/40 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block">Patient</span>
              <strong className="text-foreground">
                {order.patient
                  ? `${order.patient.first_name} ${order.patient.last_name}`
                  : order.patient_id}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Test Name</span>
              <strong className="text-foreground">{order.test_name}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Category</span>
              <span>
                {order.test_category || (matchedPanel ? matchedPanel.category : 'General')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Container / Matrix</span>
              <span className="text-primary font-medium">
                {matchedPanel ? matchedPanel.tubeColor : 'Standard'}
              </span>
            </div>
          </div>

          {/* Automated Panic Alert Banner if breached */}
          {isCritical && (
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-3.5 space-y-2 animate-pulse">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-destructive flex items-center gap-2">
                    CRITICAL LAB VALUE DETECTED — RAPID ESCALATION REQUIRED
                  </h4>
                  <p className="text-xs text-destructive/90">
                    {panelEvaluation?.criticalSummary ||
                      'One or more values breached clinical panic thresholds.'}
                  </p>
                  <p className="text-xs font-semibold text-destructive">
                    Submitting this result initiates the 15-minute closed-loop notification SLA and
                    alerts the attending clinician.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1 border-t border-destructive/20">
                <Checkbox
                  id="panic-verify"
                  checked={verifiedOnRepeat}
                  onCheckedChange={(c) => setVerifiedOnRepeat(Boolean(c))}
                />
                <label
                  htmlFor="panic-verify"
                  className="text-xs font-semibold text-destructive cursor-pointer"
                >
                  I verify that critical values were re-checked / delta-checked against previous
                  patient specimens.
                </label>
              </div>
            </div>
          )}

          {/* Structured Panel Parameters (if matched standard panel) */}
          {matchedPanel ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {matchedPanel.panelName} Parameter Matrix
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoGenerateReport}
                  className="h-7 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                  Generate Report Text
                </Button>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs">
                      <TableHead className="w-[30%]">Parameter</TableHead>
                      <TableHead className="w-[20%]">Reference Range</TableHead>
                      <TableHead className="w-[20%]">Panic Threshold</TableHead>
                      <TableHead className="w-[18%]">Result Value</TableHead>
                      <TableHead className="w-[12%] text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedPanel.parameters.map((param) => {
                      const evalRes = panelEvaluation?.results.find(
                        (r) => r.parameterId === param.id
                      );
                      const currentVal = paramValues[param.id] || '';

                      return (
                        <TableRow
                          key={param.id}
                          className={evalRes?.isCritical ? 'bg-destructive/5' : undefined}
                        >
                          <TableCell className="font-medium py-2">
                            <div>{param.name}</div>
                            <span className="text-[11px] text-muted-foreground">
                              Unit: {param.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2">
                            {param.normalMin} - {param.normalMax} {param.unit}
                          </TableCell>
                          <TableCell className="text-xs text-destructive py-2">
                            {param.criticalLow !== undefined && param.criticalHigh !== undefined
                              ? `< ${param.criticalLow} or > ${param.criticalHigh}`
                              : param.criticalLow !== undefined
                                ? `< ${param.criticalLow}`
                                : param.criticalHigh !== undefined
                                  ? `> ${param.criticalHigh}`
                                  : 'None'}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="any"
                                value={currentVal}
                                onChange={(e) => handleParamChange(param.id, e.target.value)}
                                placeholder="0.0"
                                className={`h-8 text-xs font-mono font-medium ${
                                  evalRes?.isCritical
                                    ? 'border-destructive focus-visible:ring-destructive'
                                    : evalRes && evalRes.status !== 'normal'
                                      ? 'border-amber-500'
                                      : ''
                                }`}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            {!evalRes ? (
                              <span className="text-xs text-muted-foreground">--</span>
                            ) : evalRes.isCritical ? (
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1.5 py-0 font-bold uppercase animate-pulse"
                              >
                                Panic {evalRes.status === 'critical_high' ? 'High' : 'Low'}
                              </Badge>
                            ) : evalRes.status === 'high' ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-amber-100 text-amber-900 border-amber-300"
                              >
                                High
                              </Badge>
                            ) : evalRes.status === 'low' ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-blue-100 text-blue-900 border-blue-300"
                              >
                                Low
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300"
                              >
                                Normal
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            /* Non-panel / generic test entry */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="generic-result" className="text-xs font-semibold">
                  Analytical Result / Value *
                </Label>
                <Input
                  id="generic-result"
                  value={genericResult}
                  onChange={(e) => setGenericResult(e.target.value)}
                  placeholder="e.g. 142 mmol/L, Reactive, Negative, 1.025"
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <Checkbox
                  id="manual-critical-check"
                  checked={manualCritical}
                  onCheckedChange={(c) => setManualCritical(Boolean(c))}
                />
                <label
                  htmlFor="manual-critical-check"
                  className="text-xs font-semibold text-destructive cursor-pointer"
                >
                  Mark this result as Critical Panic Value (Initiates rapid physician escalation)
                </label>
              </div>
            </div>
          )}

          {/* Formatted Clinical Notes / Narrative Report */}
          <div className="space-y-1.5">
            <Label
              htmlFor="result-notes"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Clinical Lab Report & Diagnostic Remarks
            </Label>
            <Textarea
              id="result-notes"
              value={resultNotes}
              onChange={(e) => setResultNotes(e.target.value)}
              placeholder="Detailed findings, method description, or specimen condition remarks..."
              rows={5}
              className="text-xs font-mono"
            />
          </div>

          {/* AI Clinical Interpretation Engine */}
          {(resultNotes.length > 10 || (panelEvaluation && panelEvaluation.results.length > 0)) && (
            <div className="rounded-lg border bg-muted/20 p-2">
              <AIResultInterpretation
                results={[
                  {
                    test_name: order.test_name,
                    value: resultNotes || panelEvaluation?.formattedReport || genericResult,
                  },
                ]}
              />
            </div>
          )}
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
            variant={isCritical ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={isLoading || (isCritical && !verifiedOnRepeat)}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Submitting...
              </>
            ) : isCritical ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-1.5" />
                Submit Critical Panic Result
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Finalize & Complete Result
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
