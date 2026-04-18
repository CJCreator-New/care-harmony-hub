import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OfflineVitalsFormData {
  patientId: string;
  systolic: string;
  diastolic: string;
  temperature: string;
  respiratoryRate: string;
  spO2: string;
  weight: string;
  height: string;
  painLevel: string;
  chiefComplaint: string;
  capturedAt: string;
}

interface OfflineVitalsCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVitalsCaptured?: () => void;
}

const VITALS_RANGES = {
  systolic: { min: 40, max: 250, unit: 'mmHg' },
  diastolic: { min: 20, max: 160, unit: 'mmHg' },
  temperature: { min: 35, max: 42, unit: '°C' },
  respiratoryRate: { min: 8, max: 50, unit: 'breaths/min' },
  spO2: { min: 50, max: 100, unit: '%' },
  weight: { min: 1, max: 300, unit: 'kg' },
  height: { min: 30, max: 250, unit: 'cm' },
  painLevel: { min: 0, max: 10, unit: '/10' }
};

export function OfflineVitalsCaptureModal({ 
  open, 
  onOpenChange, 
  onVitalsCaptured 
}: OfflineVitalsCaptureModalProps) {
  const { queueAction, isOnline } = useOfflineSync();
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<OfflineVitalsFormData>({
    patientId: '',
    systolic: '',
    diastolic: '',
    temperature: '',
    respiratoryRate: '',
    spO2: '',
    weight: '',
    height: '',
    painLevel: '',
    chiefComplaint: '',
    capturedAt: new Date().toISOString()
  });

  const validateField = (name: string, value: string): string => {
    if (!value && name !== 'chiefComplaint') {
      return `${name.replace(/([A-Z])/g, ' $1')} is required`;
    }

    if (name === 'patientId' && !value.match(/^[a-zA-Z0-9-]+$/)) {
      return 'Invalid patient ID format';
    }

    const range = VITALS_RANGES[name as keyof typeof VITALS_RANGES];
    if (range && value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return `${name.replace(/([A-Z])/g, ' $1')} must be a number`;
      }
      if (numValue < range.min || numValue > range.max) {
        return `${name.replace(/([A-Z])/g, ' $1')} must be between ${range.min}-${range.max} ${range.unit}`;
      }
    }

    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.currentTarget;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    const newErrors: Record<string, string> = {};
    const requiredFields = ['patientId', 'systolic', 'diastolic', 'temperature', 'respiratoryRate', 'spO2', 'weight', 'height', 'painLevel'];
    
    requiredFields.forEach(field => {
      const error = validateField(field, formData[field as keyof OfflineVitalsFormData]);
      if (error) newErrors[field] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive"
      });
      return;
    }

    try {
      // Queue the vitals as an offline action
      queueAction('create', 'vital_signs', {
        patient_id: formData.patientId,
        systolic_bp: parseInt(formData.systolic),
        diastolic_bp: parseInt(formData.diastolic),
        temperature: parseFloat(formData.temperature),
        respiratory_rate: parseInt(formData.respiratoryRate),
        spo2: parseInt(formData.spO2),
        weight: parseFloat(formData.weight),
        height: parseInt(formData.height),
        pain_level: parseInt(formData.painLevel),
        chief_complaint: formData.chiefComplaint || null,
        captured_at: new Date().toISOString(),
        is_offline_capture: true
      });

      toast({
        title: isOnline ? "Vitals recorded" : "Vitals saved offline",
        description: isOnline ? "Vitals sent to server" : "Will sync when you reconnect"
      });

      // Reset form
      setFormData({
        patientId: '',
        systolic: '',
        diastolic: '',
        temperature: '',
        respiratoryRate: '',
        spO2: '',
        weight: '',
        height: '',
        painLevel: '',
        chiefComplaint: '',
        capturedAt: new Date().toISOString()
      });
      setErrors({});
      onOpenChange(false);
      onVitalsCaptured?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save vitals",
        variant: "destructive"
      });
    }
  }, [formData, queueAction, isOnline, toast, onOpenChange, onVitalsCaptured]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Vital Signs</DialogTitle>
          <DialogDescription>
            {isOnline ? "Vitals will be sent immediately" : "Vitals will be saved and synced when you reconnect"}
          </DialogDescription>
        </DialogHeader>

        {!isOnline && (
          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You are offline. Your vitals will be securely saved locally and synced automatically.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient ID */}
          <div className="space-y-2">
            <Label htmlFor="patientId">Patient ID *</Label>
            <Input
              id="patientId"
              name="patientId"
              placeholder="e.g., PAT-2026-001"
              value={formData.patientId}
              onChange={handleInputChange}
              aria-invalid={!!errors.patientId}
              aria-describedby={errors.patientId ? 'patientId-error' : undefined}
              className={errors.patientId ? 'border-red-500' : ''}
            />
            {errors.patientId && (
              <p id="patientId-error" className="text-sm text-red-500" role="alert">
                {errors.patientId}
              </p>
            )}
          </div>

          {/* Blood Pressure */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="systolic">Systolic BP (mmHg) *</Label>
              <Input
                id="systolic"
                name="systolic"
                type="number"
                placeholder="120"
                value={formData.systolic}
                onChange={handleInputChange}
                aria-invalid={!!errors.systolic}
                aria-describedby={errors.systolic ? 'systolic-error' : undefined}
                className={errors.systolic ? 'border-red-500' : ''}
              />
              {errors.systolic && (
                <p id="systolic-error" className="text-sm text-red-500" role="alert">
                  {errors.systolic}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="diastolic">Diastolic BP (mmHg) *</Label>
              <Input
                id="diastolic"
                name="diastolic"
                type="number"
                placeholder="80"
                value={formData.diastolic}
                onChange={handleInputChange}
                aria-invalid={!!errors.diastolic}
                aria-describedby={errors.diastolic ? 'diastolic-error' : undefined}
                className={errors.diastolic ? 'border-red-500' : ''}
              />
              {errors.diastolic && (
                <p id="diastolic-error" className="text-sm text-red-500" role="alert">
                  {errors.diastolic}
                </p>
              )}
            </div>
          </div>

          {/* Temperature & Respiratory Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature (°C) *</Label>
              <Input
                id="temperature"
                name="temperature"
                type="number"
                step="0.1"
                placeholder="37.0"
                value={formData.temperature}
                onChange={handleInputChange}
                aria-invalid={!!errors.temperature}
                aria-describedby={errors.temperature ? 'temperature-error' : undefined}
                className={errors.temperature ? 'border-red-500' : ''}
              />
              {errors.temperature && (
                <p id="temperature-error" className="text-sm text-red-500" role="alert">
                  {errors.temperature}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="respiratoryRate">Respiratory Rate (breaths/min) *</Label>
              <Input
                id="respiratoryRate"
                name="respiratoryRate"
                type="number"
                placeholder="16"
                value={formData.respiratoryRate}
                onChange={handleInputChange}
                aria-invalid={!!errors.respiratoryRate}
                aria-describedby={errors.respiratoryRate ? 'respiratoryRate-error' : undefined}
                className={errors.respiratoryRate ? 'border-red-500' : ''}
              />
              {errors.respiratoryRate && (
                <p id="respiratoryRate-error" className="text-sm text-red-500" role="alert">
                  {errors.respiratoryRate}
                </p>
              )}
            </div>
          </div>

          {/* SpO2 & Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spO2">SpO2 (%) *</Label>
              <Input
                id="spO2"
                name="spO2"
                type="number"
                placeholder="98"
                value={formData.spO2}
                onChange={handleInputChange}
                aria-invalid={!!errors.spO2}
                aria-describedby={errors.spO2 ? 'spO2-error' : undefined}
                className={errors.spO2 ? 'border-red-500' : ''}
              />
              {errors.spO2 && (
                <p id="spO2-error" className="text-sm text-red-500" role="alert">
                  {errors.spO2}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg) *</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                step="0.1"
                placeholder="70"
                value={formData.weight}
                onChange={handleInputChange}
                aria-invalid={!!errors.weight}
                aria-describedby={errors.weight ? 'weight-error' : undefined}
                className={errors.weight ? 'border-red-500' : ''}
              />
              {errors.weight && (
                <p id="weight-error" className="text-sm text-red-500" role="alert">
                  {errors.weight}
                </p>
              )}
            </div>
          </div>

          {/* Height & Pain Level */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm) *</Label>
              <Input
                id="height"
                name="height"
                type="number"
                placeholder="175"
                value={formData.height}
                onChange={handleInputChange}
                aria-invalid={!!errors.height}
                aria-describedby={errors.height ? 'height-error' : undefined}
                className={errors.height ? 'border-red-500' : ''}
              />
              {errors.height && (
                <p id="height-error" className="text-sm text-red-500" role="alert">
                  {errors.height}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="painLevel">Pain Level (0-10) *</Label>
              <Input
                id="painLevel"
                name="painLevel"
                type="number"
                min="0"
                max="10"
                placeholder="0"
                value={formData.painLevel}
                onChange={handleInputChange}
                aria-invalid={!!errors.painLevel}
                aria-describedby={errors.painLevel ? 'painLevel-error' : undefined}
                className={errors.painLevel ? 'border-red-500' : ''}
              />
              {errors.painLevel && (
                <p id="painLevel-error" className="text-sm text-red-500" role="alert">
                  {errors.painLevel}
                </p>
              )}
            </div>
          </div>

          {/* Chief Complaint */}
          <div className="space-y-2">
            <Label htmlFor="chiefComplaint">Chief Complaint (optional)</Label>
            <textarea
              id="chiefComplaint"
              name="chiefComplaint"
              placeholder="e.g., Headache, shortness of breath"
              value={formData.chiefComplaint}
              onChange={handleInputChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {isOnline ? "Save & Send" : "Save Offline"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
