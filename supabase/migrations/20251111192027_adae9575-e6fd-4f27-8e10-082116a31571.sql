-- Create access codes table
CREATE TABLE public.access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can view unused codes (to validate)
CREATE POLICY "Anyone can view unused codes"
ON public.access_codes
FOR SELECT
USING (used = false);

-- Anyone can update codes to mark as used (we'll handle this in the app logic)
CREATE POLICY "Anyone can mark codes as used"
ON public.access_codes
FOR UPDATE
USING (used = false);

-- Insert 100 unique access codes
INSERT INTO public.access_codes (code) VALUES
('naru1'), ('naru2'), ('naru3'), ('naru4'), ('naru5'),
('naru6'), ('naru7'), ('naru8'), ('naru9'), ('naru10'),
('naru11'), ('naru12'), ('naru13'), ('naru14'), ('naru15'),
('naru16'), ('naru17'), ('naru18'), ('naru19'), ('naru20'),
('naru21'), ('naru22'), ('naru23'), ('naru24'), ('naru25'),
('naru26'), ('naru27'), ('naru28'), ('naru29'), ('naru30'),
('naru31'), ('naru32'), ('naru33'), ('naru34'), ('naru35'),
('naru36'), ('naru37'), ('naru38'), ('naru39'), ('naru40'),
('naru41'), ('naru42'), ('naru43'), ('naru44'), ('naru45'),
('naru46'), ('naru47'), ('naru48'), ('naru49'), ('naru50'),
('naru51'), ('naru52'), ('naru53'), ('naru54'), ('naru55'),
('naru56'), ('naru57'), ('naru58'), ('naru59'), ('naru60'),
('naru61'), ('naru62'), ('naru63'), ('naru64'), ('naru65'),
('naru66'), ('naru67'), ('naru68'), ('naru69'), ('naru70'),
('naru71'), ('naru72'), ('naru73'), ('naru74'), ('naru75'),
('naru76'), ('naru77'), ('naru78'), ('naru79'), ('naru80'),
('naru81'), ('naru82'), ('naru83'), ('naru84'), ('naru85'),
('naru86'), ('naru87'), ('naru88'), ('naru89'), ('naru90'),
('naru91'), ('naru92'), ('naru93'), ('naru94'), ('naru95'),
('naru96'), ('naru97'), ('naru98'), ('naru99'), ('naru100'),
('become');