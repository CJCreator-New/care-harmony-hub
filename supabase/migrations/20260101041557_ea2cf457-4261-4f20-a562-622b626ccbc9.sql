-- Create activity logs table for HIPAA audit trail
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_hospital_id ON public.activity_logs(hospital_id);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for activity logs
CREATE POLICY "Staff can insert activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view activity logs in their hospital"
ON public.activity_logs
FOR SELECT
USING (
  user_belongs_to_hospital(auth.uid(), hospital_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can view their own activity logs"
ON public.activity_logs
FOR SELECT
USING (user_id = auth.uid());