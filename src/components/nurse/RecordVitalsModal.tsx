import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Heart, 
  Thermometer, 
  Activity, 
  Droplets,
  Scale,
  Ruler,
  AlertCircle,
  Users,
  Search,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveQueue } from '@/hooks/useQueue';
import { usePatients } from '@/hooks/usePatients';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string;
}

interface RecordVitalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  consultationId?: string;
  showPatientSelector?: boolean;
}

interface VitalsData {
  blood_pressure_systolic: string;
  blood_pressure_diastolic: string;
  heart_rate: string;
  temperature: string;
  respiratory_rate: string;
  oxygen_saturation: string;
  weight: string;
  height: string;
  pain_level: string;
  notes: string;
}

export function RecordVitalsModal({ 
  open, 
  onOpenChange, 
  patient: initialPatient,
  consultationId,
  showPatientSelector = false,
}: RecordVitalsModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: queueEntries } = useActiveQueue();
  const { data: allPatients = [] } = usePatients();
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vitals, setVitals] = useState<VitalsData>({
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    temperature: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    pain_level: '',
    notes: '',
  });

  // Update selected patient when initialPatient changes
  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
    }
  }, [initialPatient]);

  // Get unique patients from queue
  const patientsInQueue = queueEntries?.filter(
    (entry, index, self) => 
      entry.patient && 
      index === self.findIndex(e => e.patient?.id === entry.patient?.id)
  ).map(entry => entry.patient as Patient) || [];

  // Combine queue patients and all patients, prioritizing queue patients
  const availablePatients = patientsInQueue.length > 0 
    ? patientsInQueue 
    : allPatients.map(p => ({ id: p.id, first_name: p.first_name, last_name: p.last_name, mrn: p.mrn }));

  // Filter patients based on search term
  const filteredPatients = searchTerm
    ? availablePatients.filter(p => 
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mrn.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availablePatients;

  const handleChange = (field: keyof VitalsData, value: string) => {
    setVitals(prev => ({ ...prev, [field]: value }));
  };

  const calculateBMI = () => {
    const weight = parseFloat(vitals.weight);
    const height = parseFloat(vitals.height);
    if (weight && height) {
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    setIsSubmitting(true);
    try {
      const bmi = calculateBMI();
      
      const { error } = await supabase.from('vital_signs').insert({
        patient_id: selectedPatient.id,
        consultation_id: consultationId || null,
        recorded_by: profile?.id,
        blood_pressure_systolic: vitals.blood_pressure_systolic ? parseInt(vitals.blood_pressure_systolic) : null,
        blood_pressure_diastolic: vitals.blood_pressure_diastolic ? parseInt(vitals.blood_pressure_diastolic) : null,
        heart_rate: vitals.heart_rate ? parseInt(vitals.heart_rate) : null,
        temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
        respiratory_rate: vitals.respiratory_rate ? parseInt(vitals.respiratory_rate) : null,
        oxygen_saturation: vitals.oxygen_saturation ? parseInt(vitals.oxygen_saturation) : null,
        weight: vitals.weight ? parseFloat(vitals.weight) : null,
        height: vitals.height ? parseFloat(vitals.height) : null,
        pain_level: vitals.pain_level ? parseInt(vitals.pain_level) : null,
        bmi: bmi ? parseFloat(bmi) : null,
        notes: vitals.notes || null,
      });

      if (error) throw error;

      toast.success('Vitals recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['vital-signs'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      
      setVitals({
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        heart_rate: '',
        temperature: '',
        respiratory_rate: '',
        oxygen_saturation: '',
        weight: '',
        height: '',
        pain_level: '',
        notes: '',
      });
      setSelectedPatient(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error recording vitals:', error);
      toast.error('Failed to record vitals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bmi = calculateBMI();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Vital Signs</DialogTitle>
          {selectedPatient && !showPatientSelector && (
            <p className="text-sm text-muted-foreground">
              Patient: {selectedPatient.first_name} {selectedPatient.last_name} ({selectedPatient.mrn})
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Selector */}
          {showPatientSelector && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Select Patient</h3>
                  {patientsInQueue.length > 0 && (
                    <span className="text-xs text-muted-foreground">(from queue)</span>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or MRN..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={selectedPatient?.id || ''}
                    onValueChange={(value) => {
                      const patient = availablePatients.find(p => p.id === value);
                      setSelectedPatient(patient || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPatients.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          {searchTerm ? 'No matching patients' : 'No patients available'}
                        </div>
                      ) : (
                        filteredPatients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.first_name} {patient.last_name} ({patient.mrn})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Blood Pressure & Heart Rate */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-destructive" />
                <h3 className="font-medium">Cardiovascular</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Systolic (mmHg)</Label>
                  <Input
                    type="number"
                    placeholder="120"
                    value={vitals.blood_pressure_systolic}
                    onChange={(e) => handleChange('blood_pressure_systolic', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diastolic (mmHg)</Label>
                  <Input
                    type="number"
                    placeholder="80"
                    value={vitals.blood_pressure_diastolic}
                    onChange={(e) => handleChange('blood_pressure_diastolic', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Heart Rate (bpm)</Label>
                  <Input
                    type="number"
                    placeholder="72"
                    value={vitals.heart_rate}
                    onChange={(e) => handleChange('heart_rate', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Temperature & Respiratory */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Thermometer className="h-5 w-5 text-orange-500" />
                <h3 className="font-medium">Temperature & Respiratory</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Temperature (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="36.5"
                    value={vitals.temperature}
                    onChange={(e) => handleChange('temperature', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Respiratory Rate (/min)</Label>
                  <Input
                    type="number"
                    placeholder="16"
                    value={vitals.respiratory_rate}
                    onChange={(e) => handleChange('respiratory_rate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SpO2 (%)</Label>
                  <Input
                    type="number"
                    placeholder="98"
                    value={vitals.oxygen_saturation}
                    onChange={(e) => handleChange('oxygen_saturation', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anthropometrics */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-blue-500" />
                <h3 className="font-medium">Anthropometrics</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={vitals.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    placeholder="170"
                    value={vitals.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>BMI</Label>
                  <Input
                    type="text"
                    value={bmi || '-'}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pain Level */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <h3 className="font-medium">Pain Assessment</h3>
              </div>
              <div className="space-y-2">
                <Label>Pain Level (0-10)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="0"
                  value={vitals.pain_level}
                  onChange={(e) => handleChange('pain_level', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional observations..."
              value={vitals.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Vitals'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
