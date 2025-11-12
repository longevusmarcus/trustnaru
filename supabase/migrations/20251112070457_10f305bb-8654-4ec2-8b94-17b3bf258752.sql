-- Drop existing restrictive policy and create a more flexible one
DROP POLICY IF EXISTS "Anyone can mark codes as used" ON public.access_codes;

-- Allow authenticated users to mark codes as used
CREATE POLICY "Authenticated users can mark codes as used"
ON public.access_codes
FOR UPDATE
TO authenticated
USING (used = false)
WITH CHECK (used = true);