-- Add onboarding_completed field to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;