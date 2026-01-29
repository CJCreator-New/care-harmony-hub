-- Create medications inventory table
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  form TEXT, -- tablet, capsule, syrup, injection, etc.
  strength TEXT,
  unit TEXT, -- mg, ml, etc.
  manufacturer TEXT,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 10,
  unit_price DECIMAL(10,2),
  expiry_date DATE,
  batch_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  prescribed_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  dispensed_by UUID REFERENCES public.profiles(id),
  dispensed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create prescription items table
CREATE TABLE public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications(id) ON DELETE SET NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  quantity INTEGER,
  instructions TEXT,
  is_dispensed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_medications_hospital ON public.medications(hospital_id);
CREATE INDEX idx_medications_name ON public.medications(name);
CREATE INDEX idx_medications_low_stock ON public.medications(hospital_id, current_stock, minimum_stock) WHERE current_stock < minimum_stock;
CREATE INDEX idx_prescriptions_hospital ON public.prescriptions(hospital_id);
CREATE INDEX idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_status ON public.prescriptions(hospital_id, status);
CREATE INDEX idx_prescription_items_prescription ON public.prescription_items(prescription_id);

-- Enable RLS
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medications
CREATE POLICY "Staff can view medications in their hospital"
ON public.medications FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Pharmacists and admins can manage medications"
ON public.medications FOR ALL
USING (user_belongs_to_hospital(auth.uid(), hospital_id) 
  AND (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin')));

-- RLS Policies for prescriptions
CREATE POLICY "Staff can view prescriptions in their hospital"
ON public.prescriptions FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Patients can view their own prescriptions"
ON public.prescriptions FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can create prescriptions"
ON public.prescriptions FOR INSERT
WITH CHECK (user_belongs_to_hospital(auth.uid(), hospital_id) 
  AND (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Pharmacists can update prescriptions"
ON public.prescriptions FOR UPDATE
USING (user_belongs_to_hospital(auth.uid(), hospital_id) 
  AND (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin')));

-- RLS Policies for prescription_items
CREATE POLICY "Staff can view prescription items"
ON public.prescription_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.prescriptions p 
  WHERE p.id = prescription_items.prescription_id 
    AND user_belongs_to_hospital(auth.uid(), p.hospital_id)
));

CREATE POLICY "Doctors can create prescription items"
ON public.prescription_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.prescriptions p 
  WHERE p.id = prescription_items.prescription_id 
    AND user_belongs_to_hospital(auth.uid(), p.hospital_id)
    AND (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Pharmacists can update prescription items"
ON public.prescription_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.prescriptions p 
  WHERE p.id = prescription_items.prescription_id 
    AND user_belongs_to_hospital(auth.uid(), p.hospital_id)
    AND (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'))
));

-- Add updated_at triggers
CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medications;