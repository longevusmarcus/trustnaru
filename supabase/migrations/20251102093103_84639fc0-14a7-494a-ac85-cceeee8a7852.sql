-- Add column to store all generated image variations
ALTER TABLE career_paths ADD COLUMN IF NOT EXISTS all_images TEXT[];