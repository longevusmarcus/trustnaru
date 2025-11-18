-- Create a table to track code usage frequency
CREATE TABLE public.code_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.code_usage_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own usage
CREATE POLICY "Users can view their own code usage"
ON public.code_usage_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: System can insert usage logs
CREATE POLICY "Anyone can log code usage"
ON public.code_usage_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_code_usage_log_code ON public.code_usage_log(code);
CREATE INDEX idx_code_usage_log_used_at ON public.code_usage_log(used_at);