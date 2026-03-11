import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { DischargeWorkflow } from '@/hooks/useDischargeWorkflow';

interface DischargeQueueSectionProps {
  title: string;
  description: string;
  workflows: DischargeWorkflow[];
  isLoading?: boolean;
  approveLabel: string;
  emptyLabel: string;
  onApprove: (workflowId: string) => Promise<unknown>;
  onReject?: (workflowId: string, reason: string) => Promise<unknown>;
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
  isMutating,
}: DischargeQueueSectionProps) {
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const sortedWorkflows = useMemo(
    () =>
      [...workflows].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
    [workflows],
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
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          sortedWorkflows.map((workflow) => (
            <div key={workflow.id} className="rounded-xl border p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Patient {workflow.patient_id.slice(0, 8)}</Badge>
                    <Badge variant="secondary">{workflow.current_step}</Badge>
                    {workflow.rejection_reason ? (
                      <Badge variant="destructive">Returned</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(workflow.updated_at), { addSuffix: true })}
                  </p>
                  {workflow.consultation_id && (
                    <p className="text-xs text-muted-foreground">
                      Consultation: {workflow.consultation_id.slice(0, 8)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {workflow.rejection_reason ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-amber-500" />
                  )}
                  {workflow.status}
                </div>
              </div>

              {workflow.rejection_reason && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                  <div className="font-medium mb-1">Rejection reason</div>
                  <div>{workflow.rejection_reason}</div>
                </div>
              )}

              {onReject && (
                <div className="space-y-2">
                  <Label htmlFor={`reject-${workflow.id}`}>Reject with reason</Label>
                  <Textarea
                    id={`reject-${workflow.id}`}
                    placeholder="Enter a reason to return this workflow to the previous role"
                    value={rejectReasons[workflow.id] ?? ''}
                    onChange={(event) =>
                      setRejectReasons((current) => ({
                        ...current,
                        [workflow.id]: event.target.value,
                      }))
                    }
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void onApprove(workflow.id)}
                  disabled={isMutating}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {approveLabel}
                </Button>
                {onReject && (
                  <Button
                    variant="destructive"
                    onClick={() => void onReject(workflow.id, rejectReasons[workflow.id] ?? '')}
                    disabled={isMutating || !(rejectReasons[workflow.id] ?? '').trim()}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
