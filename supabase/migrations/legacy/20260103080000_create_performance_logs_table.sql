-- Create performance_logs table for monitoring application performance
CREATE TABLE IF NOT EXISTS public.performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('slow_page_load', 'high_memory_usage', 'failed_requests', 'layout_shift')),
  value DECIMAL NOT NULL,
  threshold DECIMAL NOT NULL,
  page TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on performance_logs
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for performance logs (allow inserts for authenticated users, reads for admins)
CREATE POLICY "Users can insert performance logs"
ON public.performance_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read performance logs"
ON public.performance_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_performance_logs_type_timestamp
ON public.performance_logs(type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_logs_timestamp
ON public.performance_logs(timestamp DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_performance_logs_updated_at
BEFORE UPDATE ON public.performance_logs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();