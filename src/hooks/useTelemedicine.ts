import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TelemedicineSession {
  id: string;
  hospital_id: string;
  appointment_id: string | null;
  patient_id: string;
  doctor_id: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  room_id: string | null;
  meeting_url: string | null;
  notes: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    mrn: string;
  };
  doctor?: {
    first_name: string;
    last_name: string;
  };
}

export const useTelemedicine = () => {
  const { profile } = useAuth();
  const hospitalId = profile?.hospital_id;
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['telemedicine-sessions', hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];
      
      const { data, error } = await supabase
        .from('telemedicine_sessions')
        .select(`
          *,
          patient:patients(first_name, last_name, mrn),
          doctor:profiles!telemedicine_sessions_doctor_id_fkey(first_name, last_name)
        `)
        .eq('hospital_id', hospitalId)
        .order('scheduled_start', { ascending: true });

      if (error) throw error;
      return data as TelemedicineSession[];
    },
    enabled: !!hospitalId,
  });

  const createSession = useMutation({
    mutationFn: async (session: {
      patient_id: string;
      doctor_id: string;
      scheduled_start: string;
      scheduled_end: string;
      appointment_id?: string;
      notes?: string;
    }) => {
      if (!hospitalId) throw new Error('No hospital ID');
      
      const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('telemedicine_sessions')
        .insert({
          ...session,
          hospital_id: hospitalId,
          room_id: roomId,
          meeting_url: `/telemedicine/room/${roomId}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemedicine-sessions'] });
      toast.success('Telemedicine session scheduled');
    },
    onError: (error) => {
      toast.error('Failed to schedule session: ' + error.message);
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TelemedicineSession> & { id: string }) => {
      const { data, error } = await supabase
        .from('telemedicine_sessions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemedicine-sessions'] });
      toast.success('Session updated');
    },
    onError: (error) => {
      toast.error('Failed to update session: ' + error.message);
    },
  });

  const startSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('telemedicine_sessions')
        .update({
          status: 'in_progress',
          actual_start: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemedicine-sessions'] });
      toast.success('Session started');
    },
  });

  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('telemedicine_sessions')
        .update({
          status: 'completed',
          actual_end: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemedicine-sessions'] });
      toast.success('Session completed');
    },
  });

  const todaySessions = sessions?.filter(s => {
    const today = new Date().toISOString().split('T')[0];
    return s.scheduled_start.startsWith(today);
  }) || [];

  const upcomingSessions = sessions?.filter(s => 
    s.status === 'scheduled' && new Date(s.scheduled_start) > new Date()
  ) || [];

  const activeSessions = sessions?.filter(s => 
    s.status === 'in_progress' || s.status === 'waiting'
  ) || [];

  return {
    sessions,
    todaySessions,
    upcomingSessions,
    activeSessions,
    isLoading,
    createSession,
    updateSession,
    startSession,
    endSession,
  };
};
