import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CROSS_ROLE_WORKFLOWS, getWorkflowPath } from '@/utils/roleInterconnectionValidator';
import { ROLE_INFO } from '@/types/rbac';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientJourneyTrackerProps {
  patientId: string;
  workflowType?: keyof typeof CROSS_ROLE_WORKFLOWS;
}

async function fetchCompletedSteps(patientId: string, workflowType: string) {
  const { data } = await supabase
    .from('workflow_step_completions')
    .select('step_name')
    .eq('patient_id', patientId)
    .eq('workflow_type', workflowType);

  return data?.map(step => step.step_name) || [];
}

export function PatientJourneyTracker({
  patientId,
  workflowType = 'PATIENT_JOURNEY'
}: PatientJourneyTrackerProps) {
  const workflow = getWorkflowPath(workflowType);
  const { data: completedSteps } = useQuery({
    queryKey: ['workflow-steps', patientId, workflowType],
    queryFn: () => fetchCompletedSteps(patientId, workflowType),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {workflow.name}
        </CardTitle>
        <CardDescription>{workflow.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Steps */}
          <div className="space-y-4">
            {workflow.steps.map((step, index) => {
              const isCompleted = completedSteps?.includes(step.action);
              const isCurrent = !isCompleted &&
                (index === 0 || completedSteps?.includes(workflow.steps[index - 1].action));

              return (
                <div key={index} className="relative flex items-start gap-4">
                  {/* Step indicator */}
                  <div className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2",
                    isCompleted && "bg-green-500 border-green-500 text-white",
                    isCurrent && "bg-blue-500 border-blue-500 text-white animate-pulse",
                    !isCompleted && !isCurrent && "bg-white border-gray-300"
                  )}>
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-sm">{index + 1}</span>
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {ROLE_INFO[step.from].label}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <Badge variant="outline">
                        {ROLE_INFO[step.to].label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {step.action.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}