import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  EPrescription, 
  FormularyDrug, 
  DrugInteraction, 
  DoseAdjustment,
  PediatricDosing,
  PregnancyLactationSafety,
  TherapeuticClass,
  PriorAuthorization,
  MedicationCounseling,
  SigTemplate,
  EnhancedPrescription,
  DrugSafetyAlert,
  NCPDPScript
} from '@/types/pharmacy';

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
          transmitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setEPrescriptions(prev => [data, ...prev]);
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
    transmitPrescription
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
    return formularyDrugs.find(drug => 
      drug.drug_name.toLowerCase() === drugName.toLowerCase() ||
      drug.generic_name?.toLowerCase() === drugName.toLowerCase()
    ) || null;
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
      
      setFormularyDrugs(prev => [...prev, data]);
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
    addToFormulary
  };
};

// Hook for drug interactions
export const useDrugInteractions = () => {
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkInteractions = async (medications: string[]): Promise<DrugInteraction[]> => {
    if (medications.length < 2) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('drug_interactions')
        .select('*')
        .or(
          medications.map(med1 => 
            medications.map(med2 => 
              med1 !== med2 ? `and(drug1_name.ilike.%${med1}%,drug2_name.ilike.%${med2}%)` : null
            ).filter(Boolean).join(',')
          ).filter(Boolean).join(',')
        );

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
      
      setInteractions(prev => [...prev, data]);
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
    addInteraction
  };
};

// Hook for dose adjustments
export const useDoseAdjustments = () => {
  const [adjustments, setAdjustments] = useState<DoseAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDoseAdjustments = async (drugName: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dose_adjustments')
        .select('*')
        .ilike('drug_name', `%${drugName}%`);

      if (error) throw error;
      setAdjustments(data || []);
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dose adjustments');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    adjustments,
    loading,
    error,
    fetchDoseAdjustments
  };
};

// Hook for pediatric dosing
export const usePediatricDosing = () => {
  const [pediatricProtocols, setPediatricProtocols] = useState<PediatricDosing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPediatricDosing = async (drugName: string, ageGroup?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('pediatric_dosing')
        .select('*')
        .ilike('drug_name', `%${drugName}%`);

      if (ageGroup) {
        query = query.eq('age_group', ageGroup);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPediatricProtocols(data || []);
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pediatric dosing');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    pediatricProtocols,
    loading,
    error,
    fetchPediatricDosing
  };
};

// Hook for pregnancy/lactation safety
export const usePregnancyLactationSafety = () => {
  const [safetyData, setSafetyData] = useState<PregnancyLactationSafety[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSafetyData = async (drugName: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pregnancy_lactation_safety')
        .select('*')
        .ilike('drug_name', `%${drugName}%`);

      if (error) throw error;
      setSafetyData(data || []);
      return data?.[0] || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch safety data');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    safetyData,
    loading,
    error,
    fetchSafetyData
  };
};

// Hook for therapeutic classes
export const useTherapeuticClasses = () => {
  const [therapeuticClasses, setTherapeuticClasses] = useState<TherapeuticClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTherapeuticClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('therapeutic_classes')
        .select('*')
        .order('therapeutic_class');

      if (error) throw error;
      setTherapeuticClasses(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch therapeutic classes');
    } finally {
      setLoading(false);
    }
  };

  const findDrugClass = (drugName: string): TherapeuticClass | null => {
    return therapeuticClasses.find(tc => 
      tc.drug_name.toLowerCase() === drugName.toLowerCase()
    ) || null;
  };

  return {
    therapeuticClasses,
    loading,
    error,
    fetchTherapeuticClasses,
    findDrugClass
  };
};

// Hook for prior authorizations
export const usePriorAuthorizations = () => {
  const [priorAuths, setPriorAuths] = useState<PriorAuthorization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPriorAuthorizations = async (hospitalId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prior_authorizations')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPriorAuths(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prior authorizations');
    } finally {
      setLoading(false);
    }
  };

  const submitPriorAuth = async (authData: Omit<PriorAuthorization, 'id' | 'created_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prior_authorizations')
        .insert({
          ...authData,
          request_status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      setPriorAuths(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit prior authorization');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    priorAuths,
    loading,
    error,
    fetchPriorAuthorizations,
    submitPriorAuth
  };
};

// Hook for medication counseling
export const useMedicationCounseling = () => {
  const [counselingRecords, setCounselingRecords] = useState<MedicationCounseling[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCounselingRecords = async (patientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medication_counseling')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCounselingRecords(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch counseling records');
    } finally {
      setLoading(false);
    }
  };

  const addCounselingRecord = async (counselingData: Omit<MedicationCounseling, 'id' | 'created_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medication_counseling')
        .insert(counselingData)
        .select()
        .single();

      if (error) throw error;
      
      setCounselingRecords(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add counseling record');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    counselingRecords,
    loading,
    error,
    fetchCounselingRecords,
    addCounselingRecord
  };
};

// Hook for comprehensive drug safety checking
export const useDrugSafetyCheck = () => {
  const [safetyAlerts, setSafetyAlerts] = useState<DrugSafetyAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const { checkInteractions } = useDrugInteractions();
  const { fetchDoseAdjustments } = useDoseAdjustments();
  const { fetchSafetyData } = usePregnancyLactationSafety();
  const { findDrugClass } = useTherapeuticClasses();

  const performSafetyCheck = async (
    newMedication: string,
    currentMedications: string[],
    patientData: {
      age_years?: number;
      weight_kg?: number;
      is_pregnant?: boolean;
      is_breastfeeding?: boolean;
      allergies?: string[];
      creatinine_clearance?: number;
    }
  ) => {
    setLoading(true);
    const alerts: DrugSafetyAlert[] = [];

    try {
      // Check drug interactions
      const allMedications = [...currentMedications, newMedication];
      const interactions = await checkInteractions(allMedications);
      
      interactions.forEach(interaction => {
        alerts.push({
          type: 'interaction',
          severity: interaction.severity_level >= 4 ? 'critical' : 
                   interaction.severity_level >= 3 ? 'high' : 'moderate',
          title: `Drug Interaction: ${interaction.drug1_name} + ${interaction.drug2_name}`,
          message: interaction.clinical_effect,
          recommendation: interaction.management_strategy,
          acknowledged: false
        });
      });

      // Check pregnancy/lactation safety
      if (patientData.is_pregnant || patientData.is_breastfeeding) {
        const safetyData = await fetchSafetyData(newMedication);
        if (safetyData) {
          if (patientData.is_pregnant && ['D', 'X'].includes(safetyData.pregnancy_category)) {
            alerts.push({
              type: 'pregnancy',
              severity: safetyData.pregnancy_category === 'X' ? 'critical' : 'high',
              title: `Pregnancy Risk Category ${safetyData.pregnancy_category}`,
              message: `This medication may cause harm to the developing fetus`,
              recommendation: `Consider alternatives: ${safetyData.alternative_drugs.join(', ')}`,
              acknowledged: false
            });
          }
          
          if (patientData.is_breastfeeding && safetyData.lactation_risk === 'contraindicated') {
            alerts.push({
              type: 'pregnancy',
              severity: 'high',
              title: 'Contraindicated in Breastfeeding',
              message: safetyData.lactation_considerations,
              recommendation: `Consider alternatives: ${safetyData.alternative_drugs.join(', ')}`,
              acknowledged: false
            });
          }
        }
      }

      // Check dose adjustments
      const doseAdjustments = await fetchDoseAdjustments(newMedication);
      doseAdjustments.forEach(adjustment => {
        if (adjustment.adjustment_type === 'renal' && patientData.creatinine_clearance) {
          if (patientData.creatinine_clearance < 30) {
            alerts.push({
              type: 'dose_adjustment',
              severity: 'high',
              title: 'Renal Dose Adjustment Required',
              message: `Creatinine clearance ${patientData.creatinine_clearance} mL/min requires dose modification`,
              recommendation: 'Reduce dose according to renal function',
              acknowledged: false
            });
          }
        }
      });

      // Check allergies
      if (patientData.allergies) {
        patientData.allergies.forEach(allergy => {
          if (newMedication.toLowerCase().includes(allergy.toLowerCase())) {
            alerts.push({
              type: 'allergy',
              severity: 'critical',
              title: 'Drug Allergy Alert',
              message: `Patient has documented allergy to ${allergy}`,
              recommendation: 'Do not administer. Select alternative medication.',
              acknowledged: false
            });
          }
        });
      }

      setSafetyAlerts(alerts);
      return alerts;
    } catch (error) {
      console.error('Safety check failed:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = (alertIndex: number, reason?: string) => {
    setSafetyAlerts(prev => prev.map((alert, index) => 
      index === alertIndex 
        ? { ...alert, acknowledged: true, override_reason: reason }
        : alert
    ));
  };

  return {
    safetyAlerts,
    loading,
    performSafetyCheck,
    acknowledgeAlert
  };
};