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
  Mic,
  FileText,
  ChevronDown,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveQueue } from '@/hooks/useQueue';
import { usePatients } from '@/hooks/usePatients';
import { PredictiveAlerts } from './PredictiveAlerts';

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
  onComplete?: () => void;
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
  chief_complaint: string;
  allergies: string;
  current_medications: string;
  nurse_notes: string;
  // Structured observations
  patient_anxious: boolean;
  language_barrier: boolean;
  family_present: boolean;
  requires_assistance: boolean;
  pain_management_needed: boolean;
  mobility_concerns: boolean;
  mark_critical: boolean;
  requires_followup: boolean;
}

export function RecordVitalsModal({ 
  open, 
  onOpenChange, 
  patient: initialPatient,
  consultationId,
  showPatientSelector = false,
  onComplete,
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
    chief_complaint: '',
    allergies: '',
    current_medications: '',
    nurse_notes: '',
    // Structured observations
    patient_anxious: false,
    language_barrier: false,
    family_present: false,
    requires_assistance: false,
    pain_management_needed: false,
    mobility_concerns: false,
    mark_critical: false,
    requires_followup: false,
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

  // Always include all patients, with queue patients at the top
  const allPatientsMapped = allPatients.map(p => ({ 
    id: p.id, 
    first_name: p.first_name, 
    last_name: p.last_name, 
    mrn: p.mrn 
  }));
  
  // Combine: queue patients first, then other patients (avoid duplicates)
  const queuePatientIds = new Set(patientsInQueue.map(p => p.id));
  const otherPatients = allPatientsMapped.filter(p => !queuePatientIds.has(p.id));
  const availablePatients = [...patientsInQueue, ...otherPatients];

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

    if (!vitals.chief_complaint.trim()) {
      toast.error('Chief complaint is required');
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
        // Additional patient preparation data
        chief_complaint: vitals.chief_complaint || null,
        allergies: vitals.allergies || null,
        current_medications: vitals.current_medications || null,
        nurse_notes: vitals.nurse_notes || null,
        // Structured observations
        patient_anxious: vitals.patient_anxious,
        language_barrier: vitals.language_barrier,
        family_present: vitals.family_present,
        requires_assistance: vitals.requires_assistance,
        pain_management_needed: vitals.pain_management_needed,
        mobility_concerns: vitals.mobility_concerns,
        mark_critical: vitals.mark_critical,
        requires_followup: vitals.requires_followup,
      });

      if (error) {
        const errorMessage = error.message || 'Failed to record vitals';
        throw new Error(errorMessage);
      }

      toast.success('✅ Vitals recorded successfully');
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
        chief_complaint: '',
        allergies: '',
        current_medications: '',
        nurse_notes: '',
        patient_anxious: false,
        language_barrier: false,
        family_present: false,
        requires_assistance: false,
        pain_management_needed: false,
        mobility_concerns: false,
        mark_critical: false,
        requires_followup: false,
      });
      setSelectedPatient(null);
      onComplete?.();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error recording vitals:', error);
      toast.error(`Failed to record vitals: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bmi = calculateBMI();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Patient Preparation</DialogTitle>
          {selectedPatient && !showPatientSelector && (
            <p className="text-sm text-muted-foreground">
              Patient: {selectedPatient.first_name} {selectedPatient.last_name} ({selectedPatient.mrn})
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Predictive Intelligence Integration */}
          {selectedPatient && (
            <PredictiveAlerts 
              patientId={selectedPatient.id}
              vitals={{
                blood_pressure: `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic}`,
                heart_rate: vitals.heart_rate,
                temperature: vitals.temperature,
                resp_rate: vitals.respiratory_rate,
                oxygen_sat: vitals.oxygen_saturation
              }}
            />
          )}

          {/* Clinical Decision Support Alerts */}
          {(parseFloat(vitals.temperature) > 38.0 ||
            parseInt(vitals.heart_rate) > 100 ||
            parseInt(vitals.blood_pressure_systolic) > 140 ||
            parseInt(vitals.oxygen_saturation) < 95 ||
            parseInt(vitals.pain_level) > 7) && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-orange-800">Clinical Alerts</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      {parseFloat(vitals.temperature) > 38.0 && (
                        <li>• Temperature elevated - consider documenting associated symptoms</li>
                      )}
                      {parseInt(vitals.heart_rate) > 100 && (
                        <li>• Heart rate elevated - assess for tachycardia causes</li>
                      )}
                      {parseInt(vitals.blood_pressure_systolic) > 140 && (
                        <li>• Blood pressure elevated - monitor for hypertension</li>
                      )}
                      {parseInt(vitals.oxygen_saturation) < 95 && (
                        <li>• Oxygen saturation low - assess respiratory status</li>
                      )}
                      {parseInt(vitals.pain_level) > 7 && (
                        <li>• Severe pain reported - pain management interventions needed</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Patient Information */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-500" />
                <h3 className="font-medium">Patient Information</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chief_complaint">Chief Complaint *</Label>
                  <Textarea
                    id="chief_complaint"
                    placeholder="What brings the patient in today?"
                    value={vitals.chief_complaint}
                    onChange={(e) => handleChange('chief_complaint', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allergies">Known Allergies</Label>
                  <Textarea
                    id="allergies"
                    placeholder="List any known allergies (NKDA if none)"
                    value={vitals.allergies}
                    onChange={(e) => handleChange('allergies', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_medications">Current Medications</Label>
                  <Textarea
                    id="current_medications"
                    placeholder="List current medications and dosages"
                    value={vitals.current_medications}
                    onChange={(e) => handleChange('current_medications', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Nurse Notes */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-green-500" />
                <h3 className="font-medium">Nurse Notes</h3>
              </div>

              {/* Quick Templates */}
              <div className="space-y-3 mb-4">
                <Label className="text-sm font-medium">Quick Templates</Label>
                <Select onValueChange={(value) => {
                  const templates = {
                    stable: "Patient alert and oriented x3. Vital signs stable. No acute distress noted.",
                    anxious: "Patient appears anxious about procedure. Provided reassurance and education.",
                    family: "Family member present and updated on patient's condition and plan.",
                    assistance: "Patient requires assistance with ambulation. Fall risk assessment completed.",
                    pain: "Patient reporting pain. Pain management interventions initiated.",
                    language: "Language barrier identified. Interpreter services requested.",
                  };
                  if (templates[value as keyof typeof templates]) {
                    handleChange('nurse_notes', vitals.nurse_notes + (vitals.nurse_notes ? '\n\n' : '') + templates[value as keyof typeof templates]);
                  }
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Insert common note template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stable">Patient stable - no concerns</SelectItem>
                    <SelectItem value="anxious">Patient anxious about procedure</SelectItem>
                    <SelectItem value="family">Family member present and updated</SelectItem>
                    <SelectItem value="assistance">Requires special assistance</SelectItem>
                    <SelectItem value="pain">Pain management needed</SelectItem>
                    <SelectItem value="language">Language barrier present</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Structured Observations */}
              <div className="space-y-3 mb-4">
                <Label className="text-sm font-medium">Structured Observations</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="patient_anxious"
                      checked={vitals.patient_anxious}
                      onChange={(e) => handleChange('patient_anxious', e.target.checked.toString())}
                      className="rounded"
                    />
                    <Label htmlFor="patient_anxious" className="text-sm">Patient anxious/nervous</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="language_barrier"
                      checked={vitals.language_barrier}
                      onChange={(e) => handleChange('language_barrier', e.target.checked.toString())}
                      className="rounded"
                    />
                    <Label htmlFor="language_barrier" className="text-sm">Language barrier present</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="family_present"
                      checked={vitals.family_present}
                      onChange={(e) => handleChange('family_present', e.target.checked.toString())}
                      className="rounded"
                    />
                    <Label htmlFor="family_present" className="text-sm">Family member present</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="requires_assistance"
                      checked={vitals.requires_assistance}
                      onChange={(e) => handleChange('requires_assistance', e.target.checked.toString())}
                      className="rounded"
                    />
                    <Label htmlFor="requires_assistance" className="text-sm">Requires special assistance</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="pain_management_needed"
                      checked={vitals.pain_management_needed}
                      onChange={(e) => handleChange('pain_management_needed', e.target.checked.toString())}
                      className="rounded"
                    />
                    <Label htmlFor="pain_management_needed" className="text-sm">Pain management needed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="mobility_concerns"
                      checked={vitals.mobility_concerns}
                      onChange={(e) => handleChange('mobility_concerns', e.target.checked.toString())}
                      className="rounded"
                    />
                    <Label htmlFor="mobility_concerns" className="text-sm">Mobility concerns</Label>
                  </div>
                </div>
              </div>

              {/* Critical Flags */}
              <div className="space-y-3 mb-4">
                <Label className="text-sm font-medium">Critical Flags</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="mark_critical"
                      checked={vitals.mark_critical}
                      onChange={(e) => handleChange('mark_critical', e.target.checked.toString())}
                      className="rounded"
                    />
                    <Label htmlFor="mark_critical" className="text-sm text-orange-700">☐ Mark as critical for doctor review</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="requires_followup"
                      checked={vitals.requires_followup}
                      onChange={(e) => handleChange('requires_followup', e.target.checked.toString())}
                      className="rounded"
                    />
                    <Label htmlFor="requires_followup" className="text-sm text-blue-700">☐ Requires follow-up documentation</Label>
                  </div>
                </div>
              </div>

              {/* Nurse Notes Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="nurse_notes">Additional Observations</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        // Voice-to-text placeholder - would integrate with Web Speech API
                        toast.info('Voice-to-text feature coming soon');
                      }}
                    >
                      <Mic className="h-3 w-3 mr-1" />
                      Voice
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {vitals.nurse_notes.length}/2000
                    </span>
                  </div>
                </div>
                <Textarea
                  id="nurse_notes"
                  placeholder="Additional observations or notes for the doctor..."
                  value={vitals.nurse_notes}
                  onChange={(e) => handleChange('nurse_notes', e.target.value)}
                  rows={4}
                  maxLength={2000}
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
            {isSubmitting ? 'Saving...' : 'Complete Preparation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
