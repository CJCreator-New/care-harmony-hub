-- Create shift_handovers table for nurse shift handover system
CREATE TABLE public.shift_handovers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  outgoing_nurse_id UUID NOT NULL REFERENCES public.profiles(id),
  incoming_nurse_id UUID REFERENCES public.profiles(id),
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type TEXT NOT NULL DEFAULT 'day', -- day, evening, night
  status TEXT NOT NULL DEFAULT 'pending', -- pending, acknowledged, completed
  critical_patients JSONB DEFAULT '[]'::jsonb,
  pending_tasks JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  handover_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patient_prep_checklists table for pre-consultation checklist
CREATE TABLE public.patient_prep_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  queue_entry_id UUID REFERENCES public.patient_queue(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  nurse_id UUID REFERENCES public.profiles(id),
  vitals_completed BOOLEAN DEFAULT false,
  allergies_verified BOOLEAN DEFAULT false,
  medications_reviewed BOOLEAN DEFAULT false,
  chief_complaint_recorded BOOLEAN DEFAULT false,
  consent_obtained BOOLEAN DEFAULT false,
  ready_for_doctor BOOLEAN DEFAULT false,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medication_administrations table for tracking medication given by nurses
CREATE TABLE public.medication_administrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.prescriptions(id),
  prescription_item_id UUID REFERENCES public.prescription_items(id),
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  route TEXT, -- oral, IV, IM, etc.
  administered_by UUID NOT NULL REFERENCES public.profiles(id),
  administered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'given', -- given, refused, held, not_given
  notes TEXT,
  witness_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_prep_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_handovers
CREATE POLICY "Nurses can view handovers in their hospital" 
  ON public.shift_handovers 
  FOR SELECT 
  USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Nurses can create handovers" 
  ON public.shift_handovers 
  FOR INSERT 
  WITH CHECK (
    user_belongs_to_hospital(auth.uid(), hospital_id) AND 
    (has_role(auth.uid(), 'nurse') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Nurses can update handovers" 
  ON public.shift_handovers 
  FOR UPDATE 
  USING (
    user_belongs_to_hospital(auth.uid(), hospital_id) AND 
    (has_role(auth.uid(), 'nurse') OR has_role(auth.uid(), 'admin'))
  );

-- RLS Policies for patient_prep_checklists
CREATE POLICY "Staff can view checklists in their hospital" 
  ON public.patient_prep_checklists 
  FOR SELECT 
  USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Nurses can manage checklists" 
  ON public.patient_prep_checklists 
  FOR ALL 
  USING (
    user_belongs_to_hospital(auth.uid(), hospital_id) AND 
    (has_role(auth.uid(), 'nurse') OR has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'))
  );

-- RLS Policies for medication_administrations
CREATE POLICY "Staff can view medication administrations" 
  ON public.medication_administrations 
  FOR SELECT 
  USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Nurses can record medication administrations" 
  ON public.medication_administrations 
  FOR INSERT 
  WITH CHECK (
    user_belongs_to_hospital(auth.uid(), hospital_id) AND 
    (has_role(auth.uid(), 'nurse') OR has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'))
  );

-- Triggers for updated_at
CREATE TRIGGER update_shift_handovers_updated_at
  BEFORE UPDATE ON public.shift_handovers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_prep_checklists_updated_at
  BEFORE UPDATE ON public.patient_prep_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();