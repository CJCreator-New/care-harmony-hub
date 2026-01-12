import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QueuePrediction {
  patient_id: string;
  estimated_wait_time: number;
  confidence_score: number;
  prediction_factors: Record<string, any>;
}

interface NoShowPrediction {
  probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'very_high';
  risk_factors: string[];
  total_appointments: number;
  previous_no_shows: number;
}

export const useQueuePrediction = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get queue predictions
  const { data: predictions, refetch: refetchPredictions } = useQuery({
    queryKey: ['queue-predictions', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('predict_queue_wait_times', {
          hospital_id_param: profile?.hospital_id
        });
      
      if (error) throw error;
      return data as QueuePrediction[];
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 60000, // Refresh every minute
  });

  // Optimize queue order
  const optimizeQueue = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .rpc('optimize_queue_order', {
          hospital_id_param: profile?.hospital_id
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchPredictions();
      toast({
        title: "Queue Optimized",
        description: "Queue order has been optimized for efficiency.",
      });
    },
    onError: () => {
      toast({
        title: "Optimization Failed",
        description: "Failed to optimize queue. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Predict no-show probability
  const predictNoShow = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data, error } = await supabase
        .rpc('predict_no_show_probability', {
          appointment_id_param: appointmentId
        });
      
      if (error) throw error;
      return data as NoShowPrediction;
    }
  });

  // Store prediction for accuracy tracking
  const storePrediction = useMutation({
    mutationFn: async (prediction: {
      patient_id: string;
      appointment_id: string;
      estimated_wait_time: number;
      confidence_score: number;
      prediction_factors: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from('queue_predictions')
        .insert({
          ...prediction,
          hospital_id: profile?.hospital_id
        });
      
      if (error) throw error;
    }
  });

  return {
    predictions: predictions || [],
    optimizeQueue: optimizeQueue.mutate,
    isOptimizing: optimizeQueue.isPending,
    predictNoShow: predictNoShow.mutate,
    isPredictingNoShow: predictNoShow.isPending,
    storePrediction: storePrediction.mutate,
    refetchPredictions
  };
};