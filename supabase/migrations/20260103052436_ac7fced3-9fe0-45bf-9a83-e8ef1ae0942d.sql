-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Storage policies for documents bucket
CREATE POLICY "Users can view documents from their hospital"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can upload documents to their hospital"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete documents from their hospital"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id::text = (storage.foldername(name))[1]
  )
);

-- Add 2FA support columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT now();

-- Create two_factor_secrets table for TOTP
CREATE TABLE IF NOT EXISTS public.two_factor_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  backup_codes TEXT[] NOT NULL DEFAULT '{}',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on two_factor_secrets
ALTER TABLE public.two_factor_secrets ENABLE ROW LEVEL SECURITY;

-- Users can only access their own 2FA secrets
CREATE POLICY "Users can view their own 2FA secrets"
ON public.two_factor_secrets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 2FA secrets"
ON public.two_factor_secrets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own 2FA secrets"
ON public.two_factor_secrets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own 2FA secrets"
ON public.two_factor_secrets FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_two_factor_secrets_updated_at
BEFORE UPDATE ON public.two_factor_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for documents table
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;