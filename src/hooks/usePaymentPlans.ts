import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addWeeks, addMonths } from 'date-fns';

interface PaymentPlan {
  id: string;
  hospital_id: string;
  patient_id: string;
  invoice_id: string | null;
  total_amount: number;
  down_payment: number | null;
  remaining_balance: number;
  installment_amount: number;
  installment_frequency: string;
  total_installments: number;
  paid_installments: number | null;
  next_due_date: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    mrn: string;
  };
}

export const usePaymentPlans = () => {
  const { profile } = useAuth();
  const hospitalId = profile?.hospital_id;
  const queryClient = useQueryClient();

  const { data: paymentPlans, isLoading } = useQuery({
    queryKey: ['payment-plans', hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];
      
      const { data, error } = await supabase
        .from('payment_plans')
        .select(`
          *,
          patient:patients(first_name, last_name, mrn)
        `)
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PaymentPlan[];
    },
    enabled: !!hospitalId,
  });

  const createPaymentPlan = useMutation({
    mutationFn: async (plan: {
      patient_id: string;
      invoice_id?: string;
      total_amount: number;
      down_payment?: number;
      installment_amount: number;
      installment_frequency: 'weekly' | 'bi_weekly' | 'monthly';
      total_installments: number;
      notes?: string;
    }) => {
      if (!hospitalId || !profile) throw new Error('No hospital or profile');
      
      const downPayment = plan.down_payment || 0;
      const remainingBalance = plan.total_amount - downPayment;
      
      // Calculate next due date based on frequency
      const now = new Date();
      let nextDueDate: Date;
      switch (plan.installment_frequency) {
        case 'weekly':
          nextDueDate = addWeeks(now, 1);
          break;
        case 'bi_weekly':
          nextDueDate = addWeeks(now, 2);
          break;
        case 'monthly':
        default:
          nextDueDate = addMonths(now, 1);
          break;
      }

      const { data, error } = await supabase
        .from('payment_plans')
        .insert({
          ...plan,
          hospital_id: hospitalId,
          remaining_balance: remainingBalance,
          next_due_date: nextDueDate.toISOString().split('T')[0],
          created_by: profile.id,
          paid_installments: downPayment > 0 ? 1 : 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      toast.success('Payment plan created');
    },
    onError: (error) => {
      toast.error('Failed to create payment plan: ' + error.message);
    },
  });

  const recordPayment = useMutation({
    mutationFn: async ({ planId, amount }: { planId: string; amount: number }) => {
      // Get current plan
      const { data: plan, error: fetchError } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (fetchError) throw fetchError;

      const newRemainingBalance = plan.remaining_balance - amount;
      const newPaidInstallments = (plan.paid_installments || 0) + 1;
      const isCompleted = newRemainingBalance <= 0 || newPaidInstallments >= plan.total_installments;

      // Calculate next due date
      let nextDueDate: Date | null = null;
      if (!isCompleted && plan.next_due_date) {
        const currentDueDate = new Date(plan.next_due_date);
        switch (plan.installment_frequency) {
          case 'weekly':
            nextDueDate = addWeeks(currentDueDate, 1);
            break;
          case 'bi_weekly':
            nextDueDate = addWeeks(currentDueDate, 2);
            break;
          case 'monthly':
          default:
            nextDueDate = addMonths(currentDueDate, 1);
            break;
        }
      }

      const { data, error } = await supabase
        .from('payment_plans')
        .update({
          remaining_balance: Math.max(0, newRemainingBalance),
          paid_installments: newPaidInstallments,
          next_due_date: nextDueDate ? nextDueDate.toISOString().split('T')[0] : null,
          status: isCompleted ? 'completed' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      toast.success('Payment recorded');
    },
    onError: (error) => {
      toast.error('Failed to record payment: ' + error.message);
    },
  });

  const activePlans = paymentPlans?.filter(p => p.status === 'active') || [];
  const completedPlans = paymentPlans?.filter(p => p.status === 'completed') || [];
  const defaultedPlans = paymentPlans?.filter(p => p.status === 'defaulted') || [];

  const totalOutstanding = activePlans.reduce((sum, p) => sum + p.remaining_balance, 0);

  return {
    paymentPlans,
    activePlans,
    completedPlans,
    defaultedPlans,
    totalOutstanding,
    isLoading,
    createPaymentPlan,
    recordPayment,
  };
};
