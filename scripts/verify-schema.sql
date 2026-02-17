-- Run this in Supabase SQL Editor to verify the schema
-- Check if participants column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'Message'
ORDER BY ordinal_position;
