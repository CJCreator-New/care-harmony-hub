-- Create invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  paid_amount numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  due_date date,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create invoice items table
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  item_type text NOT NULL DEFAULT 'service',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash',
  reference_number text,
  notes text,
  received_by uuid REFERENCES public.profiles(id),
  payment_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_invoices_hospital ON public.invoices(hospital_id);
CREATE INDEX idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_hospital ON public.payments(hospital_id);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Invoice policies
CREATE POLICY "Staff can view invoices in their hospital"
ON public.invoices FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Staff can create invoices"
ON public.invoices FOR INSERT
WITH CHECK (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Staff can update invoices"
ON public.invoices FOR UPDATE
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

-- Invoice items policies
CREATE POLICY "Staff can view invoice items"
ON public.invoice_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.invoices i
  WHERE i.id = invoice_items.invoice_id
  AND user_belongs_to_hospital(auth.uid(), i.hospital_id)
));

CREATE POLICY "Staff can create invoice items"
ON public.invoice_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.invoices i
  WHERE i.id = invoice_items.invoice_id
  AND user_belongs_to_hospital(auth.uid(), i.hospital_id)
));

CREATE POLICY "Staff can update invoice items"
ON public.invoice_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.invoices i
  WHERE i.id = invoice_items.invoice_id
  AND user_belongs_to_hospital(auth.uid(), i.hospital_id)
));

-- Payments policies
CREATE POLICY "Staff can view payments in their hospital"
ON public.payments FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Staff can create payments"
ON public.payments FOR INSERT
WITH CHECK (user_belongs_to_hospital(auth.uid(), hospital_id));

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_hospital_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE hospital_id = p_hospital_id;
  
  invoice_num := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$;

-- Updated at trigger for invoices
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;