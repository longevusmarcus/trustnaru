-- Add typical_day_routine column to career_paths table
ALTER TABLE public.career_paths 
ADD COLUMN IF NOT EXISTS typical_day_routine text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.career_paths.typical_day_routine IS 'Array of typical daily activities and routines for this career path';