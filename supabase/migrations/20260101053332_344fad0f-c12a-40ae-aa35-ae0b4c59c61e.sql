-- Add foreign key relationship from activity_logs.user_id to profiles.user_id
-- This allows PostgREST to perform automatic joins for the activity logs query

ALTER TABLE public.activity_logs 
ADD CONSTRAINT activity_logs_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add index on created_at for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Add index on hospital_id for filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_hospital_id ON public.activity_logs(hospital_id);