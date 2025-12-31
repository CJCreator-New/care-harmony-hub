-- Create enum for invitation status
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- Create staff invitations table
CREATE TABLE public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate pending invitations
  CONSTRAINT unique_pending_invitation UNIQUE (hospital_id, email, status)
);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_invitations

-- Admins can view all invitations in their hospital
CREATE POLICY "Admins can view hospital invitations"
ON public.staff_invitations
FOR SELECT
USING (
  user_belongs_to_hospital(auth.uid(), hospital_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
ON public.staff_invitations
FOR INSERT
WITH CHECK (
  user_belongs_to_hospital(auth.uid(), hospital_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can update invitations (cancel)
CREATE POLICY "Admins can update invitations"
ON public.staff_invitations
FOR UPDATE
USING (
  user_belongs_to_hospital(auth.uid(), hospital_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Anyone can view an invitation by token (for accepting)
CREATE POLICY "Anyone can view invitation by token"
ON public.staff_invitations
FOR SELECT
USING (status = 'pending' AND expires_at > now());

-- Add index for faster token lookups
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(token);
CREATE INDEX idx_staff_invitations_hospital ON public.staff_invitations(hospital_id);
CREATE INDEX idx_staff_invitations_email ON public.staff_invitations(email);