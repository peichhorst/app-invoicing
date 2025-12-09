-- manual migration to restore dropped columns/tables
ALTER TABLE "User"
  ADD COLUMN "planTier" TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN "stripeAccountId" TEXT,
  ADD COLUMN "stripePublishableKey" TEXT,
  ADD COLUMN "venmoHandle" TEXT,
  ADD COLUMN "zelleHandle" TEXT,
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User" ("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeSubscriptionId_key" ON "User" ("stripeSubscriptionId");

ALTER TABLE "Invoice"
  ADD COLUMN "sentCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shortCode" TEXT,
  ADD COLUMN "lastReminderSentAt" TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_shortCode_key" ON "Invoice" ("shortCode");

CREATE TABLE IF NOT EXISTS "ClientPortalUser" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL UNIQUE,
  "email" TEXT,
  "portalToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT "ClientPortalUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClientPortalUser_clientId_index" ON "ClientPortalUser" ("clientId");
