-- Add user feedback column to career_paths table
ALTER TABLE career_paths 
ADD COLUMN user_feedback text CHECK (user_feedback IN ('up', 'down'));