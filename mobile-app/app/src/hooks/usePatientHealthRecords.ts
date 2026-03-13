// mobile-app/app/src/hooks/usePatientHealthRecords.ts
// Patient-facing clinical summary hook for the Expo mobile app.
// Surfaces: consultations, prescriptions, lab results.
// No TanStack Query — uses useState/useEffect pattern.
// Patient role only; RLS enforces isolation server-side.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface PatientConsultation {
  id: string;
  chief_complaint: string;
  status: string;
  diagnosis: string | null;
  created_at: string;
  doctor: { first_name: string; last_name: string } | null;
}

export interface PatientPrescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  status: 'active' | 'completed' | 'discontinued' | 'pending';
  start_date: string;
  end_date: string | null;
  prescribed_by: string | null;
}

export interface PatientLabResult {
  id: string;
  test_name: string;
  status: string;
  results: Record<string, unknown> | null;
  is_critical: boolean;
  ordered_at: string;
  completed_at: string | null;
}

export interface PatientHealthRecords {
  consultations: PatientConsultation[];
  prescriptions: PatientPrescription[];
  labResults: PatientLabResult[];
}

export function usePatientHealthRecords(patientId: string | null) {
  const [records, setRecords] = useState<PatientHealthRecords>({
    consultations: [],
    prescriptions: [],
    labResults:    [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch three resources in parallel with graceful failure handling
      const results = await Promise.allSettled([
        supabase
          .from('consultations')
          .select(`
            id, chief_complaint, status, diagnosis, created_at,
            profiles!consultations_doctor_id_fkey ( first_name, last_name )
          `)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(20),

        supabase
          .from('prescriptions')
          .select('id, medication_name, dosage, frequency, route, status, start_date, end_date, prescribed_by')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(30),

        supabase
          .from('lab_orders')
          .select('id, test_name, status, results, is_critical, ordered_at, completed_at')
          .eq('patient_id', patientId)
          .order('ordered_at', { ascending: false })
          .limit(20),
      ]);

      // Extract results with fallback to empty arrays on failure
      const consultResp = results[0].status === 'fulfilled' ? results[0].value : { data: [], error: null };
      const rxResp = results[1].status === 'fulfilled' ? results[1].value : { data: [], error: null };
      const labResp = results[2].status === 'fulfilled' ? results[2].value : { data: [], error: null };

      if (consultResp.error) {
        console.warn('[usePatientHealthRecords] Consultation fetch failed:', consultResp.error);
      }
      if (rxResp.error) {
        console.warn('[usePatientHealthRecords] Prescription fetch failed:', rxResp.error);
      }
      if (labResp.error) {
        console.warn('[usePatientHealthRecords] Lab results fetch failed:', labResp.error);
      }

      setRecords({
        consultations: (consultResp.data ?? []).map(c => ({
          id: c.id,
          chief_complaint: c.chief_complaint ?? '',
          status: c.status ?? '',
          diagnosis: (c as { diagnosis?: string }).diagnosis ?? null,
          created_at: c.created_at,
          doctor: (c as { profiles?: { first_name: string; last_name: string } }).profiles ?? null,
        })),
        prescriptions: (rxResp.data ?? []) as PatientPrescription[],
        labResults:    (labResp.data ?? []) as PatientLabResult[],
      });
    } catch (err) {
      setError('Failed to load health records.');
      console.error('[usePatientHealthRecords]', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const activeRx = records.prescriptions.filter(p => p.status === 'active');
  const criticalLabs = records.labResults.filter(l => l.is_critical);

  return { records, activeRx, criticalLabs, loading, error, refetch: fetch };
}
