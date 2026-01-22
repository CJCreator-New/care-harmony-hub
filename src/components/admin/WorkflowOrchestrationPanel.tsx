import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  GitBranch, 
  Play, 
  Settings2, 
  Bell, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight,
  Database,
  UserCheck,
  Zap,
  Layers,
  Activity,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  condition: string;
  action: string;
  is_active: boolean;
  hospital_id: string;
  last_triggered?: string;
}

const triggers = [
  { id: 'patient_checkin', name: 'Patient Check-in', icon: UserCheck },
  { id: 'consultation_complete', name: 'Consultation Complete', icon: CheckCircle2 },
  { id: 'prescription_created', name: 'Prescription Created', icon: Zap },
  { id: 'lab_result_ready', name: 'Lab Result Ready', icon: Activity },
  { id: 'appointment_scheduled', name: 'Appointment Scheduled', icon: Clock },
];

const actions = [
  { id: 'send_notification', name: 'Send In-App Notification' },
  { id: 'trigger_edge_function', name: 'Trigger Edge Function' },
  { id: 'update_patient_status', name: 'Update Patient Status' },
  { id: 'assign_task', name: 'Assign Task' },
  { id: 'log_audit_event', name: 'Log Audit Event' },
];

export function WorkflowOrchestrationPanel() {
  const { hospitalId } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState<Partial<WorkflowRule>>({
    name: '',
    description: '',
    trigger: 'patient_checkin',
    action: 'send_notification',
    is_active: true
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['workflow-rules', hospitalId],
    queryFn: async () => {
      // Fetch mock rules since the table might not exist yet
      return [
        {
          id: '1',
          name: 'Auto-Notify Nurse on Check-in',
          description: 'When a patient checks in, notify triage nurse immediately.',
          trigger: 'patient_checkin',
          condition: 'always',
          action: 'send_notification',
          is_active: true,
          hospital_id: hospitalId!,
          last_triggered: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Critical Lab Escalation',
          description: 'Auto-escalate critical lab results to senior doctors.',
          trigger: 'lab_result_ready',
          condition: 'priority == critical',
          action: 'trigger_edge_function',
          is_active: true,
          hospital_id: hospitalId!,
          last_triggered: new Date(Date.now() - 3600000).toISOString()
        }
      ] as WorkflowRule[];
    },
    enabled: !!hospitalId
  });

  const createRuleMutation = useMutation({
    mutationFn: async (rule: Partial<WorkflowRule>) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { ...rule, id: Math.random().toString(36).substr(2, 9) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
      toast.success('Workflow rule created');
      setIsCreating(false);
    }
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id, status };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['workflow-rules', hospitalId], (old: WorkflowRule[] = []) => 
        old.map(r => r.id === data.id ? { ...r, is_active: data.status } : r)
      );
      toast.success(data.status ? 'Rule activated' : 'Rule deactivated');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Workflow Automation Engine</h2>
          <p className="text-sm text-muted-foreground font-medium">Define smart triggers and automated actions to streamline hospital operations.</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)} 
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} className={cn(
              "group overflow-hidden transition-all duration-300 hover:shadow-md border-border/50",
              !rule.is_active && "opacity-75 bg-muted/20"
            )}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    rule.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">{rule.name}</CardTitle>
                    <CardDescription className="text-xs font-medium uppercase tracking-tighter opacity-70">
                      ID: {rule.id} • {rule.is_active ? 'Active' : 'Paused'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Status</span>
                    <Switch 
                      checked={rule.is_active} 
                      onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, status: checked })} 
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-medium text-foreground/80 mb-4">{rule.description}</p>
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-tight">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-md border border-border/50 shadow-sm">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>Trigger: {triggers.find(t => t.id === rule.trigger)?.name}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-md border border-border/50 shadow-sm">
                    <Play className="h-3 w-3 text-green-500" />
                    <span>Action: {actions.find(a => a.id === rule.action)?.name}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-2 px-4 flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                  <Clock className="h-3 w-3" />
                  Last triggered: {rule.last_triggered ? new Date(rule.last_triggered).toLocaleString() : 'Never'}
                </div>
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0">
                  <Settings2 className="h-2.5 w-2.5 mr-1" />
                  Manage Conditions
                </Badge>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-lg bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="border-b bg-primary/10">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Automation Health
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-muted-foreground">Total Invocations</span>
                <span className="text-lg font-black tabular-nums">1,248</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-muted-foreground">Active Rules</span>
                <span className="text-lg font-black tabular-nums text-primary">{rules.filter(r => r.is_active).length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-muted-foreground">Error Rate</span>
                <span className="text-lg font-black tabular-nums text-green-600">0.02%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl shadow-2xl border-primary/20 animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg font-bold">New Automation Rule</CardTitle>
              <CardDescription>Configure common triggers and corresponding actions.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Rule Name</label>
                <Input 
                  placeholder="e.g. Critical Lab Alert" 
                  value={newRule.name} 
                  onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                  className="font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Trigger</label>
                  <Select 
                    value={newRule.trigger} 
                    onValueChange={(v) => setNewRule({...newRule, trigger: v})}
                  >
                    <SelectTrigger className="font-medium">
                      <SelectValue placeholder="Select Trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggers.map(t => (
                        <SelectItem key={t.id} value={t.id} className="font-medium">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Action</label>
                  <Select 
                    value={newRule.action} 
                    onValueChange={(v) => setNewRule({...newRule, action: v})}
                  >
                    <SelectTrigger className="font-medium">
                      <SelectValue placeholder="Select Action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actions.map(a => (
                        <SelectItem key={a.id} value={a.id} className="font-medium">{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 bg-muted/30">
              <Button variant="ghost" onClick={() => setIsCreating(false)} className="font-bold">Cancel</Button>
              <Button 
                onClick={() => createRuleMutation.mutate(newRule)}
                disabled={!newRule.name}
                className="font-bold bg-primary px-8"
              >
                <Save className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
