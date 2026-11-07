import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { CPTCode } from '@/types/soap';

export const useCPTCodes = () => {
  const [cptCodes, setCptCodes] = useState<CPTCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hospital } = useAuth();

  const loadCPTCodes = useCallback(
    async (category?: string) => {
      if (!hospital?.id) return;
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('cpt_codes')
          .select('*')
          .eq('hospital_id', hospital.id)
          .order('category', { ascending: true });

        if (category) {
          query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) throw error;
        setCptCodes(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CPT codes');
      } finally {
        setLoading(false);
      }
    },
    [hospital?.id]
  );

  const searchCPTCodes = async (searchTerm: string) => {
    if (!hospital?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('cpt_codes')
        .select('*')
        .eq('hospital_id', hospital.id)
        .or(`code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('code');

      if (error) throw error;
      setCptCodes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search CPT codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCPTCodes();
  }, [loadCPTCodes]);

  return {
    cptCodes,
    loading,
    error,
    loadCPTCodes,
    searchCPTCodes,
  };
};
