-- Add RLS policies for user-photos storage bucket
CREATE POLICY "Users can view their own photos in storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can insert their own photos in storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own photos in storage"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own photos in storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);