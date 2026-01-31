import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Heart, 
  Thermometer, 
  Activity, 
  Weight, 
  Ruler, 
  Droplets,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  HandOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HandoffPanel } from './HandoffPanel';

interface VitalsData {
  temperature: number | '';
  blood_pressure_systolic: number | '';
  blood_pressure_diastolic: number | '';
  heart_rate: number | '';
  respiratory_rate: number | '';
  oxygen_saturation: number | '';
  weight: number | '';
  height: number | '';
  pain_scale: number | '';
}

interface UnifiedPatientPrepPanelProps {
  patient: any;
  queueEntry: any;
  onComplete: () => void;
}

const PREP_TEMPLATES = {
  wellness: {
    name: 'Wellness Visit',
    chief_complaint: 'Annual wellness examination',
    notes: 'Routine preventive care visit'
  },
  followup: {
    name: 'Follow-up Visit',
    chief_complaint: 'Follow-up for previous condition',
    notes: 'Patient returning for follow-up evaluation'
  },
  urgent: {
    name: 'Urgent Care',
    chief_complaint: 'Acute complaint',
    notes: 'Patient presenting with acute symptoms'
  }
};

const VITAL_THRESHOLDS = {
  temperature: { min: 95, max: 110, unit: '°F' },
  heart_rate: { min: 30, max: 200, unit: 'bpm' },
  systolic_bp: { min: 70, max: 250, unit: 'mmHg' },
  diastolic_bp: { min: 40, max: 150, unit: 'mmHg' },
  oxygen_saturation: { min: 70, max: 100, unit: '%' }
};

export function UnifiedPatientPrepPanel({ patient, queueEntry, onComplete }: UnifiedPatientPrepPanelProps) {
  const [vitals, setVitals] = useState<VitalsData>({
    temperature: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    pain_scale: ''
  });

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startTime] = useState(Date.now());
  const [abnormalVitals, setAbnormalVitals] = useState<string[]>([]);
  const [showHandoff, setShowHandoff] = useState(false);
  const [prepCompleted, setPrepCompleted] = useState(false);

  // Validate vitals and detect abnormal values
  const validateAndDetectAbnormal = (updatedVitals: VitalsData) => {
    const newErrors: Record<string, string> = {};
    const abnormal: string[] = [];

    if (updatedVitals.temperature && (Number(updatedVitals.temperature) < 95 || Number(updatedVitals.temperature) > 110)) {
      newErrors.temperature = 'Out of range';
      abnormal.push('Temperature');
    }
    if (updatedVitals.heart_rate && (Number(updatedVitals.heart_rate) < 30 || Number(updatedVitals.heart_rate) > 200)) {
      newErrors.heart_rate = 'Out of range';
      abnormal.push('Heart Rate');
    }
    if (updatedVitals.blood_pressure_systolic && (Number(updatedVitals.blood_pressure_systolic) < 70 || Number(updatedVitals.blood_pressure_systolic) > 250)) {
      newErrors.blood_pressure_systolic = 'Out of range';
      abnormal.push('Systolic BP');
    }
    if (updatedVitals.oxygen_saturation && (Number(updatedVitals.oxygen_saturation) < 95)) {
      abnormal.push('Low O2 Saturation');
    }

    setErrors(newErrors);
    setAbnormalVitals(abnormal);
    return Object.keys(newErrors).length === 0;
  };

  const handleVitalChange = (field: keyof VitalsData, value: string) => {
    const updated = { ...vitals, [field]: value === '' ? '' : Number(value) };
    setVitals(updated);
    validateAndDetectAbnormal(updated);
  };

  const applyTemplate = (templateKey: keyof typeof PREP_TEMPLATES) => {
    const template = PREP_TEMPLATES[templateKey];
    setChiefComplaint(template.chief_complaint);
    setNotes(template.notes);
    toast.success(`Applied ${template.name} template`);
  };

  const calculateBMI = () => {
    if (vitals.weight && vitals.height) {
      const weightKg = Number(vitals.weight) * 0.453592;
      const heightM = Number(vitals.height) * 0.0254;
      return (weightKg / (heightM * heightM)).toFixed(1);
    }
    return null;
  };

  const getPrepDuration = () => {
    const duration = Math.round((Date.now() - startTime) / 1000);
    return `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!validateAndDetectAbnormal(vitals)) {
      toast.error('Please correct vital sign errors');
      return;
    }

    if (!chiefComplaint.trim()) {
      toast.error('Chief complaint is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: transactionError } = await supabase.rpc('complete_patient_prep', {
        p_patient_id: patient.id,
        p_queue_entry_id: queueEntry.id,
        p_vitals_data: {
          ...vitals,
          bmi: calculateBMI() ? Number(calculateBMI()) : null,
          recorded_at: new Date().toISOString(),
          prep_duration_seconds: Math.round((Date.now() - startTime) / 1000)
        },
        p_chief_complaint: chiefComplaint,
        p_allergies: allergies || null,
        p_current_medications: currentMedications || null,
        p_nurse_notes: notes || null
      });

      if (transactionError) throw transactionError;

      // Alert for critical values
      const criticalValues = [];
      if (Number(vitals.temperature) > 102) criticalValues.push('High fever');
      if (Number(vitals.blood_pressure_systolic) > 180) criticalValues.push('Severe hypertension');
      if (Number(vitals.heart_rate) > 120) criticalValues.push('Tachycardia');
      if (Number(vitals.oxygen_saturation) < 90) criticalValues.push('Low oxygen saturation');

      if (criticalValues.length > 0) {
        await supabase.from('notifications').insert({
          hospital_id: patient.hospital_id,
          recipient_id: queueEntry.assigned_doctor_id,
          type: 'critical_vitals',
          title: 'CRITICAL: Abnormal Vital Signs',
          message: `${patient.first_name} ${patient.last_name}: ${criticalValues.join(', ')}`,
          priority: 'critical',
          data: { patient_id: patient.id, critical_values: criticalValues }
        });
        toast.warning('Critical values detected - Doctor alerted!');
      }

      toast.success('Patient prep completed in ' + getPrepDuration());
      setPrepCompleted(true);
      setShowHandoff(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to complete patient prep');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHandoffComplete = () => {
    setShowHandoff(false);
    onComplete();
  };

  return (
    <div className="space-y-4">
      {/* Header with Timer */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Patient Preparation</h2>
          <p className="text-sm text-muted-foreground">
            {patient.first_name} {patient.last_name} • MRN: {patient.mrn}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{getPrepDuration()}</span>
        </div>
      </div>

      {/* Quick Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick Templates</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {Object.entries(PREP_TEMPLATES).map(([key, template]) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => applyTemplate(key as keyof typeof PREP_TEMPLATES)}
            >
              {template.name}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Abnormal Vitals Alert */}
      {abnormalVitals.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700">
            <strong>Abnormal Values:</strong> {abnormalVitals.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabbed Interface */}
      <Tabs defaultValue="vitals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="patient">Patient Info</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Vitals Tab */}
        <TabsContent value="vitals" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                Temp (°F)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={vitals.temperature}
                onChange={(e) => handleVitalChange('temperature', e.target.value)}
                className={errors.temperature ? 'border-red-500' : ''}
                placeholder="98.6"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Heart className="h-3 w-3" />
                HR (bpm)
              </Label>
              <Input
                type="number"
                value={vitals.heart_rate}
                onChange={(e) => handleVitalChange('heart_rate', e.target.value)}
                className={errors.heart_rate ? 'border-red-500' : ''}
                placeholder="72"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">BP (mmHg)</Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  placeholder="120"
                  value={vitals.blood_pressure_systolic}
                  onChange={(e) => handleVitalChange('blood_pressure_systolic', e.target.value)}
                  className={`text-xs ${errors.blood_pressure_systolic ? 'border-red-500' : ''}`}
                />
                <span className="self-center text-xs">/</span>
                <Input
                  type="number"
                  placeholder="80"
                  value={vitals.blood_pressure_diastolic}
                  onChange={(e) => handleVitalChange('blood_pressure_diastolic', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                O2 (%)
              </Label>
              <Input
                type="number"
                value={vitals.oxygen_saturation}
                onChange={(e) => handleVitalChange('oxygen_saturation', e.target.value)}
                className={errors.oxygen_saturation ? 'border-red-500' : ''}
                placeholder="98"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">RR (/min)</Label>
              <Input
                type="number"
                value={vitals.respiratory_rate}
                onChange={(e) => handleVitalChange('respiratory_rate', e.target.value)}
                placeholder="16"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Weight className="h-3 w-3" />
                Weight (lbs)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={vitals.weight}
                onChange={(e) => handleVitalChange('weight', e.target.value)}
                placeholder="170"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                Height (in)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={vitals.height}
                onChange={(e) => handleVitalChange('height', e.target.value)}
                placeholder="70"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Pain (0-10)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={vitals.pain_scale}
                onChange={(e) => handleVitalChange('pain_scale', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {calculateBMI() && (
            <div className="p-2 bg-muted rounded text-sm">
              <strong>BMI:</strong> {calculateBMI()}
            </div>
          )}
        </TabsContent>

        {/* Patient Info Tab */}
        <TabsContent value="patient" className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">Chief Complaint *</Label>
            <Textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="What brings the patient in today?"
              className="min-h-16 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Known Allergies</Label>
            <Input
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="NKDA if none"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Current Medications</Label>
            <Textarea
              value={currentMedications}
              onChange={(e) => setCurrentMedications(e.target.value)}
              placeholder="List medications and dosages"
              className="min-h-16 text-sm"
            />
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">Nurse Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional observations for the doctor"
              className="min-h-24 text-sm"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {prepCompleted ? (
          <Button
            onClick={() => setShowHandoff(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <HandOff className="mr-2 h-4 w-4" />
            Handoff to Doctor
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-success hover:bg-success/90"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" />
            Complete Prep ({getPrepDuration()})
          </Button>
        )}
      </div>

      {/* Handoff Dialog */}
      <Dialog open={showHandoff} onOpenChange={setShowHandoff}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Handoff</DialogTitle>
          </DialogHeader>
          <HandoffPanel
            patient={patient}
            queueEntry={queueEntry}
            prepData={{
              vitals,
              chiefComplaint,
              allergies,
              medications: currentMedications,
              notes,
              prepDuration: Math.round((Date.now() - startTime) / 1000),
            }}
            onHandoffComplete={handleHandoffComplete}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
