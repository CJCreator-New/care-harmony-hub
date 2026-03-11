import { useMutation, useQuery } from '@tanstack/react-query';
import { sanitizeForLog } from '@/utils/sanitize';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudit } from '@/hooks/useAudit';

interface VideoSession {
  session_id: string;
  room_id: string;
  doctor_token?: string;
  patient_token?: string;
  join_url: string;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
}

export function useTelemedicine() {
  const { user } = useAuth();
  const { logActivity } = useAudit();

  const createSession = useMutation({
    mutationFn: async ({ appointmentId, doctorId, patientId }: {
      appointmentId: string;
      doctorId: string;
      patientId: string;
    }) => {
      // F4.1 — HIPAA §164.506: verify telemedicine consent before starting session
      const { data: consent, error: consentError } = await supabase
        .from('patient_consents')
        .select('telemedicine_consent')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (consentError || !consent?.telemedicine_consent) {
        throw new Error('Patient has not provided telemedicine consent. Please obtain consent before starting the session.');
      }

      const { data, error } = await supabase.functions.invoke('telemedicine', {
        body: {
          action: 'create_session',
          data: {
            appointment_id: appointmentId,
            doctor_id: doctorId,
            patient_id: patientId,
          }
        }
      });
      if (error) throw error;
      return data as VideoSession;
    },
    onSuccess: (data, variables) => {
      void logActivity({
        actionType: 'TELEMEDICINE_SESSION_CREATED',
        entityType: 'telemedicine_sessions',
        entityId: data.session_id,
        details: { appointment_id: variables.appointmentId, doctor_id: variables.doctorId },
        severity: 'info',
      });
    },
  });

  const joinSession = useMutation({
    mutationFn: async ({ sessionId, userType }: {
      sessionId: string;
      userType: 'doctor' | 'patient';
    }) => {
      const { data, error } = await supabase.functions.invoke('telemedicine', {
        body: {
          action: 'join_session',
          data: {
            session_id: sessionId,
            user_id: user?.id,
            user_type: userType,
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      void logActivity({
        actionType: 'TELEMEDICINE_SESSION_JOINED',
        entityType: 'telemedicine_sessions',
        entityId: variables.sessionId,
        details: { user_type: variables.userType, user_id: user?.id },
        severity: 'info',
      });
    },
  });

  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.functions.invoke('telemedicine', {
        body: {
          action: 'end_session',
          data: {
            session_id: sessionId,
            ended_by: user?.id,
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, sessionId) => {
      void logActivity({
        actionType: 'TELEMEDICINE_SESSION_ENDED',
        entityType: 'telemedicine_sessions',
        entityId: sessionId,
        details: { ended_by: user?.id },
        severity: 'info',
      });
    },
  });

  const recordConsultation = useMutation({
    mutationFn: async ({ sessionId, notes, prescriptions }: {
      sessionId: string;
      notes: any;
      prescriptions?: any[];
    }) => {
      const { data, error } = await supabase.functions.invoke('telemedicine', {
        body: {
          action: 'record_consultation',
          data: {
            session_id: sessionId,
            consultation_notes: notes,
            prescriptions,
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      void logActivity({
        actionType: 'TELEMEDICINE_CONSULTATION_RECORDED',
        entityType: 'telemedicine_sessions',
        entityId: variables.sessionId,
        details: { has_prescriptions: (variables.prescriptions?.length ?? 0) > 0 },
        severity: 'info',
      });
    },
  });

  const { data: activeSessions } = useQuery({
    queryKey: ['telemedicine-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('telemedicine_sessions')
        .select(`
          *,
          appointments(*),
          patients(*),
          users(*)
        `)
        .or(`doctor_id.eq.${user.id},patient_id.eq.${user.id}`)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    createSession: createSession.mutate,
    joinSession: joinSession.mutate,
    endSession: endSession.mutate,
    recordConsultation: recordConsultation.mutate,
    activeSessions,
    isCreating: createSession.isPending,
    isJoining: joinSession.isPending,
    isEnding: endSession.isPending,
  };
}