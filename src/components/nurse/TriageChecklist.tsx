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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ClipboardCheck, 
  Thermometer, 
  Activity, 
  User, 
  AlertCircle,
  FileText,
  Save,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkflowOrchestrator } from '@/hooks/useWorkflowOrchestrator';

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  category: 'vitals' | 'documentation' | 'history' | 'safety';
}

interface TriageChecklistProps {
  patientId: string;
  appointmentId: string;
  onComplete?: () => void;
}

export function TriageChecklist({ patientId, appointmentId, onComplete }: TriageChecklistProps) {
  const { hospitalId } = useAuth();
  const { triggerWorkflow } = useWorkflowOrchestrator();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: 'bp', label: 'Blood Pressure Recorded', completed: false, category: 'vitals' },
    { id: 'temp', label: 'Temperature & Pulse Recorded', completed: false, category: 'vitals' },
    { id: 'weight', label: 'Weight & Height (BMI) Recorded', completed: false, category: 'vitals' },
    { id: 'id_verify', label: 'Identity Verified (Photo ID)', completed: false, category: 'documentation' },
    { id: 'consent', label: 'Treatment Consent Signed', completed: false, category: 'documentation' },
    { id: 'allergy', label: 'Allergies Corroborated', completed: false, category: 'history' },
    { id: 'meds', label: 'Current Medications Reviewed', completed: false, category: 'history' },
    { id: 'chief_complaint', label: 'Chief Complaint Noted', completed: false, category: 'history' },
    { id: 'fall_risk', label: 'Fall Risk Assessment', completed: false, category: 'safety' },
    { id: 'suicide_risk', label: 'Mental Health Screening', completed: false, category: 'safety' },
  ]);

  useEffect(() => {
    if (appointmentId) {
      fetchExistingChecklist();
    }
  }, [appointmentId]);

  const fetchExistingChecklist = async () => {
    const { data, error } = await supabase
      .from('patient_prep_checklists')
      .select('items, ready_for_doctor')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (data && data.items) {
      setItems(data.items as unknown as ChecklistItem[]);
    }
  };

  const handleToggle = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const handleSave = async (isFinal = false) => {
    setLoading(true);
    try {
      const allCompleted = items.every(item => item.completed);
      
      const { error } = await supabase
        .from('patient_prep_checklists')
        .upsert({
          appointment_id: appointmentId,
          patient_id: patientId,
          hospital_id: hospitalId,
          items: items as any,
          ready_for_doctor: isFinal ? allCompleted : false,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      if (isFinal && allCompleted) {        await triggerWorkflow({
          type: 'triage_completed',
          patientId: patientId,
          data: {
            appointmentId,
            completedAt: new Date().toISOString(),
            status: 'ready_for_doctor'
          }
        });
        toast.success('Checklist completed! Patient is ready for the doctor.');
        if (onComplete) onComplete();
      } else {
        toast.success('Checklist progress saved.');
      }
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Failed to save checklist');
    } finally {
      setLoading(false);
    }
  };

  const completionPercentage = Math.round((items.filter(i => i.completed).length / items.length) * 100);

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Triage Checklist</CardTitle>
          </div>
          <Badge variant={completionPercentage === 100 ? "success" : "secondary"}>
            {completionPercentage}% Complete
          </Badge>
        </div>
        <CardDescription>Verify all clinical and administrative prep steps</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {(['vitals', 'history', 'documentation', 'safety'] as const).map(category => (
              <div key={category} className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  {category === 'vitals' && <Thermometer className="h-3 w-3" />}
                  {category === 'history' && <Activity className="h-3 w-3" />}
                  {category === 'documentation' && <FileText className="h-3 w-3" />}
                  {category === 'safety' && <AlertCircle className="h-3 w-3" />}
                  {category}
                </h4>
                <div className="grid gap-3">
                  {items.filter(i => i.category === category).map(item => (
                    <div 
                      key={item.id} 
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
                        item.completed ? "bg-primary/5 border-primary/20" : "bg-card border-border"
                      )}
                      onClick={() => handleToggle(item.id)}
                    >
                      <Checkbox 
                        id={item.id} 
                        checked={item.completed} 
                        onCheckedChange={() => handleToggle(item.id)}
                      />
                      <Label htmlFor={item.id} className="flex-1 cursor-pointer font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-8 flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={() => handleSave(false)}
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90" 
            onClick={() => handleSave(true)}
            disabled={loading || items.filter(i => i.completed).length === 0}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete Prep
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
