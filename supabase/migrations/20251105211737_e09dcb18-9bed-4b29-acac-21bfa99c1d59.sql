-- Update oracle badge to require mastering 1 path instead of 10
UPDATE badges 
SET 
  requirement_count = 1,
  description = 'Mastered 1 path'
WHERE name = 'Oracle';