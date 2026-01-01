import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DoctorAvailability {
  id: string;
  hospital_id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_telemedicine: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  doctor?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface TimeSlot {
  id: string;
  hospital_id: string;
  doctor_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  is_telemedicine: boolean;
  appointment_id: string | null;
  created_at: string;
  doctor?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getDayName(dayIndex: number): string {
  return DAYS_OF_WEEK[dayIndex] || '';
}

export function useDoctorAvailability(doctorId?: string) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['doctor-availability', hospital?.id, doctorId],
    queryFn: async () => {
      if (!hospital?.id) return [];
      
      let query = supabase
        .from('doctor_availability')
        .select(`
          *,
          doctor:profiles!doctor_id(id, first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .eq('is_active', true)
        .order('day_of_week');

      if (doctorId) {
        query = query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DoctorAvailability[];
    },
    enabled: !!hospital?.id,
  });
}

export function useCreateAvailability() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async (availability: Partial<DoctorAvailability>) => {
      if (!hospital?.id || !profile?.id) throw new Error('No hospital or profile');
      
      const { data, error } = await supabase
        .from('doctor_availability')
        .insert([{
          day_of_week: availability.day_of_week || 0,
          start_time: availability.start_time || '09:00',
          end_time: availability.end_time || '17:00',
          slot_duration_minutes: availability.slot_duration_minutes || 30,
          is_telemedicine: availability.is_telemedicine || false,
          hospital_id: hospital.id,
          doctor_id: availability.doctor_id || profile.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-availability'] });
      toast.success('Availability added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add availability: ' + error.message);
    },
  });
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('doctor_availability')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-availability'] });
      toast.success('Availability removed');
    },
    onError: (error) => {
      toast.error('Failed to remove availability: ' + error.message);
    },
  });
}

export function useTimeSlots(date?: string, doctorId?: string) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['time-slots', hospital?.id, date, doctorId],
    queryFn: async () => {
      if (!hospital?.id) return [];
      
      let query = supabase
        .from('time_slots')
        .select(`
          *,
          doctor:profiles!doctor_id(id, first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .order('start_time');

      if (date) {
        query = query.eq('slot_date', date);
      }

      if (doctorId) {
        query = query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TimeSlot[];
    },
    enabled: !!hospital?.id,
  });
}

export function useGenerateTimeSlots() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  return useMutation({
    mutationFn: async ({ doctorId, date }: { doctorId: string; date: string }) => {
      if (!hospital?.id) throw new Error('No hospital');

      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay();

      // Get doctor's availability for this day
      const { data: availability, error: availError } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (availError) throw availError;
      if (!availability || availability.length === 0) {
        throw new Error('No availability set for this day');
      }

      // Delete existing slots for this date
      await supabase
        .from('time_slots')
        .delete()
        .eq('hospital_id', hospital.id)
        .eq('doctor_id', doctorId)
        .eq('slot_date', date)
        .eq('is_booked', false);

      // Generate new slots
      const slots: Array<{
        hospital_id: string;
        doctor_id: string;
        slot_date: string;
        start_time: string;
        end_time: string;
        is_telemedicine: boolean;
      }> = [];

      for (const avail of availability) {
        const slotDuration = avail.slot_duration_minutes || 30;
        const [startHour, startMin] = avail.start_time.split(':').map(Number);
        const [endHour, endMin] = avail.end_time.split(':').map(Number);

        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        while (currentMinutes + slotDuration <= endMinutes) {
          const slotStartHour = Math.floor(currentMinutes / 60);
          const slotStartMin = currentMinutes % 60;
          const slotEndMinutes = currentMinutes + slotDuration;
          const slotEndHour = Math.floor(slotEndMinutes / 60);
          const slotEndMin = slotEndMinutes % 60;

          slots.push({
            hospital_id: hospital.id,
            doctor_id: doctorId,
            slot_date: date,
            start_time: `${String(slotStartHour).padStart(2, '0')}:${String(slotStartMin).padStart(2, '0')}:00`,
            end_time: `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}:00`,
            is_telemedicine: avail.is_telemedicine || false,
          });

          currentMinutes += slotDuration;
        }
      }

      if (slots.length === 0) {
        throw new Error('No slots could be generated');
      }

      const { error: insertError } = await supabase
        .from('time_slots')
        .insert(slots);

      if (insertError) throw insertError;

      return slots.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      toast.success(`Generated ${count} time slots`);
    },
    onError: (error) => {
      toast.error('Failed to generate slots: ' + error.message);
    },
  });
}
