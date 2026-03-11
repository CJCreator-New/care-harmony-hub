import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { DischargeWorkflowAuditEntry } from '@/hooks/useDischargeWorkflow';
import { format } from 'date-fns';

interface DischargeWorkflowTimelineProps {
  entries: DischargeWorkflowAuditEntry[];
  isLoading?: boolean;
}

export function DischargeWorkflowTimeline({
  entries,
  isLoading,
}: DischargeWorkflowTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Discharge Audit Timeline</CardTitle>
        <CardDescription>
          Full audit trail for discharge workflow transitions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No audit entries for the selected workflow yet.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{entry.actor_role}</Badge>
                <Badge>{entry.transition_action}</Badge>
                {entry.from_step && <Badge variant="secondary">From {entry.from_step}</Badge>}
                {entry.to_step && <Badge variant="secondary">To {entry.to_step}</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
              </div>
              {entry.reason && (
                <div className="text-sm">
                  <span className="font-medium">Reason:</span> {entry.reason}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
