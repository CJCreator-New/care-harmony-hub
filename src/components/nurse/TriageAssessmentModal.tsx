import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, Stethoscope } from 'lucide-react';
import { TriageAssessment, ESI_LEVELS, VitalSigns } from '@/types/nursing';

interface TriageAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  appointmentId?: string;
  onSave: (assessment: Partial<TriageAssessment>) => void;
}

export const TriageAssessmentModal: React.FC<TriageAssessmentModalProps> = ({
  isOpen,
  onClose,
  patientId,
  appointmentId,
  onSave
}) => {
  const [assessment, setAssessment] = useState<Partial<TriageAssessment>>({
    patient_id: patientId,
    appointment_id: appointmentId,
    esi_level: 3,
    chief_complaint: '',
    pain_score: 0,
    requires_immediate_attention: false,
    high_risk_situation: false,
    resource_needs: [],
    presenting_symptoms: [],
    allergies_verified: false,
    medications_reviewed: false,
    vital_signs: {}
  });

  const handleESIChange = (level: 1 | 2 | 3 | 4 | 5) => {
    setAssessment(prev => ({ ...prev, esi_level: level }));
  };

  const handleVitalChange = (key: keyof VitalSigns, value: string) => {
    setAssessment(prev => ({
      ...prev,
      vital_signs: {
        ...prev.vital_signs,
        [key]: parseFloat(value) || undefined
      }
    }));
  };

  const handleSymptomToggle = (symptom: string) => {
    setAssessment(prev => ({
      ...prev,
      presenting_symptoms: prev.presenting_symptoms?.includes(symptom)
        ? prev.presenting_symptoms.filter(s => s !== symptom)
        : [...(prev.presenting_symptoms || []), symptom]
    }));
  };

  const handleResourceToggle = (resource: string) => {
    setAssessment(prev => ({
      ...prev,
      resource_needs: prev.resource_needs?.includes(resource)
        ? prev.resource_needs.filter(r => r !== resource)
        : [...(prev.resource_needs || []), resource]
    }));
  };

  const handleSave = () => {
    onSave({
      ...assessment,
      triage_start_time: new Date().toISOString(),
      triage_complete_time: new Date().toISOString()
    });
    onClose();
  };

  const selectedESI = ESI_LEVELS.find(level => level.level === assessment.esi_level);

  const commonSymptoms = [
    'Chest Pain', 'Shortness of Breath', 'Abdominal Pain', 'Headache',
    'Nausea/Vomiting', 'Fever', 'Dizziness', 'Back Pain'
  ];

  const resourceOptions = [
    'Laboratory', 'Radiology', 'EKG', 'IV Access', 'Medications', 'Specialist Consult'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Triage Assessment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* ESI Level Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emergency Severity Index (ESI)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {ESI_LEVELS.map((level) => (
                  <Button
                    key={level.level}
                    variant={assessment.esi_level === level.level ? 'default' : 'outline'}
                    className={`h-auto p-3 flex flex-col items-center ${
                      assessment.esi_level === level.level ? `bg-${level.color}-500` : ''
                    }`}
                    onClick={() => handleESIChange(level.level)}
                  >
                    <div className="text-lg font-bold">{level.level}</div>
                    <div className="text-xs text-center">{level.description}</div>
                    <div className="text-xs opacity-75">{level.max_wait_time}</div>
                  </Button>
                ))}
              </div>
              {selectedESI && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Level {selectedESI.level} Criteria:</p>
                  <ul className="text-sm text-muted-foreground mt-1">
                    {selectedESI.criteria.map((criterion) => (
                      <li key={criterion}>• {criterion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chief Complaint & Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chief Complaint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="chief_complaint">Primary Complaint *</Label>
                  <Textarea
                    id="chief_complaint"
                    value={assessment.chief_complaint}
                    onChange={(e) => setAssessment(prev => ({ ...prev, chief_complaint: e.target.value }))}
                    placeholder="Patient's primary complaint in their own words..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="pain_score">Pain Score (0-10)</Label>
                  <Input
                    id="pain_score"
                    type="number"
                    min="0"
                    max="10"
                    value={assessment.pain_score}
                    onChange={(e) => setAssessment(prev => ({ ...prev, pain_score: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vital Signs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Temperature (°F)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="98.6"
                      onChange={(e) => handleVitalChange('temperature', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Heart Rate</Label>
                    <Input
                      type="number"
                      placeholder="72"
                      onChange={(e) => handleVitalChange('heart_rate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>BP Systolic</Label>
                    <Input
                      type="number"
                      placeholder="120"
                      onChange={(e) => handleVitalChange('blood_pressure_systolic', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>BP Diastolic</Label>
                    <Input
                      type="number"
                      placeholder="80"
                      onChange={(e) => handleVitalChange('blood_pressure_diastolic', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Resp Rate</Label>
                    <Input
                      type="number"
                      placeholder="16"
                      onChange={(e) => handleVitalChange('respiratory_rate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>O2 Sat (%)</Label>
                    <Input
                      type="number"
                      placeholder="98"
                      onChange={(e) => handleVitalChange('oxygen_saturation', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Presenting Symptoms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Presenting Symptoms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {commonSymptoms.map((symptom) => (
                  <div key={symptom} className="flex items-center space-x-2">
                    <Checkbox
                      id={symptom}
                      checked={assessment.presenting_symptoms?.includes(symptom)}
                      onCheckedChange={() => handleSymptomToggle(symptom)}
                    />
                    <Label htmlFor={symptom} className="text-sm">{symptom}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resource Needs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Anticipated Resource Needs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {resourceOptions.map((resource) => (
                  <div key={resource} className="flex items-center space-x-2">
                    <Checkbox
                      id={resource}
                      checked={assessment.resource_needs?.includes(resource)}
                      onCheckedChange={() => handleResourceToggle(resource)}
                    />
                    <Label htmlFor={resource} className="text-sm">{resource}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Safety Checks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Safety Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="immediate_attention"
                  checked={assessment.requires_immediate_attention}
                  onCheckedChange={(checked) => 
                    setAssessment(prev => ({ ...prev, requires_immediate_attention: checked as boolean }))
                  }
                />
                <Label htmlFor="immediate_attention">Requires Immediate Attention</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="high_risk"
                  checked={assessment.high_risk_situation}
                  onCheckedChange={(checked) => 
                    setAssessment(prev => ({ ...prev, high_risk_situation: checked as boolean }))
                  }
                />
                <Label htmlFor="high_risk">High Risk Situation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allergies_verified"
                  checked={assessment.allergies_verified}
                  onCheckedChange={(checked) => 
                    setAssessment(prev => ({ ...prev, allergies_verified: checked as boolean }))
                  }
                />
                <Label htmlFor="allergies_verified">Allergies Verified</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="medications_reviewed"
                  checked={assessment.medications_reviewed}
                  onCheckedChange={(checked) => 
                    setAssessment(prev => ({ ...prev, medications_reviewed: checked as boolean }))
                  }
                />
                <Label htmlFor="medications_reviewed">Medications Reviewed</Label>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={assessment.notes || ''}
              onChange={(e) => setAssessment(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional assessment notes..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!assessment.chief_complaint}>
            Complete Triage
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
