import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  HospitalResource,
  ResourceBooking,
  AppointmentWaitlist,
  RecurringAppointment,
  InsuranceVerification,
  MultiResourceBookingRequest,
  SchedulingSlot
} from '@/types/scheduling';

// Multi-Resource Scheduling Hooks
export const useResourceBookings = (date?: string) => {
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [resources, setResources] = useState<HospitalResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('resource_bookings')
        .select('*')
        .order('start_time', { ascending: true });

      if (date) {
        query = query
          .gte('start_time', `${date}T00:00:00`)
          .lt('start_time', `${date}T23:59:59`);
      }

      const { data: bookingData, error: bookingError } = await query;
      if (bookingError) throw bookingError;

      const { data: resourceData, error: resourceError } = await supabase
        .from('hospital_resources')
        .select('*')
        .eq('is_active', true);

      if (resourceError) throw resourceError;

      setBookings(bookingData || []);
      setResources(resourceData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async (booking: Partial<ResourceBooking>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resource_bookings')
        .insert([booking])
        .select()
        .single();

      if (error) throw error;
      setBookings(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async (
    resourceIds: string[], 
    startTime: string, 
    endTime: string
  ): Promise<SchedulingSlot[]> => {
    try {
      const { data, error } = await supabase
        .from('resource_bookings')
        .select('*')
        .in('resource_id', resourceIds)
        .or(`start_time.lte.${endTime},end_time.gte.${startTime}`)
        .eq('status', 'confirmed');

      if (error) throw error;

      // Generate availability slots based on conflicts
      const slots: SchedulingSlot[] = [];
      // Implementation would generate time slots and check conflicts
      return slots;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check availability');
      return [];
    }
  };

  useEffect(() => {
    loadBookings();
  }, [date]);

  return {
    bookings,
    resources,
    loading,
    error,
    createBooking,
    checkAvailability,
    refetch: loadBookings
  };
};

// Waitlist Management Hooks
export const useWaitlistManagement = () => {
  const [waitlist, setWaitlist] = useState<AppointmentWaitlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWaitlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('appointment_waitlist')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setWaitlist(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  };

  const addToWaitlist = async (entry: Partial<AppointmentWaitlist>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointment_waitlist')
        .insert([entry])
        .select()
        .single();

      if (error) throw error;
      setWaitlist(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to waitlist');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateWaitlistEntry = async (id: string, updates: Partial<AppointmentWaitlist>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointment_waitlist')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setWaitlist(prev => prev.map(entry => entry.id === id ? data : entry));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update waitlist entry');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const notifyPatient = async (id: string) => {
    return updateWaitlistEntry(id, {
      status: 'notified',
      notified_at: new Date().toISOString()
    });
  };

  const removeFromWaitlist = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointment_waitlist')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setWaitlist(prev => prev.filter(entry => entry.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from waitlist');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaitlist();
  }, []);

  return {
    waitlist,
    loading,
    error,
    addToWaitlist,
    updateWaitlistEntry,
    notifyPatient,
    removeFromWaitlist,
    refetch: loadWaitlist
  };
};

// Recurring Appointments Hooks
export const useRecurringAppointments = (patientId?: string) => {
  const [recurringAppointments, setRecurringAppointments] = useState<RecurringAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecurringAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('recurring_appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecurringAppointments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recurring appointments');
    } finally {
      setLoading(false);
    }
  };

  const createRecurringAppointment = async (recurring: Partial<RecurringAppointment>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recurring_appointments')
        .insert([recurring])
        .select()
        .single();

      if (error) throw error;
      setRecurringAppointments(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recurring appointment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRecurringAppointment = async (id: string, updates: Partial<RecurringAppointment>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recurring_appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setRecurringAppointments(prev => prev.map(appt => appt.id === id ? data : appt));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recurring appointment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecurringAppointments();
  }, [patientId]);

  return {
    recurringAppointments,
    loading,
    error,
    createRecurringAppointment,
    updateRecurringAppointment,
    refetch: loadRecurringAppointments
  };
};

// Insurance Verification Hooks
export const useInsuranceVerification = (patientId: string) => {
  const [verification, setVerification] = useState<InsuranceVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('insurance_verifications')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setVerification(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification');
    } finally {
      setLoading(false);
    }
  };

  const createVerification = async (verification: Partial<InsuranceVerification>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insurance_verifications')
        .insert([verification])
        .select()
        .single();

      if (error) throw error;
      setVerification(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create verification');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateVerification = async (id: string, updates: Partial<InsuranceVerification>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insurance_verifications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setVerification(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update verification');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyInsurance = async (insuranceData: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  }) => {
    setLoading(true);
    try {
      // Simulate insurance verification API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock verification response
      const mockResponse = {
        verification_status: Math.random() > 0.2 ? 'verified' : 'failed',
        verified_at: new Date().toISOString(),
        copay_amount: Math.random() > 0.3 ? 25 : 0,
        deductible_amount: Math.random() > 0.5 ? 1000 : 500,
        coverage_percentage: Math.random() > 0.3 ? 80 : 70,
        requires_authorization: Math.random() > 0.7
      };

      return mockResponse;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify insurance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadVerification();
    }
  }, [patientId]);

  return {
    verification,
    loading,
    error,
    createVerification,
    updateVerification,
    verifyInsurance,
    refetch: loadVerification
  };
};