import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Workflow, Users, Clock } from 'lucide-react';
import { workflowOrchestration } from '@/services/workflowOrchestration';

export const WorkflowOrchestrationPanel = () => {
  const [resources, setResources] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  const predictResources = async () => {
    const prediction = await workflowOrchestration.predictResourceNeeds(25, new Date().getHours());
    setResources(prediction);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5" />
          Workflow Orchestration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={predictResources} className="w-full">
          Predict Resource Needs
        </Button>
        
        {resources && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 border rounded-lg text-center">
              <Users className="h-5 w-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{resources.doctors}</p>
              <p className="text-xs text-muted-foreground">Doctors</p>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <Users className="h-5 w-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{resources.nurses}</p>
              <p className="text-xs text-muted-foreground">Nurses</p>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <Clock className="h-5 w-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{resources.rooms}</p>
              <p className="text-xs text-muted-foreground">Rooms</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
