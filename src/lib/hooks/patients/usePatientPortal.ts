import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { resolvePatientIdByAuthUserId } from '@/services/identityResolver';
import { fieldEncryption } from '@/utils/dataProtection';

import { SecureMessage, MessageThread } from '@/types/patient-portal';

const resolveEffectivePatientId = async (explicitPatientId?: string): Promise<string | null> => {
  if (explicitPatientId) return explicitPatientId;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  return resolvePatientIdByAuthUserId(session.user.id);
};

// Hook for patient profile management
export const usePatientProfile = (patientId?: string) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    // If patientId is provided, use it directly
    if (patientId) {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
      return;
    }

    // If no patientId provided, get patient profile for current authenticated user
    if (!user) {
      setError('No authenticated user found');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [patientId]);

  return { profile, loading, error, refetch: fetchProfile };
};

// Hook for patient appointments
export const usePatientAppointments = (patientId?: string) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    const patientRecordId = await resolveEffectivePatientId(patientId);

    if (!patientRecordId) {
      setError('Failed to find patient record');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(
          `
          *,
          doctor:profiles!appointments_doctor_id_fkey(id, first_name, last_name)
        `
        )
        .eq('patient_id', patientRecordId)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [patientId]);

  return { appointments, loading, error, refetch: fetchAppointments };
};

// Decrypt PHI fields on prescription items for patient display
async function decryptPrescriptionItems(prescription: any): Promise<any> {
  if (!prescription.items?.length) return prescription;
  const decryptedItems = await Promise.all(
    prescription.items.map(async (item: any) => {
      if (!item.encryption_metadata || Object.keys(item.encryption_metadata).length === 0)
        return item;
      const decrypted = { ...item };
      for (const [field, encData] of Object.entries(
        item.encryption_metadata as Record<string, any>
      )) {
        if (typeof decrypted[field] === 'string' && decrypted[field].startsWith('__ENCRYPTED__')) {
          try {
            decrypted[field] = await fieldEncryption.decryptField(encData);
          } catch {
            decrypted[field] = '[Encrypted]';
          }
        }
      }
      return decrypted;
    })
  );
  return { ...prescription, items: decryptedItems };
}

// Hook for patient prescriptions
export const usePatientPrescriptions = (patientId?: string) => {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    const patientRecordId = await resolveEffectivePatientId(patientId);

    if (!patientRecordId) {
      setError('Failed to find patient record');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(
          `
          *,
          prescriber:profiles!prescriptions_prescribed_by_fkey(id, first_name, last_name),
          items:prescription_items(*)
        `
        )
        .eq('patient_id', patientRecordId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as any[];
      const decrypted = await Promise.all(rows.map(decryptPrescriptionItems));
      setPrescriptions(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prescriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [patientId]);

  return { prescriptions, loading, error, refetch: fetchPrescriptions };
};

// Hook for patient vitals
export const usePatientVitals = (patientId?: string) => {
  const [vitals, setVitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVitals = async () => {
    const patientRecordId = await resolveEffectivePatientId(patientId);
    if (!patientRecordId) {
      setError('Failed to find patient record');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('patient_id', patientRecordId)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      setVitals(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vitals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVitals();
  }, [patientId]);

  return { vitals, loading, error, refetch: fetchVitals };
};

// Hook for patient lab results
export const usePatientLabResults = (patientId?: string) => {
  const [labResults, setLabResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLabResults = async () => {
    const patientRecordId = await resolveEffectivePatientId(patientId);

    if (!patientRecordId) {
      setError('Failed to find patient record');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_orders')
        .select(
          `
          *,
          ordered_by_profile:profiles!lab_orders_ordered_by_fkey(id, first_name, last_name)
        `
        )
        .eq('patient_id', patientRecordId)
        .order('ordered_at', { ascending: false });

      if (error) throw error;
      setLabResults(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lab results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabResults();
  }, [patientId]);

  return { labResults, loading, error, refetch: fetchLabResults };
};

// Hook for secure messaging
export const useSecureMessaging = (patientId?: string) => {
  const [messages, setMessages] = useState<SecureMessage[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    if (!patientId) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('secure_messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMessages(data || []);

      // Group messages into threads
      const threadMap = new Map<string, MessageThread>();
      data?.forEach((message) => {
        const threadId = message.thread_id || message.id;
        if (!threadMap.has(threadId)) {
          threadMap.set(threadId, {
            thread_id: threadId,
            subject: message.subject || 'No Subject',
            participants: [], // Would be populated from user data
            messages: [],
            last_message_at: message.created_at,
            unread_count: 0,
            priority: message.priority,
            status: 'active',
          });
        }

        const thread = threadMap.get(threadId)!;
        thread.messages.push(message);

        if (!message.is_read && message.sender_id !== patientId) {
          thread.unread_count++;
        }

        if (new Date(message.created_at) > new Date(thread.last_message_at)) {
          thread.last_message_at = message.created_at;
        }
      });

      setThreads(Array.from(threadMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (messageData: Omit<SecureMessage, 'id' | 'created_at' | 'is_read'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('secure_messages')
        .insert({
          ...messageData,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('secure_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, is_read: true } : msg))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
    }
  };

  useEffect(() => {
    fetchMessages();

    // Set up real-time subscription
    const subscription = supabase
      .channel('secure_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'secure_messages' },
        (payload) => {
          if (payload.new.patient_id === patientId) {
            setMessages((prev) => [payload.new as SecureMessage, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [patientId]);

  return {
    messages,
    threads,
    loading,
    error,
    sendMessage,
    markAsRead,
    refetch: fetchMessages,
  };
};

// Compatibility aggregate hook used by patient billing/check-in components.
// Provides live billing primitives from canonical invoice/payment/claim tables.
export const usePatientPortal = () => {
  const { profile } = useAuth();
  const [billingData, setBillingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = async () => {
    if (!profile?.user_id) return;
    setLoading(true);
    setError(null);

    try {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, hospital_id')
        .eq('user_id', profile.user_id)
        .single();
      if (patientError) throw patientError;

      const [invoicesRes, paymentsRes, claimsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select(
            `
            *,
            invoice:invoices!payments_invoice_id_fkey(id, patient_id)
          `
          )
          .eq('hospital_id', patient.hospital_id)
          .order('payment_date', { ascending: false }),
        supabase
          .from('insurance_claims')
          .select('*')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false }),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (claimsRes.error) throw claimsRes.error;

      const invoices = invoicesRes.data || [];
      const patientInvoiceIds = new Set(invoices.map((i: any) => i.id));
      const paymentHistory = (paymentsRes.data || []).filter((p: any) =>
        patientInvoiceIds.has(p.invoice_id)
      );
      const insuranceClaims = claimsRes.data || [];

      const totalBilled = invoices.reduce((sum: number, i: any) => sum + Number(i.total || 0), 0);
      const totalPaid = invoices.reduce(
        (sum: number, i: any) => sum + Number(i.paid_amount || 0),
        0
      );
      const outstandingBalance = Math.max(0, totalBilled - totalPaid);

      setBillingData({
        outstandingBalance,
        totalPaid,
        totalBilled,
        invoices,
        paymentHistory,
        insuranceClaims,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient portal billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [profile?.user_id]);

  return {
    billingData,
    loading,
    error,
    refetch: fetchBillingData,
  };
};
