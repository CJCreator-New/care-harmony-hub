import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCareProtocols } from '@/hooks/useCareProtocols';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface SmartChecklistProps {
  patientId: string;
  patientCondition?: string;
}

export function SmartChecklist({ patientId, patientCondition }: SmartChecklistProps) {
  const { protocols, updateTask, getComplianceRate } = useCareProtocols(patientCondition);

  return (
    <div className="space-y-4">
      {protocols.map((protocol) => {
        const compliance = getComplianceRate(protocol.id);
        const allRequired = protocol.tasks.filter(t => t.required).every(t => t.completed);

        return (
          <Card key={protocol.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{protocol.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={allRequired ? 'default' : 'secondary'}>
                    {Math.round(compliance)}% Complete
                  </Badge>
                  {allRequired ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
              </div>
              <Progress value={compliance} className="mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {protocol.tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) =>
                        updateTask(protocol.id, task.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <p className={task.completed ? 'line-through text-muted-foreground' : ''}>
                        {task.description}
                      </p>
                      {task.required && !task.completed && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
