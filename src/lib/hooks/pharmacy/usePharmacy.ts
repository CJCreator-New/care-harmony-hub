import { useState } from 'react';

import { sanitizePostgrestFilterValue, toIlikePattern } from '@/utils/sanitize';
import { supabase } from '@/integrations/supabase/client';

import { EPrescription, FormularyDrug, DrugInteraction } from '@/types/pharmacy';

// Hook for managing e-prescriptions
export const useEPrescriptions = () => {
  const [ePrescriptions, setEPrescriptions] = useState<EPrescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEPrescriptions = async (hospitalId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('e_prescriptions')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEPrescriptions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch e-prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const transmitPrescription = async (prescriptionId: string, pharmacyNCPDPId: string) => {
    setLoading(true);
    try {
      // Generate NCPDP SCRIPT XML (simplified for demo)
      const ncpdpScript = generateNCPDPScript(prescriptionId);

      const { data, error } = await supabase
        .from('e_prescriptions')
        .insert({
          prescription_id: prescriptionId,
          ncpdp_script_xml: ncpdpScript,
          pharmacy_ncpdp_id: pharmacyNCPDPId,
          transmission_status: 'transmitted',
          transmitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setEPrescriptions((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transmit prescription');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateNCPDPScript = (prescriptionId: string): string => {
    // Simplified NCPDP SCRIPT generation (in real app, use proper library)
    return `<?xml version="1.0" encoding="UTF-8"?>
<Message>
  <Header>
    <To>PHARMACY</To>
    <From>PRESCRIBER</From>
    <MessageID>${Date.now()}</MessageID>
  </Header>
  <Body>
    <NewRx>
      <PrescriptionId>${prescriptionId}</PrescriptionId>
      <Timestamp>${new Date().toISOString()}</Timestamp>
    </NewRx>
  </Body>
</Message>`;
  };

  return {
    ePrescriptions,
    loading,
    error,
    fetchEPrescriptions,
    transmitPrescription,
  };
};

// Hook for formulary management
export const useFormulary = () => {
  const [formularyDrugs, setFormularyDrugs] = useState<FormularyDrug[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFormularyDrugs = async (hospitalId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('formulary_drugs')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('drug_name');

      if (error) throw error;
      setFormularyDrugs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch formulary');
    } finally {
      setLoading(false);
    }
  };

  const checkFormularyStatus = (drugName: string): FormularyDrug | null => {
    return (
      formularyDrugs.find(
        (drug) =>
          drug.drug_name.toLowerCase() === drugName.toLowerCase() ||
          drug.generic_name?.toLowerCase() === drugName.toLowerCase()
      ) || null
    );
  };

  const addToFormulary = async (drugData: Omit<FormularyDrug, 'id' | 'created_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('formulary_drugs')
        .insert(drugData)
        .select()
        .single();

      if (error) throw error;

      setFormularyDrugs((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to formulary');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    formularyDrugs,
    loading,
    error,
    fetchFormularyDrugs,
    checkFormularyStatus,
    addToFormulary,
  };
};

// Hook for drug interactions
export const useDrugInteractions = () => {
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkInteractions = async (medications: string[]): Promise<DrugInteraction[]> => {
    const sanitizedMeds = medications
      .map((medication) => sanitizePostgrestFilterValue(medication))
      .filter((medication): medication is string => Boolean(medication));

    if (sanitizedMeds.length < 2) return [];

    setLoading(true);
    try {
      const pairClauses: string[] = [];
      for (let i = 0; i < sanitizedMeds.length; i++) {
        for (let j = i + 1; j < sanitizedMeds.length; j++) {
          const med1Pattern = toIlikePattern(sanitizedMeds[i]);
          const med2Pattern = toIlikePattern(sanitizedMeds[j]);
          if (!med1Pattern || !med2Pattern) continue;

          pairClauses.push(`and(drug1_name.ilike.${med1Pattern},drug2_name.ilike.${med2Pattern})`);
          pairClauses.push(`and(drug1_name.ilike.${med2Pattern},drug2_name.ilike.${med1Pattern})`);
        }
      }

      if (pairClauses.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('drug_interactions')
        .select('*')
        .or(pairClauses.join(','));

      if (error) throw error;

      const foundInteractions = data || [];
      setInteractions(foundInteractions);
      return foundInteractions;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check interactions');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const addInteraction = async (interactionData: Omit<DrugInteraction, 'id' | 'created_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('drug_interactions')
        .insert(interactionData)
        .select()
        .single();

      if (error) throw error;

      setInteractions((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add interaction');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    interactions,
    loading,
    error,
    checkInteractions,
    addInteraction,
  };
};
