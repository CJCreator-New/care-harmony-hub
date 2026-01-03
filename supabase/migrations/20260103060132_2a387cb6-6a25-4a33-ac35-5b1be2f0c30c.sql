-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for documents storage bucket
-- Allow authenticated users to upload documents to their hospital folder
CREATE POLICY "Hospital staff can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT hospital_id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to read documents from their hospital
CREATE POLICY "Hospital staff can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT hospital_id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to update documents in their hospital
CREATE POLICY "Hospital staff can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT hospital_id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to delete documents from their hospital
CREATE POLICY "Hospital staff can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT hospital_id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);