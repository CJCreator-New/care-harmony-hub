-- Document storage table for medical records
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('lab_report', 'imaging', 'prescription', 'consent_form', 'insurance', 'referral', 'discharge_summary', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  is_confidential BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents
CREATE POLICY "Staff can view documents in their hospital" ON public.documents
  FOR SELECT USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Clinical staff can manage documents" ON public.documents
  FOR ALL USING (
    user_belongs_to_hospital(auth.uid(), hospital_id) AND (
      has_role(auth.uid(), 'doctor'::app_role) OR 
      has_role(auth.uid(), 'nurse'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'lab_technician'::app_role)
    )
  );

-- Inventory reorder rules table
CREATE TABLE IF NOT EXISTS public.reorder_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  reorder_point INTEGER NOT NULL DEFAULT 10,
  reorder_quantity INTEGER NOT NULL DEFAULT 50,
  preferred_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  auto_reorder BOOLEAN DEFAULT false,
  last_auto_order_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, medication_id)
);

-- Enable RLS for reorder_rules
ALTER TABLE public.reorder_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for reorder_rules
CREATE POLICY "Staff can view reorder rules" ON public.reorder_rules
  FOR SELECT USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Pharmacists and admins can manage reorder rules" ON public.reorder_rules
  FOR ALL USING (
    user_belongs_to_hospital(auth.uid(), hospital_id) AND (
      has_role(auth.uid(), 'pharmacist'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Low stock alerts table
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiring_soon', 'expired')),
  current_quantity INTEGER NOT NULL,
  threshold_quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  auto_order_created BOOLEAN DEFAULT false,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for stock_alerts
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_alerts
CREATE POLICY "Staff can view stock alerts" ON public.stock_alerts
  FOR SELECT USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Pharmacists and admins can manage stock alerts" ON public.stock_alerts
  FOR ALL USING (
    user_belongs_to_hospital(auth.uid(), hospital_id) AND (
      has_role(auth.uid(), 'pharmacist'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_hospital ON public.documents(hospital_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON public.documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_hospital ON public.reorder_rules(hospital_id);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_medication ON public.reorder_rules(medication_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_hospital ON public.stock_alerts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON public.stock_alerts(status);