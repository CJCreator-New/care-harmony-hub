import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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

  const createSession = useMutation({
    mutationFn: async ({ appointmentId, doctorId, patientId }: {
      appointmentId: string;
      doctorId: string;
      patientId: string;
    }) => {
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