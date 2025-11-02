-- Create storage bucket for generated career path images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'career-images',
  'career-images',
  true,
  10485760, -- 10MB limit per image
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for career-images bucket
CREATE POLICY "Users can upload their career images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'career-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their career images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'career-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view career images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'career-images');

CREATE POLICY "Users can delete their career images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'career-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);