import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CPTCode, ClinicalTemplate } from '@/types/soap';

export const useCPTCodes = () => {
  const [cptCodes, setCptCodes] = useState<CPTCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCPTCodes = useCallback(async (category?: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('cpt_codes')
        .select('*')
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
  }, []);

  const searchCPTCodes = async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('cpt_codes')
        .select('*')
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
    searchCPTCodes
  };
};

export const useClinicalTemplates = () => {
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async (type?: string, specialty?: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('clinical_templates')
        .select('*')
        .order('name');

      if (type) {
        query = query.eq('type', type);
      }
      if (specialty) {
        query = query.eq('specialty', specialty);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = async (template: Omit<ClinicalTemplate, 'id' | 'created_at'>) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('clinical_templates')
        .insert([template])
        .select()
        .single();

      if (error) throw error;
      setTemplates(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    loading,
    error,
    loadTemplates,
    createTemplate
  };
};