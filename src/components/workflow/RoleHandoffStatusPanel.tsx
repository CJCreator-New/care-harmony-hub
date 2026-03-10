/**
 * RoleHandoffStatusPanel
 *
 * Live view of every cross-role handoff point in the clinical pipeline.
 * Queries each handoff table directly and shows real-time counts so every
 * role can see where work is queued or blocked.
 *
 * Pipeline visualised:
 *   Receptionist → (check-in) → Nurse → (vitals/triage) → Doctor
 *   Doctor → (lab order) → Lab Tech → (results) → Doctor
 *   Doctor → (prescription) → Pharmacist → (dispense) → Patient
 *   Doctor/Receptionist → (invoice) → Patient
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CROSS_ROLE_WORKFLOWS } from '@/utils/roleInterconnectionValidator';
import { ROLE_INFO } from '@/types/rbac';

interface HandoffStage {
  label: string;
  role: string;
  count: number;
  status: 'clear' | 'pending' | 'backlog';
  description: string;
}

function useHandoffCounts() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['role-handoff-counts', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return null;

      const [queueRes, labRes, rxRes, invoiceRes] = await Promise.all([
        // Patient queue states
        supabase
          .from('patient_queue')
          .select('status')
          .eq('hospital_id', hospital.id)
          .in('status', ['waiting', 'called', 'in_service']),

        // Lab orders pending/in-progress
        supabase
          .from('lab_orders')
          .select('status')
          .eq('hospital_id', hospital.id)
          .in('status', ['pending', 'sample_collected', 'in_progress']),

        // Prescriptions awaiting dispense
        supabase
          .from('prescriptions')
          .select('status')
          .eq('hospital_id', hospital.id)
          .in('status', ['pending', 'verified']),

        // Invoices awaiting payment
        supabase
          .from('invoices')
          .select('status')
          .eq('hospital_id', hospital.id)
          .in('status', ['pending', 'partial']),
      ]);

      const queue = queueRes.data ?? [];
      const labs = labRes.data ?? [];
      const rxs = rxRes.data ?? [];
      const invoices = invoiceRes.data ?? [];

      return {
        // Receptionist → Nurse: waiting in queue
        awaitingTriage: queue.filter(q => q.status === 'waiting').length,
        // Nurse → Doctor: called/prepped, waiting for doctor
        readyForDoctor: queue.filter(q => q.status === 'called').length,
        // Doctor in consultation
        inConsultation: queue.filter(q => q.status === 'in_service').length,
        // Doctor → Lab Tech
        pendingLab: labs.filter(l => l.status === 'pending').length,
        labInProgress: labs.filter(l => ['sample_collected', 'in_progress'].includes(l.status)).length,
        // Doctor → Pharmacist
        pendingDispense: rxs.filter(r => r.status === 'pending').length,
        verifiedRx: rxs.filter(r => r.status === 'verified').length,
        // Billing
        outstandingInvoices: invoices.length,
      };
    },
    enabled: !!hospital?.id,
    refetchInterval: 15_000,
  });
}

function stageStatus(count: number): HandoffStage['status'] {
  if (count === 0) return 'clear';
  if (count <= 3) return 'pending';
  return 'backlog';
}

const statusIcon = {
  clear: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  backlog: <AlertCircle className="h-4 w-4 text-red-500" />,
};

const statusColor = {
  clear: 'bg-green-50 border-green-200 text-green-800',
  pending: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  backlog: 'bg-red-50 border-red-200 text-red-800',
};

function HandoffCard({ stage }: { stage: HandoffStage }) {
  const roleInfo = ROLE_INFO[stage.role as keyof typeof ROLE_INFO];
  return (
    <div className={cn(
      'rounded-lg border p-3 flex flex-col gap-1 min-w-[130px]',
      statusColor[stage.status]
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate">{roleInfo?.label ?? stage.role}</span>
        {statusIcon[stage.status]}
      </div>
      <div className="text-xs text-muted-foreground">{stage.description}</div>
      <Badge
        variant="outline"
        className={cn('w-fit text-xs', stage.count > 0 ? 'font-bold' : 'opacity-60')}
      >
        {stage.count} {stage.count === 1 ? 'item' : 'items'}
      </Badge>
    </div>
  );
}

export function RoleHandoffStatusPanel() {
  const { data: counts, isLoading } = useHandoffCounts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role Handoff Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
            Loading live counts…
          </div>
        </CardContent>
      </Card>
    );
  }

  const c = counts ?? {
    awaitingTriage: 0,
    readyForDoctor: 0,
    inConsultation: 0,
    pendingLab: 0,
    labInProgress: 0,
    pendingDispense: 0,
    verifiedRx: 0,
    outstandingInvoices: 0,
  };

  const clinicalPipeline: HandoffStage[] = [
    {
      label: 'Check-in Queue',
      role: 'receptionist',
      count: c.awaitingTriage,
      status: stageStatus(c.awaitingTriage),
      description: 'Awaiting nurse triage',
    },
    {
      label: 'Ready for Doctor',
      role: 'nurse',
      count: c.readyForDoctor,
      status: stageStatus(c.readyForDoctor),
      description: 'Vitals done, doctor needed',
    },
    {
      label: 'In Consultation',
      role: 'doctor',
      count: c.inConsultation,
      status: c.inConsultation > 0 ? 'pending' : 'clear',
      description: 'Currently with doctor',
    },
  ];

  const parallelHandoffs: HandoffStage[][] = [
    [
      {
        label: 'Lab Orders Pending',
        role: 'lab_technician',
        count: c.pendingLab,
        status: stageStatus(c.pendingLab),
        description: 'Awaiting sample collection',
      },
      {
        label: 'Lab In Progress',
        role: 'lab_technician',
        count: c.labInProgress,
        status: c.labInProgress > 0 ? 'pending' : 'clear',
        description: 'Processing samples',
      },
    ],
    [
      {
        label: 'Pending Dispense',
        role: 'pharmacist',
        count: c.pendingDispense,
        status: stageStatus(c.pendingDispense),
        description: 'Prescriptions to fill',
      },
      {
        label: 'Verified, Ready',
        role: 'pharmacist',
        count: c.verifiedRx,
        status: c.verifiedRx > 0 ? 'pending' : 'clear',
        description: 'Verified, awaiting pickup',
      },
    ],
    [
      {
        label: 'Outstanding Bills',
        role: 'receptionist',
        count: c.outstandingInvoices,
        status: stageStatus(c.outstandingInvoices),
        description: 'Pending payment',
      },
    ],
  ];

  const workflowName = CROSS_ROLE_WORKFLOWS.PATIENT_JOURNEY.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {workflowName}
          <Badge variant="outline" className="text-xs font-normal">Live</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {CROSS_ROLE_WORKFLOWS.PATIENT_JOURNEY.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main clinical pipeline */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Clinical Pipeline
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {clinicalPipeline.map((stage, i) => (
              <div key={stage.role + i} className="flex items-center gap-2">
                <HandoffCard stage={stage} />
                {i < clinicalPipeline.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Parallel downstream handoffs */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Downstream Handoffs
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {parallelHandoffs.map((group, gi) => (
              <div key={gi} className="flex flex-col gap-2">
                {group.map((stage, si) => (
                  <div key={stage.label + si} className="flex items-center gap-1">
                    <HandoffCard stage={stage} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-2 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" /> Clear (0)
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-yellow-500" /> Pending (1-3)
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-red-500" /> Backlog (4+)
          </span>
          <span className="ml-auto">Refreshes every 15 s</span>
        </div>
      </CardContent>
    </Card>
  );
}
