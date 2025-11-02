-- Add display_name to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;