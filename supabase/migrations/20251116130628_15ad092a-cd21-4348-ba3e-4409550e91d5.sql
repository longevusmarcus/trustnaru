-- Add results column to happenstance_searches table
ALTER TABLE public.happenstance_searches 
ADD COLUMN results jsonb DEFAULT '[]'::jsonb;