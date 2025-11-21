-- Create saved_mentors table to store user's saved mentor profiles
CREATE TABLE IF NOT EXISTS public.saved_mentors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  mentor_name text NOT NULL,
  mentor_title text,
  mentor_company text,
  mentor_profile_url text,
  mentor_platform_type text,
  mentor_description text,
  mentor_tags text[],
  mentor_career_journey text,
  saved_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_mentor UNIQUE (user_id, mentor_profile_url)
);

-- Enable RLS
ALTER TABLE public.saved_mentors ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved mentors
CREATE POLICY "Users can view their own saved mentors"
ON public.saved_mentors
FOR SELECT
USING (auth.uid() = user_id);

-- Users can save mentors
CREATE POLICY "Users can save mentors"
ON public.saved_mentors
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unsave mentors
CREATE POLICY "Users can unsave mentors"
ON public.saved_mentors
FOR DELETE
USING (auth.uid() = user_id);