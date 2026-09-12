import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertOctagon, PhoneCall, ShieldAlert, Clock } from 'lucide-react';
import { LabOrder } from '@/hooks/useLabOrders';

export interface CriticalLabAlertBannerProps {
  criticalOrders: readonly any[];
  onAcknowledgeClick: (order: any) => void;
}

export function CriticalLabAlertBanner({
  criticalOrders,
  onAcknowledgeClick,
}: CriticalLabAlertBannerProps) {
  const [now, setNow] = useState(Date.now());

  // Tick every second for live SLA countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter to orders that are critical and have not had closed-loop read-back completed
  const unacknowledgedCritical = criticalOrders.filter((order) => {
    if (!order.is_critical) return false;
    // Check if results object has acknowledgment recorded
    const ack = order.results?.acknowledgment;
    if (ack && ack.verbalReadBackConfirmed) return false;
    return true;
  });

  if (unacknowledgedCritical.length === 0) {
    return null;
  }

  // Focus on highest urgency (oldest notification time = least SLA time remaining)
  const sortedOrders = [...unacknowledgedCritical].sort((a, b) => {
    const timeA = new Date(a.critical_notified_at || a.completed_at || a.ordered_at).getTime();
    const timeB = new Date(b.critical_notified_at || b.completed_at || b.ordered_at).getTime();
    return timeA - timeB;
  });

  const urgentOrder = sortedOrders[0];
  const notifiedAt = new Date(
    urgentOrder.critical_notified_at || urgentOrder.completed_at || urgentOrder.ordered_at
  ).getTime();

  // 15-minute CLIA / CAP closed-loop notification SLA
  const SLA_DURATION_MS = 15 * 60 * 1000;
  const elapsedMs = now - notifiedAt;
  const remainingMs = SLA_DURATION_MS - elapsedMs;

  const isBreached = remainingMs <= 0;
  const isUrgentWarning = remainingMs > 0 && remainingMs < 5 * 60 * 1000;

  const formatTimer = () => {
    if (isBreached) {
      const overdueMinutes = Math.floor(Math.abs(remainingMs) / 60000);
      const overdueSeconds = Math.floor((Math.abs(remainingMs) % 60000) / 1000);
      return `BREACHED (+${overdueMinutes}m ${overdueSeconds}s overdue)`;
    }
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} remaining`;
  };

  const patientDisplayName = urgentOrder.patient
    ? `${urgentOrder.patient.first_name} ${urgentOrder.patient.last_name}`
    : urgentOrder.patient_id;

  return (
    <div
      className={`rounded-lg border-2 p-4 transition-all duration-300 shadow-md ${
        isBreached
          ? 'border-red-600 bg-red-950/20 dark:bg-red-950/40 text-red-700 dark:text-red-300 animate-pulse'
          : isUrgentWarning
            ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300'
            : 'border-destructive bg-destructive/10 text-destructive'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-red-600 text-white mt-0.5 sm:mt-0 flex-shrink-0 animate-bounce">
            <AlertOctagon className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm tracking-wide uppercase flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                Active Panic Lab Value Escalation
              </span>
              <Badge
                variant={isBreached ? 'destructive' : 'outline'}
                className={`font-mono text-xs font-bold ${
                  isBreached ? 'bg-red-600 text-white' : 'border-current'
                }`}
              >
                <Clock className="h-3 w-3 mr-1" />
                15m SLA: {formatTimer()}
              </Badge>
              {unacknowledgedCritical.length > 1 && (
                <Badge variant="secondary" className="text-xs">
                  +{unacknowledgedCritical.length - 1} more pending
                </Badge>
              )}
            </div>

            <p className="text-xs font-medium">
              Patient: <strong>{patientDisplayName}</strong> | Test:{' '}
              <strong>{urgentOrder.test_name}</strong>
              {urgentOrder.results?.criticalSummary ? (
                <span className="ml-1 text-red-600 dark:text-red-400 font-semibold">
                  ({urgentOrder.results.criticalSummary})
                </span>
              ) : null}
            </p>
            <p className="text-[11px] opacity-90">
              CLIA / CAP closed-loop protocol requires direct verbal communication with read-back
              verification to the attending caregiver.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-center">
          <Button
            size="sm"
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold shadow"
            onClick={() => onAcknowledgeClick(urgentOrder)}
          >
            <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
            Record Clinician Read-Back
          </Button>
        </div>
      </div>
    </div>
  );
}
