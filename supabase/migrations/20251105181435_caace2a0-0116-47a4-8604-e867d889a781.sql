
-- Add display_order column to badges table
ALTER TABLE badges ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Update display order for existing badges
UPDATE badges SET display_order = 1 WHERE name = 'Visionary';
UPDATE badges SET display_order = 2 WHERE name = 'Seeker';
UPDATE badges SET display_order = 3 WHERE name = 'Oracle';
UPDATE badges SET display_order = 4 WHERE name = 'Initiate';
UPDATE badges SET display_order = 5 WHERE name = 'Sage';
UPDATE badges SET display_order = 6 WHERE name = 'Luminary';
