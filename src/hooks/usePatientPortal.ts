import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AfterVisitSummary,
  AVSTemplate,
  PatientEducationMaterial,
  DigitalCheckinSession,
  PreVisitQuestionnaire,
  QuestionnaireResponse,
  SecureMessage,
  MessageThread,
  ConsentForm,
  PatientConsent,
  SymptomCheckerSession
} from '@/types/patient-portal';

// Hook for patient profile management
export const usePatientProfile = (patientId?: string) => {
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
    const { data: { user } } = await supabase.auth.getUser();
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
    let patientRecordId = patientId;

    // If no patientId provided, get patient ID from authenticated user
    if (!patientRecordId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No authenticated user found');
        return;
      }

      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (patientError) {
        setError('Failed to find patient record');
        return;
      }

      patientRecordId = patient.id;
    }

    if (!patientRecordId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientRecordId)
        .order('appointment_date', { ascending: false });

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

// Hook for patient prescriptions
export const usePatientPrescriptions = (patientId?: string) => {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    let patientRecordId = patientId;

    // If no patientId provided, get patient ID from authenticated user
    if (!patientRecordId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No authenticated user found');
        return;
      }

      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (patientError) {
        setError('Failed to find patient record');
        return;
      }

      patientRecordId = patient.id;
    }

    if (!patientRecordId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patientRecordId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
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
    if (!patientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_vitals')
        .select('*')
        .eq('patient_id', patientId)
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
    let patientRecordId = patientId;

    // If no patientId provided, get patient ID from authenticated user
    if (!patientRecordId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No authenticated user found');
        return;
      }

      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (patientError) {
        setError('Failed to find patient record');
        return;
      }

      patientRecordId = patient.id;
    }

    if (!patientRecordId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_results')
        .select('*')
        .eq('patient_id', patientRecordId)
        .order('result_date', { ascending: false });

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

// Hook for After Visit Summary management
export const useAfterVisitSummary = () => {
  const [summaries, setSummaries] = useState<AfterVisitSummary[]>([]);
  const [templates, setTemplates] = useState<AVSTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async (patientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('after_visit_summaries')
        .select('*')
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setSummaries(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch summaries');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('avs_templates')
        .select('*')
        .eq('is_active', true)
        .order('template_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (summaryData: Omit<AfterVisitSummary, 'id' | 'created_at' | 'generated_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('after_visit_summaries')
        .insert({
          ...summaryData,
          generated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      setSummaries(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deliverSummary = async (summaryId: string, deliveryMethod: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('after_visit_summaries')
        .update({
          delivered_at: new Date().toISOString(),
          delivery_method: deliveryMethod
        })
        .eq('id', summaryId)
        .select()
        .single();

      if (error) throw error;
      
      setSummaries(prev => prev.map(summary => 
        summary.id === summaryId ? data : summary
      ));
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deliver summary');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    summaries,
    templates,
    loading,
    error,
    fetchSummaries,
    fetchTemplates,
    generateSummary,
    deliverSummary
  };
};

// Hook for digital check-in workflow
export const useDigitalCheckin = () => {
  const [session, setSession] = useState<DigitalCheckinSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckinSession = async (patientId: string, appointmentId: string) => {
    setLoading(true);
    try {
      const sessionToken = generateSessionToken();
      const { data, error } = await supabase
        .from('digital_checkin_sessions')
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId,
          session_token: sessionToken,
          checkin_status: 'started'
        })
        .select()
        .single();

      if (error) throw error;
      
      setSession(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start check-in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCheckinSession = async (sessionToken: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_checkin_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();

      if (error) throw error;
      
      setSession(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get session');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCheckinStep = async (sessionId: string, stepData: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_checkin_sessions')
        .update({
          checkin_data: stepData,
          checkin_status: 'in_progress'
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      
      setSession(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update step');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const completeCheckin = async (sessionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_checkin_sessions')
        .update({
          checkin_status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      
      setSession(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete check-in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateSessionToken = (): string => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  return {
    session,
    loading,
    error,
    startCheckinSession,
    getCheckinSession,
    updateCheckinStep,
    completeCheckin
  };
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
      data?.forEach(message => {
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
            status: 'active'
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
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      
      setMessages(prev => [data, ...prev]);
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
          read_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
    }
  };

  useEffect(() => {
    fetchMessages();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('secure_messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'secure_messages' },
        (payload) => {
          if (payload.new.patient_id === patientId) {
            setMessages(prev => [payload.new as SecureMessage, ...prev]);
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
    refetch: fetchMessages
  };
};

// Hook for pre-visit questionnaires
export const usePreVisitQuestionnaires = () => {
  const [questionnaires, setQuestionnaires] = useState<PreVisitQuestionnaire[]>([]);
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestionnaires = async (specialty?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('pre_visit_questionnaires')
        .select('*')
        .eq('is_active', true);

      if (specialty) {
        query = query.eq('specialty', specialty);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setQuestionnaires(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch questionnaires');
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async (responseData: Omit<QuestionnaireResponse, 'id' | 'created_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questionnaire_responses')
        .insert(responseData)
        .select()
        .single();

      if (error) throw error;
      
      setResponses(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    questionnaires,
    responses,
    loading,
    error,
    fetchQuestionnaires,
    submitResponse
  };
};

// Hook for patient education materials
export const usePatientEducation = () => {
  const [materials, setMaterials] = useState<PatientEducationMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = async (category?: string, tags?: string[]) => {
    setLoading(true);
    try {
      let query = supabase
        .from('patient_education_materials')
        .select('*')
        .eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setMaterials(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const searchMaterials = async (searchTerm: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_education_materials')
        .select('*')
        .eq('is_active', true)
        .or(`title.ilike.%${searchTerm}%,content_text.ilike.%${searchTerm}%`);

      if (error) throw error;
      
      setMaterials(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search materials');
    } finally {
      setLoading(false);
    }
  };

  return {
    materials,
    loading,
    error,
    fetchMaterials,
    searchMaterials
  };
};

// Hook for digital consent management
export const useDigitalConsent = () => {
  const [consentForms, setConsentForms] = useState<ConsentForm[]>([]);
  const [patientConsents, setPatientConsents] = useState<PatientConsent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConsentForms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consent_forms')
        .select('*')
        .eq('is_active', true)
        .order('form_name');

      if (error) throw error;
      setConsentForms(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch consent forms');
    } finally {
      setLoading(false);
    }
  };

  const submitConsent = async (consentData: Omit<PatientConsent, 'id' | 'created_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_consents')
        .insert(consentData)
        .select()
        .single();

      if (error) throw error;
      
      setPatientConsents(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit consent');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    consentForms,
    patientConsents,
    loading,
    error,
    fetchConsentForms,
    submitConsent
  };
};