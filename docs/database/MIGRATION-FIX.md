# Regenerate Migrations for PostgreSQL

## Problem
The initial migrations were created with SQLite syntax, causing schema drift and errors in production PostgreSQL database.

## Solution Options

### Option 1: Use `db push` (Quick Fix - Recommended)
Bypass migrations entirely and force-sync schema to production:

```bash
cd ~/projects/app-invoicing
npx prisma db push --skip-generate
```

This will:
- Compare schema.prisma with production database
- Generate and apply ALTER statements
- Fix the missing `participants` column and other schema drift

### Option 2: Regenerate Migrations (Clean Slate)
⚠️ **DANGER**: Resets migration history. Only do this if you can rebuild production database.

```bash
cd ~/projects/app-invoicing
bash scripts/regenerate-migrations-for-postgres.sh
```

### Option 3: Manual SQL Fix (Surgical)
Run directly in Supabase SQL Editor:

```sql
-- Add missing columns
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "toRoles" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "toPositions" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "toUserIds" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "participants" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMPTZ;

-- Update migration tracking (if migration table exists)
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  'manual_fix',
  now(),
  '20260208_manual_schema_fix',
  'Manually added missing columns',
  NULL,
  now(),
  1
) ON CONFLICT DO NOTHING;
```

Usage Example
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Message'
  AND column_name IN ('toRoles', 'toPositions', 'toUserIds', 'participants');
```

## Recommended Approach
Try **Option 1** first. It's the safest and fastest way to sync your production database without losing data or migration history.
