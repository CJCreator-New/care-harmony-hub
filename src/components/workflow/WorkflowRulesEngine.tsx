import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Play, Pause, Trash2, Settings, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AutomationRule {
  id: string;
  rule_name: string;
  rule_type: string;
  trigger_conditions: any;
  actions: any;
  is_active: boolean;
  success_rate?: number;
  execution_count: number;
  created_at: string;
}

export function WorkflowRulesEngine() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_name: '',
    rule_type: 'care_team_assignment',
    trigger_event: 'patient_check_in',
    trigger_condition: '',
    action_type: 'assign_task',
    action_target: '',
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_automation_rules')
        .select('*')
        .eq('hospital_id', profile?.hospital_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AutomationRule[];
    },
    enabled: !!profile?.hospital_id,
  });

  const createRule = useMutation({
    mutationFn: async (ruleData: typeof newRule) => {
      const { error } = await supabase.from('workflow_automation_rules').insert({
        hospital_id: profile?.hospital_id,
        rule_name: ruleData.rule_name,
        rule_type: ruleData.rule_type,
        trigger_conditions: {
          event: ruleData.trigger_event,
          condition: ruleData.trigger_condition,
        },
        actions: {
          type: ruleData.action_type,
          target: ruleData.action_target,
        },
        is_active: true,
        execution_count: 0,
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({ title: 'Automation rule created successfully' });
      setIsCreateDialogOpen(false);
      setNewRule({
        rule_name: '',
        rule_type: 'care_team_assignment',
        trigger_event: 'patient_check_in',
        trigger_condition: '',
        action_type: 'assign_task',
        action_target: '',
      });
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('workflow_automation_rules')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({ title: 'Rule status updated' });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_automation_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({ title: 'Rule deleted successfully' });
    },
  });

  const ruleTypes = [
    { value: 'care_team_assignment', label: 'Care Team Assignment' },
    { value: 'follow_up_scheduling', label: 'Follow-up Scheduling' },
    { value: 'task_prioritization', label: 'Task Prioritization' },
    { value: 'alert_generation', label: 'Alert Generation' },
  ];

  const triggerEvents = [
    { value: 'patient_check_in', label: 'Patient Check-in' },
    { value: 'lab_order_created', label: 'Lab Order Created' },
    { value: 'prescription_created', label: 'Prescription Created' },
    { value: 'consultation_completed', label: 'Consultation Completed' },
    { value: 'critical_result', label: 'Critical Result' },
  ];

  const actionTypes = [
    { value: 'assign_task', label: 'Assign Task' },
    { value: 'send_notification', label: 'Send Notification' },
    { value: 'create_appointment', label: 'Create Appointment' },
    { value: 'escalate_priority', label: 'Escalate Priority' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Workflow Automation Rules
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Automation Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Rule Name</Label>
                  <Input
                    value={newRule.rule_name}
                    onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                    placeholder="e.g., Auto-assign triage to nurse"
                  />
                </div>
                <div>
                  <Label>Rule Type</Label>
                  <Select value={newRule.rule_type} onValueChange={(v) => setNewRule({ ...newRule, rule_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ruleTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Trigger Event</Label>
                  <Select value={newRule.trigger_event} onValueChange={(v) => setNewRule({ ...newRule, trigger_event: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerEvents.map((event) => (
                        <SelectItem key={event.value} value={event.value}>
                          {event.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Condition (optional)</Label>
                  <Input
                    value={newRule.trigger_condition}
                    onChange={(e) => setNewRule({ ...newRule, trigger_condition: e.target.value })}
                    placeholder="e.g., priority = 'urgent'"
                  />
                </div>
                <div>
                  <Label>Action Type</Label>
                  <Select value={newRule.action_type} onValueChange={(v) => setNewRule({ ...newRule, action_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((action) => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Action Target</Label>
                  <Input
                    value={newRule.action_target}
                    onChange={(e) => setNewRule({ ...newRule, action_target: e.target.value })}
                    placeholder="e.g., nurse, doctor"
                  />
                </div>
                <Button onClick={() => createRule.mutate(newRule)} className="w-full">
                  Create Rule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No automation rules configured</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{rule.rule_name}</span>
                        <Badge variant={rule.is_active ? 'success' : 'secondary'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Type: {rule.rule_type.replace(/_/g, ' ')}</p>
                        <p>Executions: {rule.execution_count}</p>
                        {rule.success_rate !== undefined && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-3 w-3" />
                            <span>Success Rate: {(rule.success_rate * 100).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleRule.mutate({ id: rule.id, isActive: rule.is_active })}
                      >
                        {rule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteRule.mutate(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
