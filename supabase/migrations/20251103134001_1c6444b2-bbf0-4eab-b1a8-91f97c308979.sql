-- Add active_path_id to user_profiles to track activated career path
ALTER TABLE user_profiles
ADD COLUMN active_path_id UUID REFERENCES career_paths(id) ON DELETE SET NULL;

COMMENT ON COLUMN user_profiles.active_path_id IS 'The currently activated career path for action tracking';