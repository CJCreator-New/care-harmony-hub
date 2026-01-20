import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'cancelled';

export interface Invoice {
  id: string;
  hospital_id: string;
  patient_id: string;
  consultation_id: string | null;
  appointment_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid_amount: number;
  notes: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
  };
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  item_type: string;
  created_at: string;
}

export interface Payment {
  id: string;
  hospital_id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  received_by: string | null;
  payment_date: string;
  created_at: string;
  receiver?: {
    first_name: string;
    last_name: string;
  };
}

export function useInvoices(status?: InvoiceStatus) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['invoices', hospital?.id, status],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('invoices')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn)
        `)
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!hospital?.id,
  });
}

export function useInvoice(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn)
        `)
        .eq('id', invoiceId)
        .maybeSingle();

      if (error) throw error;
      return data as Invoice | null;
    },
    enabled: !!invoiceId,
  });
}

export function useInvoiceItems(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoice-items', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];

      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as InvoiceItem[];
    },
    enabled: !!invoiceId,
  });
}

export function useInvoicePayments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoice-payments', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          receiver:profiles!payments_received_by_fkey(first_name, last_name)
        `)
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!invoiceId,
  });
}

export function useInvoiceStats() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['invoice-stats', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return { pending: 0, partial: 0, paid: 0, totalOutstanding: 0 };

      const { data, error } = await supabase
        .from('invoices')
        .select('status, total, paid_amount')
        .eq('hospital_id', hospital.id);

      if (error) throw error;

      const stats = {
        pending: 0,
        partial: 0,
        paid: 0,
        totalOutstanding: 0,
      };

      data?.forEach((inv) => {
        if (inv.status === 'pending') stats.pending++;
        else if (inv.status === 'partial') stats.partial++;
        else if (inv.status === 'paid') stats.paid++;
        
        stats.totalOutstanding += (inv.total - inv.paid_amount);
      });

      return stats;
    },
    enabled: !!hospital?.id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      patientId, 
      consultationId, 
      appointmentId,
      items,
      notes,
      dueDate
    }: {
      patientId: string;
      consultationId?: string;
      appointmentId?: string;
      items: { description: string; quantity: number; unit_price: number; item_type?: string }[];
      notes?: string;
      dueDate?: string;
    }) => {
      if (!hospital?.id) throw new Error('No hospital context');

      // Generate invoice number
      const { data: invoiceNumber, error: numError } = await supabase
        .rpc('generate_invoice_number', { p_hospital_id: hospital.id });

      if (numError) throw numError;

      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const tax = 0;
      const discount = 0;
      const total = subtotal + tax - discount;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          hospital_id: hospital.id,
          patient_id: patientId,
          consultation_id: consultationId,
          appointment_id: appointmentId,
          invoice_number: invoiceNumber,
          subtotal,
          tax,
          discount,
          total,
          notes,
          due_date: dueDate,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const itemsToInsert = items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
        item_type: item.item_type || 'service',
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
      toast.success('Invoice created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      amount,
      paymentMethod,
      referenceNumber,
      notes,
    }: {
      invoiceId: string;
      amount: number;
      paymentMethod: string;
      referenceNumber?: string;
      notes?: string;
    }) => {
      if (!hospital?.id) throw new Error('No hospital context');

      // Create payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          hospital_id: hospital.id,
          invoice_id: invoiceId,
          amount,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes,
          received_by: profile?.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update invoice paid amount and status
      const { data: invoice } = await supabase
        .from('invoices')
        .select('total, paid_amount')
        .eq('id', invoiceId)
        .single();

      if (invoice) {
        const newPaidAmount = (invoice.paid_amount || 0) + amount;
        const newStatus = newPaidAmount >= invoice.total ? 'paid' : 'partial';

        await supabase
          .from('invoices')
          .update({
            paid_amount: newPaidAmount,
            status: newStatus,
          })
          .eq('id', invoiceId);
      }

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
}

export function useBillingRealtime() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  useEffect(() => {
    if (!hospital?.id) return;

    const channel = supabase
      .channel('billing-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [hospital?.id, queryClient]);
}
