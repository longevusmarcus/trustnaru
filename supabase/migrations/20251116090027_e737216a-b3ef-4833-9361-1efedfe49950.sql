-- Create table to track weekly search usage
CREATE TABLE IF NOT EXISTS public.happenstance_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  search_intent TEXT NOT NULL,
  search_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  results_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.happenstance_searches ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own searches"
ON public.happenstance_searches
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches"
ON public.happenstance_searches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_happenstance_searches_user_date 
ON public.happenstance_searches(user_id, search_date DESC);