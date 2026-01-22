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
  Users, 
  Clock, 
  ChevronRight, 
  Stethoscope, 
  AlertTriangle,
  LayoutGrid,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TriageChecklist } from './TriageChecklist';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface PrepPatient {
  id: string;
  patient_name: string;
  patient_id: string;
  appointment_id: string;
  doctor_name: string;
  wait_time: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  checklist_progress: number;
  room_number?: string;
}

export function PatientPrepStation() {
  const { hospitalId } = useAuth();
  const [patients, setPatients] = useState<PrepPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);

  useEffect(() => {
    fetchPrepPatients();
    
    // Subscribe to changes in active queue and prep checklists
    const channel = supabase
      .channel('prep-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'patient_prep_checklists' 
      }, () => fetchPrepPatients())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'appointments',
        filter: `status=eq.checked_in`
      }, () => fetchPrepPatients())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPrepPatients = async () => {
    try {
      // Logic to fetch patients who are checked-in but not yet with a doctor
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          priority,
          room_number,
          check_in_time,
          patients (first_name, last_name),
          profiles:doctor_id (first_name, last_name),
          patient_prep_checklists (items)
        `)
        .eq('status', 'checked_in')
        .eq('hospital_id', hospitalId);

      if (error) throw error;

      const formatted = data.map(app => {
        const items = (app.patient_prep_checklists as any)?.[0]?.items || [];
        const completed = items.filter((i: any) => i.completed).length;
        const total = items.length || 10; // default 10 if not started
        
        return {
          id: app.id,
          appointment_id: app.id,
          patient_id: app.patient_id,
          patient_name: `${(app.patients as any).first_name} ${(app.patients as any).last_name}`,
          doctor_name: app.profiles ? `Dr. ${(app.profiles as any).last_name}` : 'Unassigned',
          wait_time: Math.floor((new Date().getTime() - new Date(app.check_in_time).getTime()) / 60000),
          priority: app.priority as any,
          checklist_progress: Math.round((completed / total) * 100),
          room_number: app.room_number
        };
      });

      setPatients(formatted);
    } catch (error) {
      console.error('Error fetching prep patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Patient Prep Monitoring
          </h2>
          <p className="text-sm text-muted-foreground">Monitor triage progress across all active stations</p>
        </div>
        <div className="flex items-center bg-muted p-1 rounded-lg">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('grid')}
            className="h-8 w-8 p-0"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('list')}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-muted/50" />)}
        </div>
      ) : patients.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>All Clear</CardTitle>
          <CardDescription className="max-w-[250px] mt-2">
            No patients currently in the prep station. New check-ins will appear here.
          </CardDescription>
        </Card>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
            : "space-y-3"
        )}>
          {patients.map(patient => (
            <Card key={patient.id} className={cn(
              "overflow-hidden transition-all hover:shadow-md border-l-4",
              patient.checklist_progress === 100 ? "border-l-green-500" : 
              patient.priority === 'urgent' ? "border-l-red-500" : "border-l-primary"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-lg leading-tight">{patient.patient_name}</span>
                    <span className="text-xs text-muted-foreground">{patient.doctor_name}</span>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] uppercase", getPriorityColor(patient.priority))}>
                    {patient.priority}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {patient.wait_time}m waiting
                    </span>
                    <span className="font-bold">{patient.checklist_progress}% Prep</span>
                  </div>
                  <Progress value={patient.checklist_progress} className="h-1.5" />
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {patient.room_number ? (
                      <Badge variant="secondary" className="text-[10px] py-0 px-2">Room {patient.room_number}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0 px-2 text-orange-600 bg-orange-50">Station Pending</Badge>
                    )}
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 text-xs">
                        Open Checklist
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <TriageChecklist 
                        patientId={patient.patient_id} 
                        appointmentId={patient.appointment_id}
                        onComplete={() => fetchPrepPatients()}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {patients.some(p => p.wait_time > 20 && p.checklist_progress < 50) && (
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <p className="text-sm text-orange-800">
            <span className="font-bold">Protocol Alert:</span> Some patients have been waiting over 20 minutes with minimal triage progress. Consider re-prioritizing prep stations.
          </p>
        </div>
      )}
    </div>
  );
}
