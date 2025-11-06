-- Add current_level to user_stats table
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS current_level integer NOT NULL DEFAULT 1;

-- Add constraint to ensure level is between 1 and 10
ALTER TABLE public.user_stats ADD CONSTRAINT level_range CHECK (current_level >= 1 AND current_level <= 10);