-- Create error_logs table for tracking application errors
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on error_logs
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for error_logs (admins can read, authenticated users can insert)
CREATE POLICY "Users can insert error logs"
ON public.error_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read error logs"
ON public.error_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp
ON public.error_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_severity_timestamp
ON public.error_logs(severity, timestamp DESC);

-- Create triggers for updated_at (though these tables are mostly insert-only)
CREATE TRIGGER update_error_logs_updated_at
BEFORE UPDATE ON public.error_logs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();