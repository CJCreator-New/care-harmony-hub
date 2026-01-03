import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

/**
 * Hook for sending role-based workflow notifications
 * Handles notifications for patient prep, vitals, and consultation readiness
 */
export function useWorkflowNotifications() {
  const { hospital, profile } = useAuth();

  // Get staff members by role
  const getStaffByRole = useCallback(async (role: AppRole) => {
    if (!hospital?.id) return [];

    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner(id, first_name, last_name, user_id, hospital_id)
      `)
      .eq('role', role);

    if (error) {
      console.error('Error fetching staff by role:', error);
      return [];
    }

    // Filter by hospital
    return data?.filter((r: any) => r.profiles?.hospital_id === hospital.id) || [];
  }, [hospital?.id]);

  // Notify doctors when patient is ready for consultation
  const notifyPatientReady = useCallback(async (
    patientId: string,
    patientName: string,
    queueNumber?: number
  ) => {
    if (!hospital?.id || !profile?.user_id) return;

    // Get all doctors in the hospital
    const doctors = await getStaffByRole('doctor');

    if (doctors.length === 0) {
      console.log('No doctors found to notify');
      return;
    }

    const notifications = doctors.map((doc: any) => ({
      hospital_id: hospital.id,
      recipient_id: doc.user_id,
      sender_id: profile.user_id,
      type: 'alert',
      title: 'Patient Ready for Consultation',
      message: `${patientName}${queueNumber ? ` (#${queueNumber})` : ''} has completed pre-consultation prep and is ready.`,
      priority: 'high',
      category: 'clinical',
      action_url: '/consultations',
      metadata: { patientId, patientName, queueNumber },
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) {
      console.error('Error sending patient ready notifications:', error);
    }
  }, [hospital?.id, profile?.user_id, getStaffByRole]);

  // Notify nurses when patient is checked in (needs vitals)
  const notifyPatientCheckedIn = useCallback(async (
    patientId: string,
    patientName: string,
    queueNumber: number
  ) => {
    if (!hospital?.id || !profile?.user_id) return;

    // Get all nurses in the hospital
    const nurses = await getStaffByRole('nurse');

    if (nurses.length === 0) {
      console.log('No nurses found to notify');
      return;
    }

    const notifications = nurses.map((nurse: any) => ({
      hospital_id: hospital.id,
      recipient_id: nurse.user_id,
      sender_id: profile.user_id,
      type: 'task',
      title: 'New Patient Check-In',
      message: `${patientName} (#${queueNumber}) has checked in and needs vitals recorded.`,
      priority: 'normal',
      category: 'clinical',
      action_url: '/queue',
      metadata: { patientId, patientName, queueNumber },
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) {
      console.error('Error sending check-in notifications:', error);
    }
  }, [hospital?.id, profile?.user_id, getStaffByRole]);

  // Notify specific doctor when vitals are recorded
  const notifyVitalsRecorded = useCallback(async (
    doctorUserId: string,
    patientName: string,
    patientId: string
  ) => {
    if (!hospital?.id || !profile?.user_id) return;

    const { error } = await supabase.from('notifications').insert({
      hospital_id: hospital.id,
      recipient_id: doctorUserId,
      sender_id: profile.user_id,
      type: 'alert',
      title: 'Vitals Recorded',
      message: `Vitals have been recorded for ${patientName}.`,
      priority: 'normal',
      category: 'clinical',
      action_url: `/patients`,
      metadata: { patientId, patientName },
    });

    if (error) {
      console.error('Error sending vitals notification:', error);
    }
  }, [hospital?.id, profile?.user_id]);

  // Notify receptionist when consultation is complete (for billing/checkout)
  const notifyConsultationComplete = useCallback(async (
    patientId: string,
    patientName: string,
    consultationId: string
  ) => {
    if (!hospital?.id || !profile?.user_id) return;

    // Get all receptionists
    const receptionists = await getStaffByRole('receptionist');

    if (receptionists.length === 0) {
      console.log('No receptionists found to notify');
      return;
    }

    const notifications = receptionists.map((rec: any) => ({
      hospital_id: hospital.id,
      recipient_id: rec.user_id,
      sender_id: profile.user_id,
      type: 'task',
      title: 'Consultation Complete',
      message: `${patientName} has completed their consultation and is ready for checkout/billing.`,
      priority: 'normal',
      category: 'billing',
      action_url: '/billing',
      metadata: { patientId, patientName, consultationId },
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) {
      console.error('Error sending consultation complete notifications:', error);
    }
  }, [hospital?.id, profile?.user_id, getStaffByRole]);

  // Notify pharmacist when prescription is created
  const notifyPrescriptionCreated = useCallback(async (
    patientId: string,
    patientName: string,
    prescriptionId: string
  ) => {
    if (!hospital?.id || !profile?.user_id) return;

    // Get all pharmacists
    const pharmacists = await getStaffByRole('pharmacist');

    if (pharmacists.length === 0) {
      console.log('No pharmacists found to notify');
      return;
    }

    const notifications = pharmacists.map((pharm: any) => ({
      hospital_id: hospital.id,
      recipient_id: pharm.user_id,
      sender_id: profile.user_id,
      type: 'task',
      title: 'New Prescription',
      message: `New prescription for ${patientName} awaiting dispensing.`,
      priority: 'high',
      category: 'clinical',
      action_url: '/pharmacy',
      metadata: { patientId, patientName, prescriptionId },
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) {
      console.error('Error sending prescription notifications:', error);
    }
  }, [hospital?.id, profile?.user_id, getStaffByRole]);

  // Notify lab technician when lab order is created
  const notifyLabOrderCreated = useCallback(async (
    patientId: string,
    patientName: string,
    testName: string,
    labOrderId: string,
    priority: string = 'normal'
  ) => {
    if (!hospital?.id || !profile?.user_id) return;

    // Get all lab technicians
    const labTechs = await getStaffByRole('lab_technician');

    if (labTechs.length === 0) {
      console.log('No lab technicians found to notify');
      return;
    }

    const notifications = labTechs.map((tech: any) => ({
      hospital_id: hospital.id,
      recipient_id: tech.user_id,
      sender_id: profile.user_id,
      type: 'task',
      title: priority === 'urgent' || priority === 'emergency' ? '⚠️ Urgent Lab Order' : 'New Lab Order',
      message: `${testName} ordered for ${patientName}.`,
      priority: priority === 'urgent' || priority === 'emergency' ? 'urgent' : 'normal',
      category: 'clinical',
      action_url: '/laboratory',
      metadata: { patientId, patientName, testName, labOrderId },
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) {
      console.error('Error sending lab order notifications:', error);
    }
  }, [hospital?.id, profile?.user_id, getStaffByRole]);

  return {
    notifyPatientReady,
    notifyPatientCheckedIn,
    notifyVitalsRecorded,
    notifyConsultationComplete,
    notifyPrescriptionCreated,
    notifyLabOrderCreated,
  };
}
