// mobile-app/app/src/hooks/usePatientAppointments.ts
// Patient-facing appointments hook for the Expo mobile app.
// Mirrors web useAppointments.ts but for patient role only — no TanStack Query,
// no RBAC checks, RLS handles hospital scoping server-side.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface PatientAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  appointment_type: string;
  notes: string | null;
  doctor: {
    first_name: string;
    last_name: string;
  } | null;
  department: string | null;
}

export function usePatientAppointments(patientId: string | null) {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!patientId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          appointment_type,
          notes,
          department,
          profiles!appointments_doctor_id_fkey ( first_name, last_name )
        `)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: true })
        .limit(50);

      if (fetchError) throw fetchError;

      setAppointments(
        (data ?? []).map(a => ({
          id: a.id,
          appointment_date: a.appointment_date,
          appointment_time: a.appointment_time,
          status: a.status,
          appointment_type: a.appointment_type ?? 'General',
          notes: a.notes ?? null,
          department: (a as { department?: string }).department ?? null,
          doctor: (a as { profiles?: { first_name: string; last_name: string } }).profiles ?? null,
        }))
      );
    } catch (err) {
      setError('Failed to load appointments. Please try again.');
      console.error('[usePatientAppointments]', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetch();

    // Realtime subscription for appointment status changes
    if (!patientId) return;

    const subscription = supabase
      .channel(`appointments:patient:${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${patientId}`,
        },
        () => { fetch(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [patientId, fetch]);

  const upcomingAppointments = appointments.filter(
    a => a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'no_show'
      && new Date(a.appointment_date) >= new Date()
  );

  const pastAppointments = appointments.filter(
    a => a.status === 'completed' || new Date(a.appointment_date) < new Date()
  );

  return { appointments, upcomingAppointments, pastAppointments, loading, error, refetch: fetch };
}
