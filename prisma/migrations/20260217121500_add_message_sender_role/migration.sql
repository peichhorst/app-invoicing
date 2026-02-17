-- Add missing Message.senderRole column to align production DB with Prisma schema.
ALTER TABLE "Message"
ADD COLUMN IF NOT EXISTS "senderRole" TEXT;
