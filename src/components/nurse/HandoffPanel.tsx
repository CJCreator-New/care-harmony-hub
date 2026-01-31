import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDoctorAvailability } from '@/hooks/useDoctorAvailability';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Stethoscope, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  Activity,
  FileText,
  Send,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface HandoffPanelProps {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
  };
  queueEntry: {
    id: string;
    assigned_doctor_id?: string;
  };
  prepData: {
    vitals: Record<string, number | string>;
    chiefComplaint: string;
    allergies: string;
    medications: string;
    notes: string;
    prepDuration: number;
  };
  onHandoffComplete: () => void;
}

export function HandoffPanel({ patient, queueEntry, prepData, onHandoffComplete }: HandoffPanelProps) {
  const { hospital } = useAuth();
  const { data: doctors = [] } = useDoctorAvailability();
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(queueEntry.assigned_doctor_id || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get unique doctors from availability data
  const uniqueDoctors = doctors.reduce((acc: any[], curr) => {
    if (curr.doctor && !acc.find(d => d.id === curr.doctor_id)) {
      acc.push({
        id: curr.doctor_id,
        name: `${curr.doctor.first_name} ${curr.doctor.last_name}`,
        first_name: curr.doctor.first_name,
        last_name: curr.doctor.last_name,
      });
    }
    return acc;
  }, []);

  const handleHandoff = async () => {
    if (!selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create structured handoff data (SBAR format)
      const handoffData = {
        situation: `Patient ${patient.first_name} ${patient.last_name} (MRN: ${patient.mrn}) ready for consultation`,
        background: {
          chief_complaint: prepData.chiefComplaint,
          allergies: prepData.allergies || 'NKDA',
          current_medications: prepData.medications || 'None reported',
        },
        assessment: {
          vitals: prepData.vitals,
          prep_duration_seconds: prepData.prepDuration,
          nurse_notes: prepData.notes,
        },
        recommendation: 'Ready for doctor evaluation',
      };

      // Update queue entry with handoff data
      const { error: updateError } = await supabase
        .from('patient_queue')
        .update({
          assigned_to: selectedDoctor,
          status: 'called',
          handoff_data: handoffData,
          called_time: new Date().toISOString(),
        })
        .eq('id', queueEntry.id);

      if (updateError) throw updateError;

      // Send notification to doctor
      const { error: notifError } = await supabase.from('notifications').insert({
        hospital_id: hospital?.id,
        recipient_id: selectedDoctor,
        type: 'alert',
        title: 'Patient Ready for Consultation',
        message: `${patient.first_name} ${patient.last_name} has completed prep and is ready`,
        priority: 'high',
        category: 'clinical',
        action_url: '/consultations',
        data: {
          patient_id: patient.id,
          queue_entry_id: queueEntry.id,
          handoff_data: handoffData,
        },
      });

      if (notifError) throw notifError;

      toast.success('Handoff completed - Doctor notified');
      onHandoffComplete();
    } catch (error) {
      console.error('Handoff error:', error);
      toast.error('Failed to complete handoff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCriticalValues = () => {
    const criticals: string[] = [];
    const vitals = prepData.vitals;
    
    if (Number(vitals.temperature) > 102) criticals.push('High Fever');
    if (Number(vitals.blood_pressure_systolic) > 180) criticals.push('Severe Hypertension');
    if (Number(vitals.heart_rate) > 120) criticals.push('Tachycardia');
    if (Number(vitals.oxygen_saturation) < 90) criticals.push('Hypoxemia');
    
    return criticals;
  };

  const criticalValues = getCriticalValues();

  return (
    <div className="space-y-4">
      {/* Patient Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Patient Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {patient.first_name[0]}{patient.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{patient.first_name} {patient.last_name}</p>
              <p className="text-sm text-muted-foreground">MRN: {patient.mrn}</p>
            </div>
          </div>

          {criticalValues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                <AlertCircle className="h-4 w-4" />
                Critical Values Detected
              </div>
              <div className="flex flex-wrap gap-2">
                {criticalValues.map((value, idx) => (
                  <Badge key={idx} variant="destructive">{value}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vitals Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Vitals Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {prepData.vitals.temperature && (
              <div className="p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">Temperature</p>
                <p className="font-medium">{prepData.vitals.temperature}°F</p>
              </div>
            )}
            {prepData.vitals.heart_rate && (
              <div className="p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">Heart Rate</p>
                <p className="font-medium">{prepData.vitals.heart_rate} bpm</p>
              </div>
            )}
            {prepData.vitals.blood_pressure_systolic && (
              <div className="p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">Blood Pressure</p>
                <p className="font-medium">{prepData.vitals.blood_pressure_systolic}/{prepData.vitals.blood_pressure_diastolic}</p>
              </div>
            )}
            {prepData.vitals.oxygen_saturation && (
              <div className="p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">O2 Saturation</p>
                <p className="font-medium">{prepData.vitals.oxygen_saturation}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chief Complaint & Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Clinical Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Chief Complaint</p>
            <p className="text-sm">{prepData.chiefComplaint}</p>
          </div>
          {prepData.allergies && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Allergies</p>
              <p className="text-sm">{prepData.allergies}</p>
            </div>
          )}
          {prepData.medications && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Current Medications</p>
              <p className="text-sm">{prepData.medications}</p>
            </div>
          )}
          {prepData.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Nurse Notes</p>
              <p className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200">{prepData.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctor Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Assign to Doctor
          </CardTitle>
          <CardDescription>Select a doctor to receive this patient</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {uniqueDoctors.map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => setSelectedDoctor(doctor.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    selectedDoctor === doctor.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {doctor.first_name[0]}{doctor.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">Dr. {doctor.name}</p>
                  </div>
                  {selectedDoctor === doctor.id && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <div className="flex-1 text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-4 w-4" />
          Prep time: {Math.floor(prepData.prepDuration / 60)}m {prepData.prepDuration % 60}s
        </div>
        <Button
          onClick={handleHandoff}
          disabled={isSubmitting || !selectedDoctor}
          className="bg-success hover:bg-success/90"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Send className="mr-2 h-4 w-4" />
          Complete Handoff
        </Button>
      </div>
    </div>
  );
}
