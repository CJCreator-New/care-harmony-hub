import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface MedicationAlert {
  id: string;
  type: 'interaction' | 'allergy' | 'timing' | 'dosage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  medication: string;
}

export function useMedicationAlerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<MedicationAlert[]>([]);

  const checkMedication = useCallback((medication: string, patientAllergies: string[], currentMeds: string[]) => {
    const newAlerts: MedicationAlert[] = [];

    // Check allergies
    if (patientAllergies.some(allergy => medication.toLowerCase().includes(allergy.toLowerCase()))) {
      newAlerts.push({
        id: `allergy-${Date.now()}`,
        type: 'allergy',
        severity: 'critical',
        message: `ALLERGY ALERT: Patient is allergic to ${medication}`,
        medication,
      });
    }

    // Check interactions (simplified)
    const interactions: Record<string, string[]> = {
      'warfarin': ['aspirin', 'ibuprofen'],
      'aspirin': ['warfarin', 'clopidogrel'],
    };

    Object.entries(interactions).forEach(([drug, interacts]) => {
      if (medication.toLowerCase().includes(drug) && 
          currentMeds.some(med => interacts.some(i => med.toLowerCase().includes(i)))) {
        newAlerts.push({
          id: `interaction-${Date.now()}`,
          type: 'interaction',
          severity: 'high',
          message: `Drug interaction warning: ${medication} with current medications`,
          medication,
        });
      }
    });

    setAlerts(newAlerts);

    if (newAlerts.length > 0) {
      toast({
        title: 'Medication Alert',
        description: `${newAlerts.length} alert(s) for ${medication}`,
        variant: newAlerts.some(a => a.severity === 'critical') ? 'destructive' : 'default',
      });
    }

    return newAlerts;
  }, [toast]);

  const clearAlerts = useCallback(() => setAlerts([]), []);

  return { alerts, checkMedication, clearAlerts };
}
