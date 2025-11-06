-- Update Oracle badge to have a special requirement type for complex conditions
UPDATE badges 
SET 
  requirement_type = 'oracle_mastery',
  requirement_count = 180,
  description = 'Mastered a path with 6-month streak and AI guidance'
WHERE name = 'Oracle';