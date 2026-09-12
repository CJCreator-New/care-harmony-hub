import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  XCircle,
  User,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePatient } from '@/lib/hooks/patients';
import type { DischargeWorkflow } from '@/hooks/useDischargeWorkflow';

function PatientDisplay({ patientId }: { patientId: string }) {
  const { data: patient } = usePatient(patientId);
  if (!patient) return <span>Patient {patientId.slice(0, 8)}</span>;
  return (
    <span className="font-semibold text-foreground">
      {patient.first_name} {patient.last_name}
      {patient.mrn && (
        <span className="ml-1.5 font-normal text-muted-foreground font-mono">({patient.mrn})</span>
      )}
    </span>
  );
}

interface DischargeQueueSectionProps {
  title: string;
  description: string;
  workflows: DischargeWorkflow[];
  isLoading?: boolean;
  approveLabel: string;
  emptyLabel: string;
  onApprove?: (workflowId: string) => Promise<unknown>;
  onReject?: (workflowId: string, reason: string) => Promise<unknown>;
  onOpenModal?: (workflow: DischargeWorkflow) => void;
  modalButtonLabel?: string;
  isMutating?: boolean;
}

export function DischargeQueueSection({
  title,
  description,
  workflows,
  isLoading,
  approveLabel,
  emptyLabel,
  onApprove,
  onReject,
  onOpenModal,
  modalButtonLabel,
  isMutating,
}: DischargeQueueSectionProps) {
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const sortedWorkflows = useMemo(
    () =>
      [...workflows].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    [workflows]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : sortedWorkflows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
            {emptyLabel}
          </div>
        ) : (
          sortedWorkflows.map((workflow) => {
            const clinical = workflow.metadata?.clinicalSummary as Record<string, any> | undefined;

            return (
              <div key={workflow.id} className="rounded-xl border p-4 space-y-3 bg-card shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-sm">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <PatientDisplay patientId={workflow.patient_id} />
                      </div>
                      <Badge variant="outline" className="capitalize">
                        Step: {workflow.current_step}
                      </Badge>
                      {workflow.rejection_reason ? (
                        <Badge variant="destructive" className="animate-pulse">
                          Returned
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300">
                          Pending Review
                        </Badge>
                      )}
                    </div>

                    {clinical?.dischargeDiagnosis && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
                        <FileText className="h-3 w-3 text-primary" />
                        <span>
                          Diagnosis: <strong>{clinical.dischargeDiagnosis}</strong>
                        </span>
                        {clinical.dischargeDisposition && (
                          <span className="capitalize ml-2">
                            | Disposition: {clinical.dischargeDisposition}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground">
                      Updated{' '}
                      {formatDistanceToNow(new Date(workflow.updated_at), { addSuffix: true })}
                      {workflow.consultation_id &&
                        ` | Consultation: ${workflow.consultation_id.slice(0, 8)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {workflow.rejection_reason ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Clock3 className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="capitalize">{workflow.status}</span>
                  </div>
                </div>

                {workflow.rejection_reason && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
                    <div className="font-bold flex items-center gap-1.5 mb-0.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Discipline Return Rationale:
                    </div>
                    <div>{workflow.rejection_reason}</div>
                  </div>
                )}

                {/* Optional direct reject reason input when no modal is used */}
                {!onOpenModal && onReject && (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor={`reject-${workflow.id}`} className="text-xs">
                      Return with reason (optional)
                    </Label>
                    <Textarea
                      id={`reject-${workflow.id}`}
                      placeholder="Enter rationale to return this workflow to previous discipline"
                      value={rejectReasons[workflow.id] ?? ''}
                      onChange={(event) =>
                        setRejectReasons((current) => ({
                          ...current,
                          [workflow.id]: event.target.value,
                        }))
                      }
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                  {onOpenModal && (
                    <Button
                      size="sm"
                      onClick={() => onOpenModal(workflow)}
                      disabled={isMutating}
                      className="gap-1.5 h-8 text-xs font-semibold"
                    >
                      <span>{modalButtonLabel || approveLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {!onOpenModal && onApprove && (
                    <Button
                      size="sm"
                      onClick={() => void onApprove(workflow.id)}
                      disabled={isMutating}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {approveLabel}
                    </Button>
                  )}

                  {!onOpenModal && onReject && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void onReject(workflow.id, rejectReasons[workflow.id] ?? '')}
                      disabled={isMutating || !(rejectReasons[workflow.id] ?? '').trim()}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject / Return
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
