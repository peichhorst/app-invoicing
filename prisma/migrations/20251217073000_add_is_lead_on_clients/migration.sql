-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "isLead" BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing rows to clients (set to false)
UPDATE "Client" SET "isLead" = false WHERE "isLead" IS NOT NULL;
