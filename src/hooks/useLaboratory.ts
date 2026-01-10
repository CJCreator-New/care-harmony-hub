import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  LOINCCode, 
  LabResult, 
  EnhancedLabOrder,
  CriticalValueNotification,
  LabInterpretationRule,
  LabTrend,
  LabQCResult
} from '@/types/laboratory';

// Hook for LOINC code management
export const useLOINCCodes = () => {
  const [loincCodes, setLoincCodes] = useState<LOINCCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchLOINCCodes = async (searchTerm: string, labClass?: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('loinc_codes')
        .select('*')
        .or(`component.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);

      if (labClass) {
        query = query.eq('class', labClass);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      
      setLoincCodes(data || []);
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search LOINC codes');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getLOINCByCode = async (code: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loinc_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch LOINC code');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loincCodes,
    loading,
    error,
    searchLOINCCodes,
    getLOINCByCode
  };
};

// Hook for lab results management
export const useLabResults = (patientId?: string, loincCode?: string) => {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLabResults = async () => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('lab_results')
        .select(`
          *,
          lab_orders!inner(patient_id)
        `)
        .eq('lab_orders.patient_id', patientId)
        .order('performed_at', { ascending: false });

      if (loincCode) {
        query = query.eq('loinc_code', loincCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setResults(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lab results');
    } finally {
      setLoading(false);
    }
  };

  const addLabResult = async (result: Omit<LabResult, 'id' | 'created_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_results')
        .insert(result)
        .select()
        .single();

      if (error) throw error;
      
      setResults(prev => [data, ...prev]);
      
      // Check for critical values
      if (data.critical_flag) {
        await createCriticalValueNotification(data);
      }
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add lab result');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createCriticalValueNotification = async (result: LabResult) => {
    try {
      const { error } = await supabase
        .from('critical_value_notifications')
        .insert({
          lab_result_id: result.id,
          patient_id: patientId,
          loinc_code: result.loinc_code,
          critical_value: `${result.result_value} ${result.result_unit}`,
          notification_level: 3 // Critical level
        });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to create critical value notification:', err);
    }
  };

  useEffect(() => {
    fetchLabResults();
  }, [patientId, loincCode]);

  return {
    results,
    loading,
    error,
    addLabResult,
    refetch: fetchLabResults
  };
};

// Hook for critical value notifications
export const useCriticalValueNotifications = (hospitalId?: string) => {
  const [notifications, setNotifications] = useState<CriticalValueNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('critical_value_notifications')
        .select('*')
        .eq('acknowledged_at', null)
        .order('notified_at', { ascending: false });

      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setNotifications(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeNotification = async (notificationId: string, notes?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('critical_value_notifications')
        .update({
          acknowledged_at: new Date().toISOString(),
          resolution_notes: notes
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge notification');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const escalateNotification = async (notificationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('critical_value_notifications')
        .update({
          escalation_level: supabase.rpc('increment_escalation', { notification_id: notificationId }),
          escalated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? data : n
      ));
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to escalate notification');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyReadBack = async (notificationId: string, readBackText: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('critical_value_notifications')
        .update({
          read_back_verified: true,
          resolution_notes: `Read-back verified: "${readBackText}"`
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? data : n
      ));
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify read-back');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for new critical values
    const subscription = supabase
      .channel('critical_notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'critical_value_notifications' },
        (payload) => {
          setNotifications(prev => [payload.new as CriticalValueNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [hospitalId]);

  return {
    notifications,
    loading,
    error,
    acknowledgeNotification,
    escalateNotification,
    verifyReadBack,
    refetch: fetchNotifications
  };
};

// Hook for lab trends analysis
export const useLabTrends = (patientId: string, loincCode?: string) => {
  const [trends, setTrends] = useState<LabTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('lab_trends')
        .select('*')
        .eq('patient_id', patientId)
        .order('calculated_at', { ascending: false });

      if (loincCode) {
        query = query.eq('loinc_code', loincCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setTrends(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trends');
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = async (
    loincCode: string, 
    period: '24h' | '7d' | '30d' | '90d',
    results: LabResult[]
  ) => {
    setLoading(true);
    try {
      // Calculate trend data (simplified implementation)
      const trendData = {
        values: results.map(r => ({
          date: r.performed_at,
          value: r.result_numeric || 0,
          unit: r.result_unit || ''
        })),
        slope: 0, // Would calculate actual slope
        correlation: 0.8,
        variance: 0
      };

      const trend: Omit<LabTrend, 'id' | 'created_at'> = {
        patient_id: patientId,
        loinc_code: loincCode,
        trend_period: period,
        trend_direction: 'stable', // Would calculate actual direction
        trend_significance: 'minimal',
        calculated_at: new Date().toISOString(),
        trend_data: trendData,
        hospital_id: 'current'
      };

      const { data, error } = await supabase
        .from('lab_trends')
        .insert(trend)
        .select()
        .single();

      if (error) throw error;
      
      setTrends(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate trend');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchTrends();
    }
  }, [patientId, loincCode]);

  return {
    trends,
    loading,
    error,
    calculateTrend,
    refetch: fetchTrends
  };
};

// Hook for enhanced lab orders with LOINC integration
export const useEnhancedLabOrders = (patientId?: string) => {
  const [orders, setOrders] = useState<EnhancedLabOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLabOrders = async () => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('lab_orders')
        .select(`
          *,
          loinc_codes(*)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOrders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lab orders');
    } finally {
      setLoading(false);
    }
  };

  const createLabOrder = async (order: Omit<EnhancedLabOrder, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_orders')
        .insert(order)
        .select()
        .single();

      if (error) throw error;
      
      setOrders(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lab order');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_orders')
        .update({ 
          status,
          notes: notes || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      
      setOrders(prev => prev.map(order => 
        order.id === orderId ? data : order
      ));
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabOrders();
  }, [patientId]);

  return {
    orders,
    loading,
    error,
    createLabOrder,
    updateOrderStatus,
    refetch: fetchLabOrders
  };
};

// Hook for lab interpretation rules
export const useLabInterpretation = () => {
  const [rules, setRules] = useState<LabInterpretationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInterpretationRules = async (loincCode?: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('lab_interpretation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (loincCode) {
        query = query.eq('loinc_code', loincCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setRules(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch interpretation rules');
    } finally {
      setLoading(false);
    }
  };

  const interpretResult = async (result: LabResult) => {
    const applicableRules = rules.filter(rule => rule.loinc_code === result.loinc_code);
    const interpretations: string[] = [];

    applicableRules.forEach(rule => {
      if (rule.condition_type === 'range' && result.result_numeric !== null) {
        const criteria = rule.condition_criteria;
        const value = result.result_numeric;
        
        if ((criteria.low && value < criteria.low) || 
            (criteria.high && value > criteria.high)) {
          interpretations.push(rule.interpretation_text);
        }
      }
    });

    return interpretations;
  };

  return {
    rules,
    loading,
    error,
    fetchInterpretationRules,
    interpretResult
  };
};