import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedCommunicationHub } from '@/components/workflow/UnifiedCommunicationHub';
import { WorkflowRulesEngine } from '@/components/workflow/WorkflowRulesEngine';
import { WorkflowPerformanceMonitor } from '@/components/workflow/WorkflowPerformanceMonitor';
import { EnhancedTaskManagement } from '@/components/workflow/EnhancedTaskManagement';
import { Badge } from '@/components/ui/badge';
import { Activity, MessageSquare, Settings, BarChart3, CheckSquare } from 'lucide-react';

export default function WorkflowOptimizationPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Optimization</h1>
          <p className="text-muted-foreground mt-1">
            Streamline operations with intelligent automation and real-time monitoring
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Activity className="h-3 w-3 mr-1" />
          Live
        </Badge>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Communication
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <WorkflowPerformanceMonitor />
        </TabsContent>

        <TabsContent value="tasks">
          <EnhancedTaskManagement />
        </TabsContent>

        <TabsContent value="communication">
          <UnifiedCommunicationHub />
        </TabsContent>

        <TabsContent value="automation">
          <WorkflowRulesEngine />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <EnhancedTaskManagement />
            <UnifiedCommunicationHub />
          </div>
          <WorkflowRulesEngine />
        </TabsContent>
      </Tabs>
    </div>
  );
}
