-- Create mentors table to store mentor/coach profiles
CREATE TABLE public.mentors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  title text,
  company text,
  company_url text,
  location text,
  headline text,
  experience_years integer,
  key_skills text[],
  education jsonb DEFAULT '[]'::jsonb,
  achievements text[],
  career_path jsonb DEFAULT '[]'::jsonb,
  industry text,
  profile_url text,
  profile_image_url text,
  follower_count text,
  category text,
  visualization_images text[],
  typical_day_routine text[],
  leadership_philosophy text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

-- Anyone can view mentors (public data)
CREATE POLICY "Anyone can view mentors"
ON public.mentors
FOR SELECT
USING (true);

-- Create index on category for filtering
CREATE INDEX idx_mentors_category ON public.mentors(category);

-- Create index on industry for filtering
CREATE INDEX idx_mentors_industry ON public.mentors(industry);

-- Add trigger for updated_at
CREATE TRIGGER update_mentors_updated_at
BEFORE UPDATE ON public.mentors
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();