-- =====================================================
-- Phase 1: Critical Security & Infrastructure Migration
-- =====================================================

-- 1. Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('appointment_reminder', 'prescription_ready', 'lab_results', 'invoice', 'system', 'message', 'alert', 'task')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT CHECK (category IN ('clinical', 'administrative', 'billing', 'system', 'communication')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (recipient_id = auth.uid());

CREATE POLICY "Staff can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (user_belongs_to_hospital(auth.uid(), hospital_id));

-- Add indexes for notifications
CREATE INDEX idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_hospital_id ON public.notifications(hospital_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Create medical_records table for patient history
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('allergy', 'medication', 'diagnosis', 'procedure', 'vital_signs', 'lab_result', 'imaging', 'immunization', 'note', 'surgical_history', 'family_history', 'social_history')),
  title TEXT NOT NULL,
  description TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resolved')),
  onset_date DATE,
  resolution_date DATE,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'imported', 'lab', 'pharmacy', 'consultation')),
  is_confidential BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on medical_records
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medical_records
CREATE POLICY "Staff can view medical records in their hospital"
ON public.medical_records FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Clinical staff can create medical records"
ON public.medical_records FOR INSERT
WITH CHECK (
  user_belongs_to_hospital(auth.uid(), hospital_id) AND 
  (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'nurse') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Clinical staff can update medical records"
ON public.medical_records FOR UPDATE
USING (
  user_belongs_to_hospital(auth.uid(), hospital_id) AND 
  (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'nurse') OR has_role(auth.uid(), 'admin'))
);

-- Add indexes for medical_records
CREATE INDEX idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX idx_medical_records_hospital_id ON public.medical_records(hospital_id);
CREATE INDEX idx_medical_records_record_type ON public.medical_records(patient_id, record_type);
CREATE INDEX idx_medical_records_created_at ON public.medical_records(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_medical_records_updated_at
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3. Add system_config table for hospital settings
CREATE TABLE public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'security', 'notifications', 'billing', 'clinical', 'pharmacy', 'laboratory')),
  is_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, config_key)
);

-- Enable RLS on system_config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_config
CREATE POLICY "Staff can view non-sensitive config"
ON public.system_config FOR SELECT
USING (
  user_belongs_to_hospital(auth.uid(), hospital_id) AND 
  (NOT is_sensitive OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins can manage config"
ON public.system_config FOR ALL
USING (
  user_belongs_to_hospital(auth.uid(), hospital_id) AND 
  has_role(auth.uid(), 'admin')
);

-- Add trigger for updated_at
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Add additional columns to existing tables for enhanced functionality

-- Add reminder and followup columns to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS room_number TEXT,
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS waitlist_position INTEGER;

-- Add safety columns to prescriptions
ALTER TABLE public.prescriptions
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'stat')),
ADD COLUMN IF NOT EXISTS allergy_alerts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS drug_interactions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS verification_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Add old/new value tracking to activity_logs for audit trail
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS old_values JSONB,
ADD COLUMN IF NOT EXISTS new_values JSONB,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical'));

-- Add critical value columns to lab_orders
ALTER TABLE public.lab_orders
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS critical_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS critical_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS test_code TEXT,
ADD COLUMN IF NOT EXISTS specimen_type TEXT;