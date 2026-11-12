import { Link } from 'react-router-dom';
import { AlertOctagon, PhoneCall, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { stageInstruction, type SafeguardStage } from '@/lib/clinical/criticalResultSafeguard';
import { useCriticalResultSafeguard } from '@/hooks/useCriticalResultSafeguard';

const STAGE_LABEL: Record<SafeguardStage, string> = {
  primary: 'Notify ordering clinician',
  on_call: 'Escalate to on-call (5 min)',
  ed: 'Escalate to ED (10 min)',
};

/**
 * Interim S0-08 safeguard banner, rendered on every dashboard page for clinical
 * roles. It cannot be dismissed: it clears only when the laboratory records the
 * read-back, or (for a clinician) when they log receipt, which is audited.
 * See docs/operations/CRITICAL_RESULT_ESCALATION_SOP.md.
 */
export function CriticalResultSafeguardBanner() {
  const { enabled, alerts, isLabOrAdmin, loadError, recordReceipt, isRecording } = useCriticalResultSafeguard();

  if (!enabled || (alerts.length === 0 && !loadError)) return null;

  return (
    <section
      role="alert"
      aria-live="assertive"
      aria-label="Unacknowledged critical lab results"
      className="space-y-2"
    >
      {loadError && (
        <div className="flex items-start gap-2 rounded-md border-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <strong>Critical-result safeguard unavailable.</strong> Critical lab results cannot be
            shown here ({loadError}). Follow the telephone escalation procedure and contact the
            laboratory directly.
          </p>
        </div>
      )}

      {alerts.map((a) => {
        const p = a.order.patient;
        const name = p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : '';
        return (
          <div
            key={a.order.id}
            className={cn(
              'flex flex-col gap-2 rounded-md border-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between',
              a.stage === 'primary'
                ? 'border-destructive bg-destructive/10 text-destructive'
                : 'border-red-700 bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100'
            )}
          >
            <div className="flex items-start gap-2">
              <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="space-y-0.5">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  Critical result: {a.order.test_name}
                  {name && <span>· {name}</span>}
                  {p?.mrn && <span className="font-mono text-xs">({p.mrn})</span>}
                  <Badge variant="destructive">{STAGE_LABEL[a.stage]}</Badge>
                  <span className="text-xs font-normal">
                    open {a.minutesOpen} min, no read-back recorded
                  </span>
                </p>
                {a.order.result_notes && <p className="text-xs">{a.order.result_notes}</p>}
                <p className="text-xs">{stageInstruction(a.stage, isLabOrAdmin)}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {isLabOrAdmin ? (
                <Button asChild size="sm" variant="destructive">
                  <Link to="/laboratory">
                    <PhoneCall className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Record read-back
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isRecording}
                  onClick={async () => {
                    try {
                      await recordReceipt(a);
                      toast.success('Receipt recorded. The laboratory still needs to record the read-back.');
                    } catch (err) {
                      toast.error(
                        `Receipt not recorded: ${err instanceof Error ? err.message : String(err)}. Phone the laboratory.`
                      );
                    }
                  }}
                >
                  I have reviewed this result
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
