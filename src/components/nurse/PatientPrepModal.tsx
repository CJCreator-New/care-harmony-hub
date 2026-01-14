import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Heart, 
  Thermometer, 
  Activity, 
  Weight, 
  Ruler, 
  Droplets,
  CheckCircle,
  AlertTriangle,
  Send,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface PatientPrepModalProps {
  patient: any;
  queueEntry: any;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function PatientPrepModal({ patient, queueEntry, open, onClose, onComplete }: PatientPrepModalProps) {
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

  // Validation rules
  const validateVitals = () => {
    const newErrors: Record<string, string> = {};
    
    if (vitals.temperature && (Number(vitals.temperature) < 95 || Number(vitals.temperature) > 110)) {
      newErrors.temperature = 'Temperature should be between 95-110°F';
    }
    if (vitals.blood_pressure_systolic && (Number(vitals.blood_pressure_systolic) < 70 || Number(vitals.blood_pressure_systolic) > 250)) {
      newErrors.blood_pressure_systolic = 'Systolic BP should be between 70-250 mmHg';
    }
    if (vitals.blood_pressure_diastolic && (Number(vitals.blood_pressure_diastolic) < 40 || Number(vitals.blood_pressure_diastolic) > 150)) {
      newErrors.blood_pressure_diastolic = 'Diastolic BP should be between 40-150 mmHg';
    }
    if (vitals.heart_rate && (Number(vitals.heart_rate) < 30 || Number(vitals.heart_rate) > 200)) {
      newErrors.heart_rate = 'Heart rate should be between 30-200 bpm';
    }
    if (vitals.oxygen_saturation && (Number(vitals.oxygen_saturation) < 70 || Number(vitals.oxygen_saturation) > 100)) {
      newErrors.oxygen_saturation = 'O2 saturation should be between 70-100%';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVitalChange = (field: keyof VitalsData, value: string) => {
    setVitals(prev => ({ ...prev, [field]: value === '' ? '' : Number(value) }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculateBMI = () => {
    if (vitals.weight && vitals.height) {
      const weightKg = Number(vitals.weight) * 0.453592; // lbs to kg
      const heightM = Number(vitals.height) * 0.0254; // inches to meters
      return (weightKg / (heightM * heightM)).toFixed(1);
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!validateVitals()) {
      toast.error('Please correct the highlighted errors');
      return;
    }

    if (!chiefComplaint.trim()) {
      toast.error('Chief complaint is required');
      return;
    }

    setIsSubmitting(true);
    
    // Use database transaction for data consistency
    const { error: transactionError } = await supabase.rpc('complete_patient_prep', {
      p_patient_id: patient.id,
      p_queue_entry_id: queueEntry.id,
      p_vitals_data: {
        ...vitals,
        bmi: calculateBMI() ? Number(calculateBMI()) : null,
        recorded_at: new Date().toISOString(),
        recorded_by: (await supabase.auth.getUser()).data.user?.id
      },
      p_chief_complaint: chiefComplaint,
      p_allergies: allergies || null,
      p_current_medications: currentMedications || null,
      p_nurse_notes: notes || null
    });

    if (transactionError) {
      console.error('Error completing patient prep:', transactionError);
      toast.error('Failed to complete patient prep');
      setIsSubmitting(false);
      return;
    }

    // Check for critical vital signs and alert if necessary
    const criticalValues = [];
    if (Number(vitals.temperature) > 102) criticalValues.push('High fever');
    if (Number(vitals.blood_pressure_systolic) > 180) criticalValues.push('Severe hypertension');
    if (Number(vitals.heart_rate) > 120) criticalValues.push('Tachycardia');
    if (Number(vitals.oxygen_saturation) < 90) criticalValues.push('Low oxygen saturation');
    
    if (criticalValues.length > 0) {
      // Send critical alert to doctor
      await supabase.from('notifications').insert({
        hospital_id: patient.hospital_id,
        recipient_id: queueEntry.assigned_doctor_id,
        type: 'critical_vitals',
        title: 'CRITICAL: Abnormal Vital Signs',
        message: `${patient.first_name} ${patient.last_name} has critical vital signs: ${criticalValues.join(', ')}`,
        priority: 'critical',
        data: {
          patient_id: patient.id,
          queue_entry_id: queueEntry.id,
          critical_values: criticalValues,
          vitals
        }
      });
      
      toast.warning('Critical vital signs detected - Doctor has been alerted immediately!');
    }

    toast.success('Patient prep completed successfully!');
    onComplete();
    onClose();
    setIsSubmitting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Patient Preparation</h2>
              <p className="text-sm text-muted-foreground">
                {patient.first_name} {patient.last_name} • MRN: {patient.mrn}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>×</Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Vitals Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Vital Signs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Temperature (°F)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={vitals.temperature}
                    onChange={(e) => handleVitalChange('temperature', e.target.value)}
                    className={errors.temperature ? 'border-red-500' : ''}
                  />
                  {errors.temperature && (
                    <p className="text-xs text-red-500">{errors.temperature}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Heart Rate (bpm)
                  </Label>
                  <Input
                    type="number"
                    value={vitals.heart_rate}
                    onChange={(e) => handleVitalChange('heart_rate', e.target.value)}
                    className={errors.heart_rate ? 'border-red-500' : ''}
                  />
                  {errors.heart_rate && (
                    <p className="text-xs text-red-500">{errors.heart_rate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Blood Pressure</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Systolic"
                      value={vitals.blood_pressure_systolic}
                      onChange={(e) => handleVitalChange('blood_pressure_systolic', e.target.value)}
                      className={errors.blood_pressure_systolic ? 'border-red-500' : ''}
                    />
                    <span className="self-center">/</span>
                    <Input
                      type="number"
                      placeholder="Diastolic"
                      value={vitals.blood_pressure_diastolic}
                      onChange={(e) => handleVitalChange('blood_pressure_diastolic', e.target.value)}
                      className={errors.blood_pressure_diastolic ? 'border-red-500' : ''}
                    />
                  </div>
                  {(errors.blood_pressure_systolic || errors.blood_pressure_diastolic) && (
                    <p className="text-xs text-red-500">
                      {errors.blood_pressure_systolic || errors.blood_pressure_diastolic}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    O2 Saturation (%)
                  </Label>
                  <Input
                    type="number"
                    value={vitals.oxygen_saturation}
                    onChange={(e) => handleVitalChange('oxygen_saturation', e.target.value)}
                    className={errors.oxygen_saturation ? 'border-red-500' : ''}
                  />
                  {errors.oxygen_saturation && (
                    <p className="text-xs text-red-500">{errors.oxygen_saturation}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Respiratory Rate</Label>
                  <Input
                    type="number"
                    value={vitals.respiratory_rate}
                    onChange={(e) => handleVitalChange('respiratory_rate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Weight className="h-4 w-4" />
                    Weight (lbs)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={vitals.weight}
                    onChange={(e) => handleVitalChange('weight', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Height (inches)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={vitals.height}
                    onChange={(e) => handleVitalChange('height', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pain Scale (0-10)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={vitals.pain_scale}
                    onChange={(e) => handleVitalChange('pain_scale', e.target.value)}
                  />
                </div>
              </div>

              {calculateBMI() && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>BMI:</strong> {calculateBMI()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Chief Complaint *</Label>
                <Textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="What brings the patient in today?"
                  className="min-h-20"
                />
              </div>

              <div className="space-y-2">
                <Label>Known Allergies</Label>
                <Input
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="List any known allergies (NKDA if none)"
                />
              </div>

              <div className="space-y-2">
                <Label>Current Medications</Label>
                <Textarea
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  placeholder="List current medications and dosages"
                  className="min-h-16"
                />
              </div>

              <div className="space-y-2">
                <Label>Nurse Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional observations or notes for the doctor"
                  className="min-h-16"
                />
              </div>
            </CardContent>
          </Card>

          {/* Critical Values Alert */}
          {(Number(vitals.temperature) > 102 || 
            Number(vitals.blood_pressure_systolic) > 180 || 
            Number(vitals.heart_rate) > 120 || 
            Number(vitals.oxygen_saturation) < 95) && (
            <Alert className="border-red-500 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">
                <strong>Critical Values Detected:</strong> Please notify the doctor immediately.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-success hover:bg-success/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Complete Prep & Notify Doctor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}