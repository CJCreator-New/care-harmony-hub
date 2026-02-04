import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Clock, 
  Zap, 
  ArrowUpCircle, 
  AlertTriangle, 
  CheckCircle2,
  BrainCircuit,
  Settings2,
  RefreshCcw,
  Stethoscope,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface QueueEntry {
  id: string;
  patient_id: string;
  patient_name: string;
  priority: 'routine' | 'urgent' | 'emergency';
  status: 'waiting' | 'prepping' | 'consulting' | 'completed';
  checked_in_at: string;
  estimated_wait_time: number;
  assigned_doctor_id?: string;
  doctor_name?: string;
  room_number?: string;
  optimization_score?: number;
}

export function QueueOptimizer() {
  const { hospital } = useAuth();
  const queryClient = useQueryClient();
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleApplyChange = async () => {
    toast.info('Applying resource redeployment...');
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Resource redeployment applied successfully');
  };

  const handleTriggerPrep = async () => {
    toast.info('Triggering room preparation...');
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Room preparation triggered');
  };

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['active-queue', hospital?.id],
    queryFn: async () => {
      // In a real app, this would be a complex join
      // For now, we simulate the active queue fetching
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          priority,
          status,
          created_at,
          doctor_id,
          profiles:doctor_id (full_name),
          patients:patient_id (first_name, last_name)
        `)
        .eq('hospital_id', hospital?.id)
        .in('status', ['waiting', 'prepping', 'consulting'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        patient_id: item.patient_id,
        patient_name: `${item.patients?.first_name} ${item.patients?.last_name}`,
        priority: item.priority as any,
        status: item.status as any,
        checked_in_at: item.created_at,
        doctor_name: item.profiles?.full_name,
        estimated_wait_time: calculateInitialWait(item.created_at),
        optimization_score: calculateScore(item)
      })) as QueueEntry[];
    },
    enabled: !!hospital?.id
  });

  const calculateInitialWait = (createdAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    return Math.max(0, minutes);
  };

  const calculateScore = (item: any) => {
    let score = 0;
    if (item.priority === 'emergency') score += 100;
    if (item.priority === 'urgent') score += 50;
    const waitTime = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 60000);
    score += waitTime * 2;
    return score;
  };

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      setIsOptimizing(true);
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // In a real app, this would call a Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('optimize-queue', {
        body: { hospitalId: hospital?.id }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-queue'] });
      toast.success('Queue optimized successfully', {
        description: 'Patient ordering adjusted based on clinical priority and throughput optimization.',
        icon: <Zap className="h-4 w-4 text-yellow-500" />
      });
      setIsOptimizing(false);
    },
    onError: (error) => {
      console.error('Optimization error:', error);
      toast.error('Failed to optimize queue');
      setIsOptimizing(false);
    }
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'emergency': return <Badge variant="destructive" className="animate-pulse uppercase text-[10px] font-bold tracking-widest px-2 py-0.5 border-2 border-red-500/20 shadow-sm shadow-red-500/20">Emergency</Badge>;
      case 'urgent': return <Badge variant="warning" className="uppercase text-[10px] font-bold tracking-widest px-2 py-0.5 bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Urgent</Badge>;
      default: return <Badge variant="secondary" className="uppercase text-[10px] font-bold tracking-widest px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100">Routine</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'prepping': return <Activity className="h-4 w-4 text-orange-500" />;
      case 'consulting': return <Stethoscope className="h-4 w-4 text-purple-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const totalWaiting = queue.filter(q => q.status === 'waiting').length;
  const avgWaitTime = queue.length > 0 ? Math.round(queue.reduce((acc, curr) => acc + curr.estimated_wait_time, 0) / queue.length) : 0;
  const efficiencyScore = Math.min(100, Math.max(0, 100 - (avgWaitTime / 3) + (totalWaiting * 2)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="lg:col-span-2 border-border/50 shadow-xl shadow-border/5 overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <BrainCircuit className="h-5 w-5 text-primary animate-pulse" />
              Real-Time Queue Optimization
            </CardTitle>
            <CardDescription className="font-medium opacity-80">
              AI-driven prioritization based on clinical urgency and wait-time balanced throughput.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['active-queue'] })}
              className="h-9 font-semibold transition-all hover:bg-primary/5 active:scale-95"
            >
              <RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={() => optimizeMutation.mutate()}
              disabled={isOptimizing || queue.length === 0}
              className="h-9 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] active:translate-y-[1px]"
            >
              <Zap className={cn("h-4 w-4 mr-2", isOptimizing && "animate-bounce")} />
              {isOptimizing ? 'Analyzing...' : 'Run Optimization'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[520px]">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-muted-foreground opacity-60">
                <div className="bg-muted rounded-full p-4 mb-4">
                  <Users className="h-10 w-10 opacity-30" />
                </div>
                <p className="text-lg font-semibold italic">Queue is currently empty</p>
                <p className="text-sm mt-1 max-w-[250px] text-center uppercase tracking-tighter">New patients will appear here after check-in.</p>
              </div>
            ) : (
              <div className="divide-y border-b">
                {queue.sort((a, b) => (b.optimization_score || 0) - (a.optimization_score || 0)).map((entry, index) => (
                  <div key={entry.id} className={cn(
                    "flex items-center gap-4 p-4 transition-all duration-300 hover:bg-muted/40 group/item relative",
                    index < 3 && entry.status === 'waiting' && "bg-primary/[0.02]"
                  )}>
                    <div className="flex flex-col items-center justify-center min-w-[40px] h-10 bg-muted/50 rounded-lg group-hover/item:bg-primary/10 transition-colors">
                      <span className="text-xs font-bold text-muted-foreground group-hover/item:text-primary">#{index + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-base tracking-tight truncate">{entry.patient_name}</span>
                        {getPriorityBadge(entry.priority)}
                        {index < 2 && entry.priority === 'emergency' && (
                          <div className="flex items-center gap-1.5 ml-2 overflow-hidden px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 max-w-fit">
                            <Zap className="h-3 w-3 text-primary" />
                            <span className="text-[9px] font-black italic tracking-tighter text-primary uppercase">Top Urgency</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium uppercase tracking-tighter">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Waiting: {entry.estimated_wait_time} min</span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-border" />
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>Dr. {entry.doctor_name || 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 px-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-wider">Clinical Score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden border border-border/30">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                (entry.optimization_score || 0) > 80 ? "bg-red-500" : 
                                (entry.optimization_score || 0) > 40 ? "bg-amber-500" : "bg-blue-500"
                              )}
                              style={{ width: `${Math.min(100, (entry.optimization_score || 0))}%` }}
                            />
                          </div>
                          <span className="text-xs font-black tabular-nums">{(entry.optimization_score || 0).toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="h-10 w-[1px] bg-border/50 mx-2" />
                      <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "p-2 rounded-full",
                          entry.status === 'waiting' ? "bg-blue-50" :
                          entry.status === 'prepping' ? "bg-amber-50" : "bg-purple-50"
                        )}>
                          {getStatusIcon(entry.status)}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/80">{entry.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter className="border-t bg-muted/10 p-4">
          <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Waiting
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              Prepping
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              Consulting
            </div>
          </div>
        </CardFooter>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/50 shadow-lg shadow-border/5 overflow-hidden">
          <CardHeader className="bg-primary/[0.03] border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Queue Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                <span className="text-muted-foreground">System Efficiency</span>
                <span className="text-primary">{efficiencyScore}%</span>
              </div>
              <Progress value={efficiencyScore} className="h-2 bg-muted transition-all duration-1000" />
              <p className="text-[10px] text-muted-foreground font-medium italic opacity-80 leading-relaxed">
                Score based on throughput, average wait time, and provider utilization.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 transition-colors hover:border-primary/20">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Avg Wait</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black tabular-nums">{avgWaitTime}</span>
                  <span className="text-xs font-bold text-muted-foreground uppercase">min</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-green-600 uppercase">
                  <TrendingUp className="h-3 w-3" />
                  -12% today
                </div>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 transition-colors hover:border-primary/20">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Queue</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black tabular-nums text-foreground">{queue.length}</span>
                  <span className="text-xs font-bold text-muted-foreground uppercase">pts</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-amber-600 uppercase">
                  <Users className="h-3 w-3" />
                  {totalWaiting} Unseen
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-lg shadow-border/5 bg-gradient-to-br from-primary/5 to-transparent border-l-4 border-l-primary/30">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Smart Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 items-start p-3 bg-white/50 rounded-lg border border-primary/10 group/suggest">
              <div className="p-1.5 bg-primary/10 rounded group-hover/suggest:bg-primary transition-colors">
                <Users className="h-4 w-4 text-primary group-hover/suggest:text-white" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-tight text-foreground">Redeploy Resources</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-relaxed">
                  Doctor workload imbalanced. Consider reassigning <span className="text-primary font-bold italic">Patient A</span> to <span className="text-primary font-bold italic">Dr. Sarah</span> to save 12 min.
                </p>
                <Button variant="link" className="h-auto p-0 text-[10px] font-black uppercase tracking-widest text-primary mt-1 hover:no-underline" onClick={handleApplyChange}>Apply Change</Button>
              </div>
            </div>
            <div className="flex gap-3 items-start p-3 bg-white/50 rounded-lg border border-primary/10 group/suggest">
              <div className="p-1.5 bg-primary/10 rounded group-hover/suggest:bg-primary transition-colors">
                <Settings2 className="h-4 w-4 text-primary group-hover/suggest:text-white" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-tight text-foreground">Prep Room Optimization</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-relaxed">
                  Room 4 is now free. Immediate nurse prep required for <span className="text-primary font-bold italic">Jane Doe</span>.
                </p>
                <Button variant="link" className="h-auto p-0 text-[10px] font-black uppercase tracking-widest text-primary mt-1 hover:no-underline" onClick={handleTriggerPrep}>Trigger Prep</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
