import { useState, useEffect } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Smartphone } from 'lucide-react';

interface MobileVitalsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (vitals: any) => void;
}

export function MobileLandscapeVitalsForm({ isOpen, onClose, onSubmit }: MobileVitalsFormProps) {
  const { queueAction, isOnline } = useOfflineSync();
  const { toast } = useToast();
  const [isPortrait, setIsPortrait] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    temperature: '',
    respiratory_rate: '',
    spo2: '',
    weight: '',
    height: '',
    pain_level: '',
    chief_complaint: ''
  });

  const handleOrientationChange = () => {
    setIsPortrait(window.innerHeight > window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener('resize', handleOrientationChange);
    return () => window.removeEventListener('resize', handleOrientationChange);
  }, []);

  const validateVitals = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patient_id.trim()) {
      newErrors.patient_id = 'Patient ID required';
    }

    if (formData.systolic_bp) {
      const sys = parseInt(formData.systolic_bp);
      if (sys < 40 || sys > 250) newErrors.systolic_bp = 'Range: 40-250';
    }

    if (formData.diastolic_bp) {
      const dia = parseInt(formData.diastolic_bp);
      if (dia < 30 || dia > 150) newErrors.diastolic_bp = 'Range: 30-150';
    }

    if (formData.heart_rate) {
      const hr = parseInt(formData.heart_rate);
      if (hr < 30 || hr > 220) newErrors.heart_rate = 'Range: 30-220';
    }

    if (formData.temperature) {
      const temp = parseFloat(formData.temperature);
      if (temp < 35 || temp > 42) newErrors.temperature = 'Range: 35-42°C';
    }

    if (formData.respiratory_rate) {
      const rr = parseInt(formData.respiratory_rate);
      if (rr < 8 || rr > 50) newErrors.respiratory_rate = 'Range: 8-50';
    }

    if (formData.spo2) {
      const spo2 = parseInt(formData.spo2);
      if (spo2 < 50 || spo2 > 100) newErrors.spo2 = 'Range: 50-100%';
    }

    if (formData.weight) {
      const w = parseFloat(formData.weight);
      if (w < 1 || w > 300) newErrors.weight = 'Range: 1-300kg';
    }

    if (formData.height) {
      const h = parseFloat(formData.height);
      if (h < 30 || h > 250) newErrors.height = 'Range: 30-250cm';
    }

    if (formData.pain_level) {
      const pain = parseInt(formData.pain_level);
      if (pain < 0 || pain > 10) newErrors.pain_level = 'Range: 0-10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateVitals()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the highlighted errors',
        variant: 'destructive',
        duration: 2000
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const vitalData = {
        patient_id: formData.patient_id,
        systolic_bp: parseInt(formData.systolic_bp) || 0,
        diastolic_bp: parseInt(formData.diastolic_bp) || 0,
        heart_rate: parseInt(formData.heart_rate) || 0,
        temperature: parseFloat(formData.temperature) || 0,
        respiratory_rate: parseInt(formData.respiratory_rate) || 0,
        spo2: parseInt(formData.spo2) || 0,
        weight: parseFloat(formData.weight) || 0,
        height: parseFloat(formData.height) || 0,
        pain_level: parseInt(formData.pain_level) || 0,
        chief_complaint: formData.chief_complaint,
        captured_at: new Date().toISOString()
      };

      queueAction('create', 'vitals', vitalData as Record<string, unknown>);

      toast({
        title: 'Success',
        description: isOnline ? 'Vital recorded and synced' : 'Vital saved offline - will sync when online',
        duration: 2000
      });

      if (onSubmit) onSubmit(vitalData);

      // Reset form
      setFormData({
        patient_id: '',
        systolic_bp: '',
        diastolic_bp: '',
        heart_rate: '',
        temperature: '',
        respiratory_rate: '',
        spo2: '',
        weight: '',
        height: '',
        pain_level: '',
        chief_complaint: ''
      });

      onClose();
    } catch (error) {
      console.error('Failed to record vital:', error);
      toast({
        title: 'Error',
        description: 'Failed to record vital. Please try again.',
        variant: 'destructive',
        duration: 3000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${
          isPortrait ? 'w-full max-w-md' : 'w-full max-w-5xl'
        } transition-all duration-300`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Quick Vitals Entry
            {!isOnline && <Badge variant="outline">Offline Mode</Badge>}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Landscape Layout - 2 column grid */}
          {!isPortrait && (
            <div className="grid grid-cols-2 gap-4 max-h-80 overflow-y-auto">
              <div>
                <Label htmlFor="landscape-patient" className="text-xs">Patient ID</Label>
                <Input
                  id="landscape-patient"
                  value={formData.patient_id}
                  onChange={(e) => handleInputChange('patient_id', e.target.value)}
                  className={`h-8 text-sm ${errors.patient_id ? 'border-red-500' : ''}`}
                  placeholder="P12345"
                />
                {errors.patient_id && (
                  <p className="text-xs text-red-500 mt-1">{errors.patient_id}</p>
                )}
              </div>

              <div>
                <Label htmlFor="landscape-pain" className="text-xs">Pain (0-10)</Label>
                <Input
                  id="landscape-pain"
                  type="number"
                  value={formData.pain_level}
                  onChange={(e) => handleInputChange('pain_level', e.target.value)}
                  className={`h-8 text-sm ${errors.pain_level ? 'border-red-500' : ''}`}
                  min="0"
                  max="10"
                />
                {errors.pain_level && (
                  <p className="text-xs text-red-500 mt-1">{errors.pain_level}</p>
                )}
              </div>

              <div>
                <Label htmlFor="landscape-sbp" className="text-xs">Systolic (mmHg)</Label>
                <Input
                  id="landscape-sbp"
                  type="number"
                  value={formData.systolic_bp}
                  onChange={(e) => handleInputChange('systolic_bp', e.target.value)}
                  className={`h-8 text-sm ${errors.systolic_bp ? 'border-red-500' : ''}`}
                />
                {errors.systolic_bp && (
                  <p className="text-xs text-red-500 mt-1">{errors.systolic_bp}</p>
                )}
              </div>

              <div>
                <Label htmlFor="landscape-dbp" className="text-xs">Diastolic (mmHg)</Label>
                <Input
                  id="landscape-dbp"
                  type="number"
                  value={formData.diastolic_bp}
                  onChange={(e) => handleInputChange('diastolic_bp', e.target.value)}
                  className={`h-8 text-sm ${errors.diastolic_bp ? 'border-red-500' : ''}`}
                />
                {errors.diastolic_bp && (
                  <p className="text-xs text-red-500 mt-1">{errors.diastolic_bp}</p>
                )}
              </div>

              <div>
                <Label htmlFor="landscape-hr" className="text-xs">Heart Rate (bpm)</Label>
                <Input
                  id="landscape-hr"
                  type="number"
                  value={formData.heart_rate}
                  onChange={(e) => handleInputChange('heart_rate', e.target.value)}
                  className={`h-8 text-sm ${errors.heart_rate ? 'border-red-500' : ''}`}
                />
                {errors.heart_rate && (
                  <p className="text-xs text-red-500 mt-1">{errors.heart_rate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="landscape-temp" className="text-xs">Temperature (°C)</Label>
                <Input
                  id="landscape-temp"
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => handleInputChange('temperature', e.target.value)}
                  className={`h-8 text-sm ${errors.temperature ? 'border-red-500' : ''}`}
                />
                {errors.temperature && (
                  <p className="text-xs text-red-500 mt-1">{errors.temperature}</p>
                )}
              </div>

              <div>
                <Label htmlFor="landscape-rr" className="text-xs">Respiratory Rate (/min)</Label>
                <Input
                  id="landscape-rr"
                  type="number"
                  value={formData.respiratory_rate}
                  onChange={(e) => handleInputChange('respiratory_rate', e.target.value)}
                  className={`h-8 text-sm ${errors.respiratory_rate ? 'border-red-500' : ''}`}
                />
                {errors.respiratory_rate && (
                  <p className="text-xs text-red-500 mt-1">{errors.respiratory_rate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="landscape-spo2" className="text-xs">SpO2 (%)</Label>
                <Input
                  id="landscape-spo2"
                  type="number"
                  value={formData.spo2}
                  onChange={(e) => handleInputChange('spo2', e.target.value)}
                  className={`h-8 text-sm ${errors.spo2 ? 'border-red-500' : ''}`}
                />
                {errors.spo2 && (
                  <p className="text-xs text-red-500 mt-1">{errors.spo2}</p>
                )}
              </div>

              <div>
                <Label htmlFor="landscape-weight" className="text-xs">Weight (kg)</Label>
                <Input
                  id="landscape-weight"
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  className={`h-8 text-sm ${errors.weight ? 'border-red-500' : ''}`}
                />
                {errors.weight && (
                  <p className="text-xs text-red-500 mt-1">{errors.weight}</p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="landscape-height" className="text-xs">Height (cm)</Label>
                <Input
                  id="landscape-height"
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  className={`h-8 text-sm ${errors.height ? 'border-red-500' : ''}`}
                />
                {errors.height && (
                  <p className="text-xs text-red-500 mt-1">{errors.height}</p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="landscape-chief" className="text-xs">Chief Complaint</Label>
                <Input
                  id="landscape-chief"
                  value={formData.chief_complaint}
                  onChange={(e) => handleInputChange('chief_complaint', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          {/* Portrait Layout - Full width stacked */}
          {isPortrait && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="patient-id">Patient ID *</Label>
                <Input
                  id="patient-id"
                  value={formData.patient_id}
                  onChange={(e) => handleInputChange('patient_id', e.target.value)}
                  placeholder="P12345"
                  className={errors.patient_id ? 'border-red-500' : ''}
                />
                {errors.patient_id && (
                  <p className="text-sm text-red-500 mt-1">{errors.patient_id}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="systolic">Systolic (mmHg)</Label>
                  <Input
                    id="systolic"
                    type="number"
                    value={formData.systolic_bp}
                    onChange={(e) => handleInputChange('systolic_bp', e.target.value)}
                    className={errors.systolic_bp ? 'border-red-500' : ''}
                  />
                  {errors.systolic_bp && (
                    <p className="text-xs text-red-500 mt-1">{errors.systolic_bp}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="diastolic">Diastolic (mmHg)</Label>
                  <Input
                    id="diastolic"
                    type="number"
                    value={formData.diastolic_bp}
                    onChange={(e) => handleInputChange('diastolic_bp', e.target.value)}
                    className={errors.diastolic_bp ? 'border-red-500' : ''}
                  />
                  {errors.diastolic_bp && (
                    <p className="text-xs text-red-500 mt-1">{errors.diastolic_bp}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="heart-rate">Heart Rate (bpm)</Label>
                <Input
                  id="heart-rate"
                  type="number"
                  value={formData.heart_rate}
                  onChange={(e) => handleInputChange('heart_rate', e.target.value)}
                  className={errors.heart_rate ? 'border-red-500' : ''}
                />
                {errors.heart_rate && (
                  <p className="text-xs text-red-500 mt-1">{errors.heart_rate}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="temp">Temperature (°C)</Label>
                  <Input
                    id="temp"
                    type="number"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => handleInputChange('temperature', e.target.value)}
                    className={errors.temperature ? 'border-red-500' : ''}
                  />
                  {errors.temperature && (
                    <p className="text-xs text-red-500 mt-1">{errors.temperature}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="rr">Respiratory Rate (/min)</Label>
                  <Input
                    id="rr"
                    type="number"
                    value={formData.respiratory_rate}
                    onChange={(e) => handleInputChange('respiratory_rate', e.target.value)}
                    className={errors.respiratory_rate ? 'border-red-500' : ''}
                  />
                  {errors.respiratory_rate && (
                    <p className="text-xs text-red-500 mt-1">{errors.respiratory_rate}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="spo2">SpO2 (%)</Label>
                  <Input
                    id="spo2"
                    type="number"
                    value={formData.spo2}
                    onChange={(e) => handleInputChange('spo2', e.target.value)}
                    className={errors.spo2 ? 'border-red-500' : ''}
                  />
                  {errors.spo2 && (
                    <p className="text-xs text-red-500 mt-1">{errors.spo2}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="pain">Pain (0-10)</Label>
                  <Input
                    id="pain"
                    type="number"
                    value={formData.pain_level}
                    onChange={(e) => handleInputChange('pain_level', e.target.value)}
                    className={errors.pain_level ? 'border-red-500' : ''}
                    min="0"
                    max="10"
                  />
                  {errors.pain_level && (
                    <p className="text-xs text-red-500 mt-1">{errors.pain_level}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    className={errors.weight ? 'border-red-500' : ''}
                  />
                  {errors.weight && (
                    <p className="text-xs text-red-500 mt-1">{errors.weight}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={formData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    className={errors.height ? 'border-red-500' : ''}
                  />
                  {errors.height && (
                    <p className="text-xs text-red-500 mt-1">{errors.height}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="chief-complaint">Chief Complaint</Label>
                <Input
                  id="chief-complaint"
                  value={formData.chief_complaint}
                  onChange={(e) => handleInputChange('chief_complaint', e.target.value)}
                  placeholder="Chief complaint"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Save Vital'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
