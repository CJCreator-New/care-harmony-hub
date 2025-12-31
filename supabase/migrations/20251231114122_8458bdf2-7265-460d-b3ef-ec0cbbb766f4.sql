-- Create lab_orders table for laboratory module
CREATE TABLE public.lab_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  ordered_by UUID NOT NULL,
  test_name TEXT NOT NULL,
  test_category TEXT,
  sample_type TEXT,
  priority priority_level DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sample_collected', 'in_progress', 'completed', 'cancelled')),
  results JSONB DEFAULT '{}'::jsonb,
  result_notes TEXT,
  normal_range TEXT,
  collected_by UUID,
  collected_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  ordered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_lab_orders_hospital ON public.lab_orders(hospital_id);
CREATE INDEX idx_lab_orders_patient ON public.lab_orders(patient_id);
CREATE INDEX idx_lab_orders_status ON public.lab_orders(status);
CREATE INDEX idx_lab_orders_ordered_at ON public.lab_orders(ordered_at DESC);

-- Enable RLS
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view lab orders in their hospital"
ON public.lab_orders FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Clinical staff can create lab orders"
ON public.lab_orders FOR INSERT
WITH CHECK (
  user_belongs_to_hospital(auth.uid(), hospital_id) AND
  (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'nurse') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Lab techs and clinical staff can update lab orders"
ON public.lab_orders FOR UPDATE
USING (
  user_belongs_to_hospital(auth.uid(), hospital_id) AND
  (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'nurse') OR has_role(auth.uid(), 'lab_technician') OR has_role(auth.uid(), 'admin'))
);

-- Add updated_at trigger
CREATE TRIGGER update_lab_orders_updated_at
  BEFORE UPDATE ON public.lab_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_orders;