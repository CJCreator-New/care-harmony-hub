import { supabase } from '@/integrations/supabase/client';

export interface UnifiedPatientRecord {
  id: string;
  demographics: any;
  medicalHistory: any[];
  medications: any[];
  allergies: any[];
  vitals: any[];
  labResults: any[];
  consultations: any[];
}

export const unifiedRecordService = {
  async getUnifiedRecord(patientId: string): Promise<UnifiedPatientRecord> {
    const { data, error } = await supabase
      .from('unified_patient_records')
      .select('*')
      .eq('id', patientId)
      .single();

    if (error) throw error;
    return data;
  },

  async syncRecords(patientId: string) {
    const { error } = await supabase.rpc('sync_patient_data', { patient_id: patientId });
    if (error) throw error;
  }
};
