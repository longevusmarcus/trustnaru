-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to mentors table
ALTER TABLE public.mentors 
ADD COLUMN IF NOT EXISTS mentor_embedding vector(768);

-- Add embedding column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS profile_embedding vector(768);

-- Create index for fast similarity searches on mentors
CREATE INDEX IF NOT EXISTS mentors_embedding_idx 
ON public.mentors 
USING ivfflat (mentor_embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for fast similarity searches on user profiles
CREATE INDEX IF NOT EXISTS user_profiles_embedding_idx 
ON public.user_profiles 
USING ivfflat (profile_embedding vector_cosine_ops)
WITH (lists = 100);

-- Create RPC function for happenstance search
CREATE OR REPLACE FUNCTION public.happenstance_search_mentors(
  p_user_id uuid,
  p_query_embedding vector(768),
  p_limit int DEFAULT 7
)
RETURNS TABLE (
  mentor_id uuid,
  name text,
  title text,
  company text,
  headline text,
  location text,
  industry text,
  key_skills text[],
  profile_url text,
  profile_image_url text,
  matched_signals text[],
  relevance_score float
)
LANGUAGE sql
AS $$
  SELECT
    m.id as mentor_id,
    m.name,
    m.title,
    m.company,
    m.headline,
    m.location,
    m.industry,
    m.key_skills,
    m.profile_url,
    m.profile_image_url,
    ARRAY[
      CASE
        WHEN m.category IS NOT NULL THEN m.category
        ELSE NULL
      END,
      CASE
        WHEN m.industry IS NOT NULL THEN m.industry || ' industry'
        ELSE NULL
      END,
      CASE
        WHEN m.location IS NOT NULL THEN 'based in ' || m.location
        ELSE NULL
      END
    ]::text[] as matched_signals,
    1 - (m.mentor_embedding <=> p_query_embedding) as relevance_score
  FROM public.mentors m
  WHERE m.mentor_embedding IS NOT NULL
  ORDER BY m.mentor_embedding <-> p_query_embedding
  LIMIT p_limit;
$$;