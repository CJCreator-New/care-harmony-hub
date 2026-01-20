import { useState } from 'react';
import { useNurseWorkflow } from '@/hooks/useNurseWorkflow';
import { useVitalSigns } from '@/hooks/useVitalSigns';
import { useWorkflowNotifications } from '@/hooks/useWorkflowNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TriageChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
}

export function EnhancedTriagePanel({ patientId, queueId }: { patientId: string; queueId: string }) {
  const { markReadyForDoctor } = useNurseWorkflow();
  const { recordVitals } = useVitalSigns();
  const { notifyPatientReady } = useWorkflowNotifications();

  const [vitals, setVitals] = useState({
    systolic: '',
    diastolic: '',
    heart_rate: '',
    temperature: '',
    respiratory_rate: '',
    oxygen_saturation: '',
  });

  const [checklist, setChecklist] = useState<TriageChecklistItem[]>([
    { id: 'vitals', label: 'Vital Signs Recorded', required: true, completed: false },
    { id: 'allergies', label: 'Allergies Verified', required: true, completed: false },
    { id: 'medications', label: 'Current Medications Documented', required: true, completed: false },
    { id: 'chief_complaint', label: 'Chief Complaint Recorded', required: true, completed: false },
    { id: 'pain_assessment', label: 'Pain Assessment', required: false, completed: false },
  ]);

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');

  const calculateESI = () => {
    const systolic = parseInt(vitals.systolic);
    const heartRate = parseInt(vitals.heart_rate);
    const temp = parseFloat(vitals.temperature);
    const respRate = parseInt(vitals.respiratory_rate);
    const o2Sat = parseInt(vitals.oxygen_saturation);

    if (systolic < 90 || heartRate > 120 || temp > 39.5 || respRate > 30 || o2Sat < 90) {
      return { level: 2, label: 'Emergent', color: 'destructive' };
    }
    if (systolic < 100 || heartRate > 100 || temp > 38.5 || respRate > 24) {
      return { level: 3, label: 'Urgent', color: 'warning' };
    }
    return { level: 4, label: 'Less Urgent', color: 'default' };
  };

  const handleVitalsSubmit = async () => {
    try {
      await recordVitals({
        patient_id: patientId,
        ...vitals,
        blood_pressure: `${vitals.systolic}/${vitals.diastolic}`,
      });

      setChecklist(prev => prev.map(item =>
        item.id === 'vitals' ? { ...item, completed: true } : item
      ));

      toast.success('Vitals recorded successfully');
    } catch (error) {
      toast.error('Failed to record vitals');
    }
  };

  const handleMarkReady = async () => {
    const requiredComplete = checklist.filter(item => item.required).every(item => item.completed);

    if (!requiredComplete) {
      toast.error('Please complete all required checklist items');
      return;
    }

    try {
      await markReadyForDoctor(queueId, {
        chief_complaint: chiefComplaint,
        allergies,
        current_medications: medications,
        triage_notes: `ESI Level: ${calculateESI().level}`,
      });

      await notifyPatientReady(patientId, 'Patient Name', 1);

      toast.success('Patient marked ready for doctor');
    } catch (error) {
      toast.error('Failed to mark patient ready');
    }
  };

  const esiResult = calculateESI();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Triage Assessment
            </span>
            <Badge variant={esiResult.color as any}>
              ESI Level {esiResult.level} - {esiResult.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vital Signs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">BP Systolic</label>
              <Input
                type="number"
                value={vitals.systolic}
                onChange={(e) => setVitals({ ...vitals, systolic: e.target.value })}
                placeholder="120"
              />
            </div>
            <div>
              <label className="text-sm font-medium">BP Diastolic</label>
              <Input
                type="number"
                value={vitals.diastolic}
                onChange={(e) => setVitals({ ...vitals, diastolic: e.target.value })}
                placeholder="80"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Heart Rate</label>
              <Input
                type="number"
                value={vitals.heart_rate}
                onChange={(e) => setVitals({ ...vitals, heart_rate: e.target.value })}
                placeholder="72"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Temperature (°C)</label>
              <Input
                type="number"
                step="0.1"
                value={vitals.temperature}
                onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                placeholder="37.0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Resp Rate</label>
              <Input
                type="number"
                value={vitals.respiratory_rate}
                onChange={(e) => setVitals({ ...vitals, respiratory_rate: e.target.value })}
                placeholder="16"
              />
            </div>
            <div>
              <label className="text-sm font-medium">O2 Sat (%)</label>
              <Input
                type="number"
                value={vitals.oxygen_saturation}
                onChange={(e) => setVitals({ ...vitals, oxygen_saturation: e.target.value })}
                placeholder="98"
              />
            </div>
          </div>
          <Button onClick={handleVitalsSubmit} className="w-full">
            Record Vitals
          </Button>

          {/* Chief Complaint */}
          <div>
            <label className="text-sm font-medium">Chief Complaint</label>
            <Textarea
              value={chiefComplaint}
              onChange={(e) => {
                setChiefComplaint(e.target.value);
                setChecklist(prev => prev.map(item =>
                  item.id === 'chief_complaint' ? { ...item, completed: !!e.target.value } : item
                ));
              }}
              placeholder="Patient's main reason for visit..."
            />
          </div>

          {/* Allergies */}
          <div>
            <label className="text-sm font-medium">Allergies</label>
            <Input
              value={allergies}
              onChange={(e) => {
                setAllergies(e.target.value);
                setChecklist(prev => prev.map(item =>
                  item.id === 'allergies' ? { ...item, completed: true } : item
                ));
              }}
              placeholder="NKDA or list allergies..."
            />
          </div>

          {/* Current Medications */}
          <div>
            <label className="text-sm font-medium">Current Medications</label>
            <Textarea
              value={medications}
              onChange={(e) => {
                setMedications(e.target.value);
                setChecklist(prev => prev.map(item =>
                  item.id === 'medications' ? { ...item, completed: true } : item
                ));
              }}
              placeholder="List current medications..."
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Triage Checklist</label>
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) =>
                    setChecklist(prev => prev.map(i =>
                      i.id === item.id ? { ...i, completed: !!checked } : i
                    ))
                  }
                />
                <span className="text-sm">
                  {item.label}
                  {item.required && <span className="text-destructive ml-1">*</span>}
                </span>
                {item.completed && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
              </div>
            ))}
          </div>

          <Button
            onClick={handleMarkReady}
            className="w-full"
            size="lg"
            disabled={!checklist.filter(item => item.required).every(item => item.completed)}
          >
            Mark Ready for Doctor
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
