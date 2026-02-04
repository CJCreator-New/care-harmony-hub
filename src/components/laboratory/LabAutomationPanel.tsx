import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TestTube2, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Thermometer,
  Bell,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AutomationJob {
  id: string;
  test_name: string;
  patient_name: string;
  progress: number;
  status: 'initializing' | 'processing' | 'verifying' | 'flagged' | 'completed';
  is_critical?: boolean;
}

export function LabAutomationPanel() {
  const { hospital } = useAuth();
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [activeSensors, setActiveSensors] = useState({
    temperature: 4.2,
    purity: 99.8,
    throughput: 42
  });

  useEffect(() => {
    // Generate some mock initial jobs
    setJobs([
      { id: '1', test_name: 'CBC w/ Differential', patient_name: 'John Doe', progress: 45, status: 'processing' },
      { id: '2', test_name: 'Comprehensive Metabolic Panel', patient_name: 'Jane Smith', progress: 89, status: 'verifying' },
      { id: '3', test_name: 'Hemoglobin A1c', patient_name: 'Robert Brown', progress: 12, status: 'initializing' },
      { id: '4', test_name: 'Troponin I', patient_name: 'Alice Wilson', progress: 67, status: 'flagged', is_critical: true },
    ]);

    // Simulate progress updates
    const interval = setInterval(() => {
      setJobs(prev => prev.map(job => {
        if (job.status === 'completed') return job;
        if (job.status === 'flagged') return job;
        
        const newProgress = job.progress + Math.random() * 5;
        let newStatus = job.status;
        
        if (newProgress >= 100) {
          newStatus = 'completed';
          toast.success(`Lab Test Completed: ${job.test_name} for ${job.patient_name}`);
        } else if (newProgress > 60) {
          newStatus = 'verifying';
        } else if (newProgress > 10) {
          newStatus = 'processing';
        }
        
        return {
          ...job,
          progress: Math.min(newProgress, 100),
          status: newStatus as any
        };
      }));

      // Simulate sensor fluctuations
      setActiveSensors(prev => ({
        temperature: +(prev.temperature + (Math.random() - 0.5) * 0.1).toFixed(1),
        purity: +(prev.purity + (Math.random() - 0.5) * 0.05).toFixed(2),
        throughput: prev.throughput
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleEscalateCritical = (job: AutomationJob) => {
    toast.error(`CRITICAL ALERT ESCALATED: ${job.test_name} for ${job.patient_name}`, {
      description: 'Medical Director and Primary Care Physician notified.',
      duration: 8000
    });
    
    // In a real app, this would trigger a system-wide critical notification
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Cooling System</span>
              <span className="text-xl font-bold">{activeSensors.temperature}°C</span>
            </div>
            <Thermometer className="h-8 w-8 text-primary opacity-20" />
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Reagent Purity</span>
              <span className="text-xl font-bold">{activeSensors.purity}%</span>
            </div>
            <Activity className="h-8 w-8 text-green-500 opacity-20" />
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Active Load</span>
              <span className="text-xl font-bold">{jobs.filter(j => j.status !== 'completed').length} Jobs</span>
            </div>
            <Cpu className="h-8 w-8 text-purple-500 opacity-20" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Auto-Analyzer Hub
            </CardTitle>
            <CardDescription>Real-time status of high-throughput laboratory automation</CardDescription>
          </div>
          <Badge variant="outline" className="animate-pulse bg-green-50 text-green-700 border-green-200">
            System Online
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className={cn(
                "p-4 rounded-xl border transition-all",
                job.status === 'flagged' ? "bg-red-50 border-red-200" : "bg-card border-border"
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      job.status === 'completed' ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"
                    )}>
                      <TestTube2 className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{job.test_name}</span>
                      <span className="text-xs text-muted-foreground">{job.patient_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.is_critical && (
                      <Badge variant="destructive" className="animate-bounce">Critical</Badge>
                    )}
                    <Badge variant={job.status === 'completed' ? 'success' : 'secondary'} className="capitalize text-[10px]">
                      {job.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-medium uppercase text-muted-foreground">
                    <span>Processing Cycle</span>
                    <span>{Math.round(job.progress)}%</span>
                  </div>
                  <Progress value={job.progress} className={cn(
                    "h-1.5",
                    job.status === 'flagged' ? "bg-red-200" : ""
                  )} />
                </div>

                {job.status === 'flagged' && (
                  <div className="mt-4 flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-lg border border-red-100 shadow-sm">
                    <div className="flex items-center gap-2 text-xs text-red-600 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      Potential critical value detected. Requires manual verification.
                    </div>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="h-8 text-xs font-bold"
                      onClick={() => handleEscalateCritical(job)}
                    >
                      <Bell className="h-3 w-3 mr-1.5" />
                      Escalate
                    </Button>
                  </div>
                )}
                
                {job.status === 'completed' && (
                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary">
                      Review Results
                      <ArrowUpRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
