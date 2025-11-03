-- Add DELETE policy to user_profiles table
-- This allows users to delete their own profile data (display names, CV URLs, voice transcriptions, wizard data)
-- Required for GDPR compliance and user privacy rights

CREATE POLICY "Users can delete their own profile"
ON public.user_profiles
FOR DELETE
USING (auth.uid() = user_id);