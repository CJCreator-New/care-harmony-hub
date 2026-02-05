-- Create suppliers table for supplier management
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  ordered_by UUID REFERENCES public.profiles(id),
  ordered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expected_delivery_date DATE,
  received_at TIMESTAMP WITH TIME ZONE,
  received_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications(id),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctor_availability table for scheduling
CREATE TABLE public.doctor_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 30,
  is_telemedicine BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_slots table for appointment booking
CREATE TABLE public.time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  is_telemedicine BOOLEAN DEFAULT false,
  appointment_id UUID REFERENCES public.appointments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

-- Suppliers policies
CREATE POLICY "Staff can view suppliers" ON public.suppliers
  FOR SELECT USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Pharmacists and admins can manage suppliers" ON public.suppliers
  FOR ALL USING (
    user_belongs_to_hospital(auth.uid(), hospital_id) 
    AND (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'))
  );

-- Purchase orders policies
CREATE POLICY "Staff can view purchase orders" ON public.purchase_orders
  FOR SELECT USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Pharmacists and admins can manage purchase orders" ON public.purchase_orders
  FOR ALL USING (
    user_belongs_to_hospital(auth.uid(), hospital_id) 
    AND (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'))
  );

-- Purchase order items policies
CREATE POLICY "Staff can view purchase order items" ON public.purchase_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
      AND user_belongs_to_hospital(auth.uid(), po.hospital_id)
    )
  );

CREATE POLICY "Pharmacists and admins can manage purchase order items" ON public.purchase_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
      AND user_belongs_to_hospital(auth.uid(), po.hospital_id)
      AND (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'))
    )
  );

-- Doctor availability policies
CREATE POLICY "Staff can view doctor availability" ON public.doctor_availability
  FOR SELECT USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Doctors can manage their own availability" ON public.doctor_availability
  FOR ALL USING (
    user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (doctor_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'))
  );

-- Time slots policies
CREATE POLICY "Staff can view time slots" ON public.time_slots
  FOR SELECT USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Staff can manage time slots" ON public.time_slots
  FOR ALL USING (
    user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'receptionist') OR has_role(auth.uid(), 'admin'))
  );

-- Generate purchase order number function
CREATE OR REPLACE FUNCTION public.generate_po_number(p_hospital_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  po_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.purchase_orders
  WHERE hospital_id = p_hospital_id;
  
  po_num := 'PO-' || LPAD(next_number::TEXT, 6, '0');
  RETURN po_num;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_availability_updated_at
  BEFORE UPDATE ON public.doctor_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();