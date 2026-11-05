import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { SafetyFinding, UseOrderSafetyReturn } from '@/modules/order-safety';

const MIN_REASON = 10;

const severityStyle: Record<SafetyFinding['severity'], { label: string; variant: 'destructive' | 'default'; Icon: typeof Info }> = {
  CRITICAL: { label: 'Critical', variant: 'destructive', Icon: XCircle },
  SERIOUS: { label: 'Serious', variant: 'destructive', Icon: AlertTriangle },
  MODERATE: { label: 'Moderate', variant: 'default', Icon: AlertTriangle },
  INFORMATIONAL: { label: 'Info', variant: 'default', Icon: Info },
};

export interface PriorOverride {
  readonly reason: string;
  readonly by?: string;
}

interface OrderSafetyPanelProps {
  readonly safety: UseOrderSafetyReturn;
  /** Show only these findings (e.g. the draft row preview). */
  readonly filter?: (f: SafetyFinding) => boolean;
  /** Preview mode: list findings without override inputs. */
  readonly readOnly?: boolean;
  /** Overrides already documented elsewhere (prescriber rationale shown to the pharmacist), keyed by finding code. */
  readonly priorOverrides?: Readonly<Record<string, PriorOverride>>;
  /** Wording for the override field ("Clinical override rationale" / "Pharmacist verification note"). */
  readonly overrideLabel?: string;
  readonly className?: string;
}

/**
 * Renders order-safety findings and collects one documented rationale per
 * finding that requires it. Hard stops can never be overridden here.
 */
export function OrderSafetyPanel({
  safety,
  filter,
  readOnly = false,
  priorOverrides = {},
  overrideLabel = 'Clinical override rationale',
  className,
}: OrderSafetyPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const findings = filter ? safety.findings.filter(filter) : safety.findings;

  if (safety.status === 'cleared' && findings.length === 0 && !safety.errorMessage) {
    return null;
  }

  return (
    <section aria-label="Medication safety checks" className={cn('space-y-3', className)}>
      {safety.status === 'checking' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Running medication safety checks…
        </p>
      )}

      {safety.errorMessage && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Safety screening unavailable: order blocked</AlertTitle>
          <AlertDescription>
            <p>{safety.errorMessage}</p>
            <p className="mt-1 text-xs">
              Orders cannot be sent until allergies and medications can be checked. Retry, or
              reload the page.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {findings.map((f) => {
        const style = severityStyle[f.severity];
        const documented = safety.activeOverrides.find((o) => o.findingCode === f.code);
        const prior = priorOverrides[f.code];
        const fieldId = `override-${f.code}`;
        const draft = drafts[f.code] ?? '';
        return (
          <Alert key={f.code} variant={f.isHardStop || f.severity === 'CRITICAL' ? 'destructive' : style.variant}>
            <style.Icon className="h-4 w-4" aria-hidden="true" />
            <AlertTitle className="flex flex-wrap items-center gap-2">
              {f.title}
              <Badge variant={style.variant === 'destructive' ? 'destructive' : 'outline'}>{style.label}</Badge>
              {f.isHardStop && <Badge variant="destructive">Cannot be overridden</Badge>}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">{f.detail}</p>
              <p className="text-xs text-muted-foreground">{f.clinicalRecommendation}</p>

              {prior && (
                <p className="rounded border bg-muted/40 p-2 text-xs">
                  <span className="font-semibold">Prescriber override{prior.by ? ` (${prior.by})` : ''}:</span>{' '}
                  {prior.reason}
                </p>
              )}

              {f.isHardStop ? (
                <p className="text-xs font-semibold">Change or remove this medication to continue.</p>
              ) : f.requiresPhysicianOverride && !readOnly ? (
                documented ? (
                  <div className="flex flex-wrap items-start gap-2 text-xs">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" aria-hidden="true" />
                    <span className="flex-1">
                      <span className="font-semibold">Documented:</span> {documented.overrideReason}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => safety.removeOverride(f.code)}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor={fieldId} className="text-xs font-semibold">
                      {overrideLabel} <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id={fieldId}
                      value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [f.code]: e.target.value }))}
                      placeholder="Why the benefit outweighs this risk, and how it will be monitored"
                      className="text-xs"
                      aria-describedby={`${fieldId}-hint`}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span id={`${fieldId}-hint`} className="text-xs text-muted-foreground">
                        At least {MIN_REASON} characters ({draft.trim().length}/{MIN_REASON}).
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        disabled={draft.trim().length < MIN_REASON}
                        onClick={() => {
                          if (safety.recordOverride(f.code, draft)) {
                            setDrafts((d) => ({ ...d, [f.code]: '' }));
                          }
                        }}
                      >
                        Document
                      </Button>
                    </div>
                  </div>
                )
              ) : null}
            </AlertDescription>
          </Alert>
        );
      })}

      {!readOnly && (findings.length > 0 || safety.errorMessage) && (
        <p className="text-xs text-muted-foreground">
          Screening covers documented allergies (including drug classes), the patient&apos;s home
          medications and recent prescriptions, critical interaction pairs, duplicate NSAIDs,
          pregnancy and pediatric dose limits. It is not a complete interaction database;
          pharmacist verification still applies.
        </p>
      )}
    </section>
  );
}
