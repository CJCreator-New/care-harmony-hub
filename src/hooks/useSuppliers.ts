import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Supplier {
  id: string;
  hospital_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  hospital_id: string;
  supplier_id: string;
  order_number: string;
  status: string;
  total_amount: number;
  notes: string | null;
  ordered_by: string | null;
  ordered_at: string;
  expected_delivery_date: string | null;
  received_at: string | null;
  received_by: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  medication_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  received_quantity: number;
  created_at: string;
}

export function useSuppliers() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['suppliers', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!hospital?.id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  return useMutation({
    mutationFn: async (supplier: Partial<Supplier>) => {
      if (!hospital?.id) throw new Error('No hospital');
      
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{
          name: supplier.name || '',
          contact_person: supplier.contact_person,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          payment_terms: supplier.payment_terms,
          notes: supplier.notes,
          hospital_id: hospital.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add supplier: ' + error.message);
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update supplier: ' + error.message);
    },
  });
}

export function usePurchaseOrders() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['purchase-orders', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!hospital?.id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      supplier_id, 
      items, 
      notes,
      expected_delivery_date 
    }: { 
      supplier_id: string; 
      items: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'created_at' | 'received_quantity'>[];
      notes?: string;
      expected_delivery_date?: string;
    }) => {
      if (!hospital?.id || !profile?.id) throw new Error('No hospital or profile');
      
      // Generate order number
      const { data: orderNumber } = await supabase.rpc('generate_po_number', {
        p_hospital_id: hospital.id,
      });

      const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          hospital_id: hospital.id,
          supplier_id,
          order_number: orderNumber || `PO-${Date.now()}`,
          total_amount: totalAmount,
          notes,
          expected_delivery_date,
          ordered_by: profile.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        purchase_order_id: order.id,
        medication_id: item.medication_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create purchase order: ' + error.message);
    },
  });
}

export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'received') {
        updates.received_at = new Date().toISOString();
        updates.received_by = profile?.id;
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Order status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}
