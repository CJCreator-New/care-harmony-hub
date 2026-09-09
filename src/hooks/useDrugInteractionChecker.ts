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
      const seenPairs = new Set<string>();

      const addInteraction = (d1: string, d2: string, sev: DrugInteraction['severity'], desc: string) => {
        const key = [d1.toLowerCase(), d2.toLowerCase()].sort().join('::');
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          interactions.push({ drug1: d1, drug2: d2, severity: sev, description: desc });
        }
      };

      // 1. Invoke drug-interaction-check Edge Function (RxNorm + DB + fail-closed semantics)
      let requiresManualReview = false;
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('drug-interaction-check', {
          body: {
            patientId: prescription.patient_id,
            newDrugRxcui: prescription.medication_name,
            newDrugName: prescription.medication_name,
          },
        });

        if (edgeError) {
          console.warn('[useDrugInteractionChecker] Edge function error, enforcing fail-closed:', edgeError);
          requiresManualReview = true;
        } else if (edgeData) {
          if (edgeData.requiresManualReview) {
            requiresManualReview = true;
          }
          if (Array.isArray(edgeData.interactions)) {
            for (const item of edgeData.interactions) {
              const sev = item.severity === 'contraindicated' ? 'major' : (item.severity || 'moderate');
              addInteraction(
                prescription.medication_name,
                item.interactingDrug || 'Active Medication',
                sev as DrugInteraction['severity'],
                item.recommendation || item.description || 'Clinical contraindication identified'
              );
            }
          }
        }
      } catch (e) {
        console.warn('[useDrugInteractionChecker] Edge function invocation failed, enforcing fail-closed:', e);
        requiresManualReview = true;
      }

      // 2. Check drug_interactions database table
      try {
        const { data: dbInteractions } = await supabase
          .from('drug_interactions')
          .select('drug1_name, drug2_name, severity, description')
          .limit(100);

        if (dbInteractions && dbInteractions.length > 0) {
          const newMedLower = prescription.medication_name.toLowerCase();
          for (const med of activeMeds || []) {
            const activeLower = med.medication_name.toLowerCase();
            for (const row of dbInteractions) {
              const d1 = (row.drug1_name || '').toLowerCase();
              const d2 = (row.drug2_name || '').toLowerCase();
              if (
                (d1.includes(newMedLower) || newMedLower.includes(d1)) &&
                (d2.includes(activeLower) || activeLower.includes(d2))
              ) {
                const sev = (row.severity === 'contraindicated' ? 'major' : row.severity) as DrugInteraction['severity'];
                addInteraction(prescription.medication_name, med.medication_name, sev || 'moderate', row.description);
              } else if (
                (d2.includes(newMedLower) || newMedLower.includes(d2)) &&
                (d1.includes(activeLower) || activeLower.includes(d1))
              ) {
                const sev = (row.severity === 'contraindicated' ? 'major' : row.severity) as DrugInteraction['severity'];
                addInteraction(med.medication_name, prescription.medication_name, sev || 'moderate', row.description);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not query drug_interactions table, using clinical rules:', err);
      }

      // 2. Comprehensive clinical rules fallback
      const knownInteractions: Record<string, { with: string; severity: DrugInteraction['severity']; description: string }[]> = {
        'warfarin': [
          { with: 'aspirin', severity: 'major', description: 'Increased bleeding risk' },
          { with: 'ibuprofen', severity: 'major', description: 'Increased bleeding risk and GI ulceration' },
          { with: 'amiodarone', severity: 'major', description: 'Marked increase in warfarin effect and bleeding risk' },
          { with: 'fluconazole', severity: 'major', description: 'Inhibition of warfarin metabolism, severe bleeding risk' },
        ],
        'metformin': [
          { with: 'alcohol', severity: 'moderate', description: 'Risk of lactic acidosis' },
          { with: 'cimetidine', severity: 'moderate', description: 'Increased metformin concentrations' },
          { with: 'contrast', severity: 'major', description: 'Risk of contrast-induced nephropathy and lactic acidosis' },
        ],
        'lisinopril': [
          { with: 'potassium', severity: 'moderate', description: 'Hyperkalemia risk' },
          { with: 'spironolactone', severity: 'major', description: 'Severe hyperkalemia risk' },
          { with: 'losartan', severity: 'major', description: 'Dual RAAS blockade, increased hypotension and renal impairment' },
        ],
        'methotrexate': [
          { with: 'ibuprofen', severity: 'major', description: 'Reduced MTX clearance, severe bone marrow suppression' },
          { with: 'aspirin', severity: 'major', description: 'Reduced MTX clearance, severe toxicity' },
        ],
        'clopidogrel': [
          { with: 'omeprazole', severity: 'moderate', description: 'Decreased antiplatelet effect of clopidogrel' },
          { with: 'aspirin', severity: 'moderate', description: 'Increased bleeding risk — monitor closely' },
        ],
        'digoxin': [
          { with: 'amiodarone', severity: 'major', description: 'Elevated digoxin serum levels, fatal arrhythmia risk' },
          { with: 'clarithromycin', severity: 'major', description: 'Increased digoxin toxicity' },
        ],
        'simvastatin': [
          { with: 'amiodarone', severity: 'major', description: 'High risk of rhabdomyolysis and myopathy' },
          { with: 'clarithromycin', severity: 'major', description: 'Increased statin toxicity, rhabdomyolysis' },
        ],
      };

      const newMed = prescription.medication_name.toLowerCase();
      activeMeds?.forEach((med) => {
        const activeMed = med.medication_name.toLowerCase();
        
        if (knownInteractions[newMed]) {
          knownInteractions[newMed].forEach((interaction) => {
            if (activeMed.includes(interaction.with)) {
              addInteraction(prescription.medication_name, med.medication_name, interaction.severity, interaction.description);
            }
          });
        }

        if (knownInteractions[activeMed]) {
          knownInteractions[activeMed].forEach((interaction) => {
            if (newMed.includes(interaction.with)) {
              addInteraction(med.medication_name, prescription.medication_name, interaction.severity, interaction.description);
            }
          });
        }
      });

      if (requiresManualReview && interactions.length === 0) {
        interactions.push({
          drug1: prescription.medication_name,
          drug2: 'External RxNorm / CDS Service',
          severity: 'moderate',
          description: 'Automated check unverified due to network or timeout. Requires pharmacist manual review and clinical override before dispensing.',
        });
      }

      return interactions;
    },
    enabled: !!prescriptionId,
  });
}
