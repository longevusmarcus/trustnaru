-- Add roadmap and affirmations columns to career_paths table
ALTER TABLE career_paths
ADD COLUMN roadmap JSONB DEFAULT '[]'::jsonb,
ADD COLUMN affirmations TEXT[] DEFAULT '{}';

COMMENT ON COLUMN career_paths.roadmap IS 'Array of roadmap steps with title and duration';
COMMENT ON COLUMN career_paths.affirmations IS 'Array of personalized affirmation statements';