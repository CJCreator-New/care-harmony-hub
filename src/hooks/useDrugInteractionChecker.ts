import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
}

export function useDrugInteractionChecker(prescriptionId: string) {
  return useQuery({
    queryKey: ['drug-interactions', prescriptionId],
    queryFn: async () => {
      const { data: prescription, error: prescError } = await supabase
        .from('prescriptions')
        .select('patient_id, medication_name')
        .eq('id', prescriptionId)
        .single();

      if (prescError) throw prescError;

      const { data: activeMeds, error: medsError } = await supabase
        .from('prescriptions')
        .select('medication_name')
        .eq('patient_id', prescription.patient_id)
        .eq('status', 'active');

      if (medsError) throw medsError;

      const interactions: DrugInteraction[] = [];
      const knownInteractions: Record<string, { with: string; severity: DrugInteraction['severity']; description: string }[]> = {
        'warfarin': [
          { with: 'aspirin', severity: 'major', description: 'Increased bleeding risk' },
          { with: 'ibuprofen', severity: 'major', description: 'Increased bleeding risk' },
        ],
        'metformin': [
          { with: 'alcohol', severity: 'moderate', description: 'Risk of lactic acidosis' },
        ],
        'lisinopril': [
          { with: 'potassium', severity: 'moderate', description: 'Hyperkalemia risk' },
        ],
      };

      const newMed = prescription.medication_name.toLowerCase();
      activeMeds?.forEach((med) => {
        const activeMed = med.medication_name.toLowerCase();
        
        if (knownInteractions[newMed]) {
          knownInteractions[newMed].forEach((interaction) => {
            if (activeMed.includes(interaction.with)) {
              interactions.push({
                drug1: prescription.medication_name,
                drug2: med.medication_name,
                severity: interaction.severity,
                description: interaction.description,
              });
            }
          });
        }

        if (knownInteractions[activeMed]) {
          knownInteractions[activeMed].forEach((interaction) => {
            if (newMed.includes(interaction.with)) {
              interactions.push({
                drug1: med.medication_name,
                drug2: prescription.medication_name,
                severity: interaction.severity,
                description: interaction.description,
              });
            }
          });
        }
      });

      return interactions;
    },
    enabled: !!prescriptionId,
  });
}
