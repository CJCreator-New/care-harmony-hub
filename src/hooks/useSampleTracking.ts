import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LabSample {
  id: string;
  sample_id: string;
  patient_id: string;
  test_type: string;
  status: 'collected' | 'received' | 'processing' | 'completed' | 'rejected';
  priority: 'routine' | 'urgent' | 'stat';
  collected_at: string;
  received_at?: string;
  processed_at?: string;
  completed_at?: string;
  collector_id: string;
  technician_id?: string;
  location: string;
  temperature?: number;
  volume?: string;
  notes?: string;
  rejection_reason?: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface SampleTracking {
  id: string;
  sample_id: string;
  location: string;
  action: 'collected' | 'received' | 'moved' | 'processed' | 'completed' | 'rejected';
  timestamp: string;
  user_id: string;
  temperature?: number;
  notes?: string;
  hospital_id: string;
}

export function useSampleTracking() {
  const { hospital } = useAuth();
  const queryClient = useQueryClient();

  // Get all samples for the hospital
  const { data: samples, isLoading, error } = useQuery({
    queryKey: ['lab-samples', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('lab_samples')
        .select(`
          *,
          patient:patients(first_name, last_name, medical_record_number),
          collector:profiles(first_name, last_name),
          technician:profiles(first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LabSample[];
    },
    enabled: !!hospital?.id,
  });

  // Get sample tracking history - this needs to be called as a separate hook
  const useSampleHistory = (sampleId: string) => {
    return useQuery({
      queryKey: ['sample-tracking', sampleId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('sample_tracking')
          .select(`
            *,
            user:profiles(first_name, last_name)
          `)
          .eq('sample_id', sampleId)
          .order('timestamp', { ascending: true });

        if (error) throw error;
        return data;
      },
      enabled: !!sampleId,
    });
  };

  // Create new sample
  const createSampleMutation = useMutation({
    mutationFn: async (sampleData: Omit<LabSample, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lab_samples')
        .insert(sampleData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-samples'] });
      toast.success('Sample created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create sample: ' + error.message);
    },
  });

  // Update sample status
  const updateSampleStatusMutation = useMutation({
    mutationFn: async ({
      sampleId,
      status,
      technician_id,
      notes,
      rejection_reason
    }: {
      sampleId: string;
      status: LabSample['status'];
      technician_id?: string;
      notes?: string;
      rejection_reason?: string;
    }) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'received') updateData.received_at = new Date().toISOString();
      if (status === 'processing') updateData.processed_at = new Date().toISOString();
      if (status === 'completed') updateData.completed_at = new Date().toISOString();
      if (technician_id) updateData.technician_id = technician_id;
      if (notes) updateData.notes = notes;
      if (rejection_reason) updateData.rejection_reason = rejection_reason;

      const { data, error } = await supabase
        .from('lab_samples')
        .update(updateData)
        .eq('id', sampleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-samples'] });
      toast.success('Sample status updated');
    },
    onError: (error) => {
      toast.error('Failed to update sample status: ' + error.message);
    },
  });

  // Track sample movement/location
  const trackSampleMovementMutation = useMutation({
    mutationFn: async (trackingData: Omit<SampleTracking, 'id' | 'timestamp'>) => {
      const { data, error } = await supabase
        .from('sample_tracking')
        .insert({
          ...trackingData,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-tracking'] });
    },
  });

  // Get samples by status
  const getSamplesByStatus = (status: LabSample['status']) => {
    return samples?.filter(sample => sample.status === status) || [];
  };

  // Get urgent samples
  const urgentSamples = samples?.filter(sample => sample.priority === 'urgent' || sample.priority === 'stat') || [];

  // Get overdue samples (samples that should have been processed)
  const getOverdueSamples = () => {
    const now = new Date();
    return samples?.filter(sample => {
      if (sample.status !== 'collected' && sample.status !== 'received') return false;

      const collectedTime = new Date(sample.collected_at);
      const hoursSinceCollection = (now.getTime() - collectedTime.getTime()) / (1000 * 60 * 60);

      // Urgent samples should be processed within 1 hour
      if (sample.priority === 'urgent' && hoursSinceCollection > 1) return true;
      // STAT samples should be processed within 30 minutes
      if (sample.priority === 'stat' && hoursSinceCollection > 0.5) return true;
      // Routine samples should be processed within 4 hours
      if (sample.priority === 'routine' && hoursSinceCollection > 4) return true;

      return false;
    }) || [];
  };

  return {
    samples,
    isLoading,
    error,
    useSampleHistory,
    createSample: createSampleMutation.mutate,
    updateSampleStatus: updateSampleStatusMutation.mutate,
    trackSampleMovement: trackSampleMovementMutation.mutate,
    getSamplesByStatus,
    urgentSamples,
    overdueSamples: getOverdueSamples(),
    isCreating: createSampleMutation.isPending,
    isUpdating: updateSampleStatusMutation.isPending,
  };
}