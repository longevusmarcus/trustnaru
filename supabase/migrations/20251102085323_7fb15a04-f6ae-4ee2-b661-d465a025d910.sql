-- Create career_paths table to store generated career paths
CREATE TABLE public.career_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  journey_duration TEXT,
  salary_range TEXT,
  lifestyle_benefits TEXT[],
  impact_areas TEXT[],
  key_skills TEXT[],
  target_companies TEXT[],
  category TEXT,
  difficulty_level TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_photos table for uploaded reference photos
CREATE TABLE public.user_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  is_reference BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_profiles table for storing wizard data
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  cv_url TEXT,
  voice_transcription TEXT,
  wizard_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.career_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for career_paths
CREATE POLICY "Users can view their own career paths"
ON public.career_paths FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career paths"
ON public.career_paths FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career paths"
ON public.career_paths FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own career paths"
ON public.career_paths FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for user_photos
CREATE POLICY "Users can view their own photos"
ON public.user_photos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own photos"
ON public.user_photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
ON public.user_photos FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cvs', 'cvs', false);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-photos', 'user-photos', false);

-- Storage policies for CVs
CREATE POLICY "Users can upload their own CVs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own CVs"
ON storage.objects FOR SELECT
USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for photos
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_career_paths_updated_at
BEFORE UPDATE ON public.career_paths
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();