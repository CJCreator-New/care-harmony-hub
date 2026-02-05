-- Create messages table for secure messaging
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX idx_messages_patient ON public.messages(patient_id);
CREATE INDEX idx_messages_hospital ON public.messages(hospital_id);
CREATE INDEX idx_messages_parent ON public.messages(parent_message_id);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view messages they sent or received
CREATE POLICY "Users can view their messages"
ON public.messages
FOR SELECT
USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

-- RLS Policy: Users can send messages (insert)
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (sender_id = auth.uid());

-- RLS Policy: Recipients can update messages (mark as read)
CREATE POLICY "Recipients can update messages"
ON public.messages
FOR UPDATE
USING (recipient_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create appointment_requests table for patient booking requests
CREATE TABLE public.appointment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  preferred_date DATE NOT NULL,
  preferred_time TIME,
  alternate_date DATE,
  alternate_time TIME,
  appointment_type TEXT NOT NULL,
  reason_for_visit TEXT,
  doctor_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_appointment_id UUID REFERENCES public.appointments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_appointment_requests_patient ON public.appointment_requests(patient_id);
CREATE INDEX idx_appointment_requests_hospital ON public.appointment_requests(hospital_id);
CREATE INDEX idx_appointment_requests_status ON public.appointment_requests(status);

-- Enable RLS
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Patients can view their own requests
CREATE POLICY "Patients can view their appointment requests"
ON public.appointment_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = appointment_requests.patient_id
    AND p.user_id = auth.uid()
  )
);

-- RLS Policy: Patients can create appointment requests
CREATE POLICY "Patients can create appointment requests"
ON public.appointment_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = appointment_requests.patient_id
    AND p.user_id = auth.uid()
  )
);

-- RLS Policy: Staff can view appointment requests in their hospital
CREATE POLICY "Staff can view appointment requests"
ON public.appointment_requests
FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

-- RLS Policy: Staff can update appointment requests
CREATE POLICY "Staff can update appointment requests"
ON public.appointment_requests
FOR UPDATE
USING (
  user_belongs_to_hospital(auth.uid(), hospital_id) AND
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'receptionist') OR has_role(auth.uid(), 'doctor'))
);

-- Add updated_at trigger
CREATE TRIGGER update_appointment_requests_updated_at
  BEFORE UPDATE ON public.appointment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();