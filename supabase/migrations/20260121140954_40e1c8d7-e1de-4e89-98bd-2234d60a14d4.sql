-- Create checkout events table for analytics
CREATE TABLE public.checkout_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('initiated', 'completed', 'abandoned')),
  price_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkout_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events
CREATE POLICY "Users can insert their own checkout events"
ON public.checkout_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own events
CREATE POLICY "Users can view their own checkout events"
ON public.checkout_events
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for analytics queries
CREATE INDEX idx_checkout_events_user_id ON public.checkout_events(user_id);
CREATE INDEX idx_checkout_events_event_type ON public.checkout_events(event_type);
CREATE INDEX idx_checkout_events_created_at ON public.checkout_events(created_at);