import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
}

export interface DrugInteractionResult extends Array<DrugInteraction> {
  interactions: DrugInteraction[];
  hasInteractions: boolean;
  requiresManualReview: boolean;
  error?: string;
  severity?: 'minor' | 'moderate' | 'major' | 'none' | 'unknown';
}

export interface UseDrugInteractionCheckerParams {
  prescriptionId?: string;
  patientId?: string;
  drugCodes?: string[];
  newDrugRxcui?: string;
  newDrugName?: string;
  medicationName?: string;
}

export type UseDrugInteractionCheckerInput = string | UseDrugInteractionCheckerParams;

function createInteractionResult(
  items: DrugInteraction[],
  options: {
    hasInteractions: boolean;
    requiresManualReview: boolean;
    error?: string;
    severity?: 'minor' | 'moderate' | 'major' | 'none' | 'unknown';
  }
): DrugInteractionResult {
  const arr = [...items] as DrugInteractionResult;
  arr.interactions = items;
  arr.hasInteractions = options.hasInteractions;
  arr.requiresManualReview = options.requiresManualReview;
  arr.error = options.error;
  arr.severity = options.severity ?? (items.length > 0 ? 'moderate' : 'none');
  return arr;
}

export function useDrugInteractionChecker(input: UseDrugInteractionCheckerInput) {
  const isString = typeof input === 'string';
  const prescriptionId = isString ? input : input?.prescriptionId;
  const patientId = !isString ? input?.patientId : undefined;
  const drugCodes = !isString ? input?.drugCodes : undefined;
  const drugName = !isString ? (input?.newDrugName || input?.medicationName) : undefined;
  const newDrugRxcui = !isString ? input?.newDrugRxcui : undefined;

  const isEnabled = Boolean(
    prescriptionId ||
    patientId ||
    (drugCodes && drugCodes.length > 0) ||
    drugName ||
    newDrugRxcui
  );

  return useQuery({
    queryKey: ['drug-interactions', prescriptionId, patientId, ...(drugCodes || []), drugName, newDrugRxcui],
    queryFn: async (): Promise<DrugInteractionResult> => {
      let targetPatientId = patientId;
      let targetDrugName = drugName;
      let targetDrugRxcui = newDrugRxcui;
      let targetDrugCodes = drugCodes ? [...drugCodes] : [];

      if (prescriptionId) {
        const { data: prescription, error: prescError } = await supabase
          .from('prescriptions')
          .select('patient_id, medication_name, drug_rxcui')
          .eq('id', prescriptionId)
          .maybeSingle();

        if (prescError || !prescription) {
          console.warn('[useDrugInteractionChecker] Prescription lookup failed, enforcing fail-closed:', prescError);
          return createInteractionResult(
            [
              {
                drug1: targetDrugName || 'Prescribed Medication',
                drug2: 'Clinical Decision Support System',
                severity: 'major',
                description: 'Clinical check unavailable - pharmacist review required',
              },
            ],
            {
              hasInteractions: true,
              requiresManualReview: true,
              error: 'Clinical check unavailable - pharmacist review required',
              severity: 'unknown',
            }
          );
        }

        targetPatientId = prescription.patient_id;
        targetDrugName = targetDrugName || prescription.medication_name;
        targetDrugRxcui = targetDrugRxcui || prescription.drug_rxcui || prescription.medication_name;
        if (targetDrugRxcui && !targetDrugCodes.includes(targetDrugRxcui)) {
          targetDrugCodes.push(targetDrugRxcui);
        }
      }

      // If no drug was resolved, return safe default
      if (!targetDrugName && targetDrugCodes.length === 0 && !targetDrugRxcui) {
        return createInteractionResult([], {
          hasInteractions: false,
          requiresManualReview: false,
          severity: 'none',
        });
      }

      // Invoke backend edge function with fail-closed semantics
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('drug-interaction-check', {
          body: {
            patientId: targetPatientId,
            newDrugRxcui: targetDrugRxcui || targetDrugCodes[0] || targetDrugName,
            newDrugName: targetDrugName,
            drugCodes: targetDrugCodes.length > 0 ? targetDrugCodes : undefined,
            medications: targetDrugName ? [targetDrugName] : undefined,
          },
        });

        if (edgeError) {
          console.warn('[useDrugInteractionChecker] Edge function error, enforcing fail-closed:', edgeError);
          return createInteractionResult(
            [
              {
                drug1: targetDrugName || targetDrugCodes[0] || 'Prescribed Medication',
                drug2: 'External Drug Interaction Service',
                severity: 'major',
                description: 'Clinical check unavailable - pharmacist review required',
              },
            ],
            {
              hasInteractions: true,
              requiresManualReview: true,
              error: 'Clinical check unavailable - pharmacist review required',
              severity: 'unknown',
            }
          );
        }

        const interactions: DrugInteraction[] = [];
        if (edgeData && Array.isArray(edgeData.interactions)) {
          for (const item of edgeData.interactions) {
            const sev =
              item.severity === 'contraindicated' || item.severity === 'serious'
                ? 'major'
                : item.severity || 'moderate';
            interactions.push({
              drug1: targetDrugName || targetDrugCodes[0] || 'Prescribed Medication',
              drug2: item.interactingDrug || 'Active Medication',
              severity: sev as DrugInteraction['severity'],
              description: item.recommendation || item.description || 'Clinical contraindication identified',
            });
          }
        }

        const hasInteractions =
          interactions.length > 0 || Boolean(edgeData?.interactions_found && edgeData.interactions_found > 0);
        const hasSevere =
          interactions.some((i) => i.severity === 'major') ||
          edgeData?.severity === 'contraindicated' ||
          edgeData?.severity === 'serious';
        const requiresManualReview = Boolean(edgeData?.requiresManualReview || hasSevere);

        return createInteractionResult(interactions, {
          hasInteractions,
          requiresManualReview,
          error: edgeData?.error,
          severity: hasSevere ? 'major' : hasInteractions ? 'moderate' : 'none',
        });
      } catch (err: any) {
        console.warn('[useDrugInteractionChecker] Invocation exception, enforcing fail-closed:', err);
        return createInteractionResult(
          [
            {
              drug1: targetDrugName || targetDrugCodes[0] || 'Prescribed Medication',
              drug2: 'External Drug Interaction Service',
              severity: 'major',
              description: 'Clinical check unavailable - pharmacist review required',
            },
          ],
          {
            hasInteractions: true,
            requiresManualReview: true,
            error: 'Clinical check unavailable - pharmacist review required',
            severity: 'unknown',
          }
        );
      }
    },
    enabled: isEnabled,
  });
}
