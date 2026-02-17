-- Emergency fix for production database schema
-- Run this in Supabase SQL Editor if participants column is missing

-- Check if participants column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Message' AND column_name = 'participants'
    ) THEN
        ALTER TABLE "Message" ADD COLUMN "participants" TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added participants column';
    ELSE
        RAISE NOTICE 'participants column already exists';
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Message'
ORDER BY ordinal_position;
