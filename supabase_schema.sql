-- Schema for Supabase based on Prisma schema

-- Extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tables

CREATE TABLE "StripeWebhookEndpoint" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "accountId" TEXT UNIQUE NOT NULL,
  "endpointId" TEXT,
  "signingSecret" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "enableVideo" BOOLEAN DEFAULT true,
  "videoLink" TEXT,
  "enablePhone" BOOLEAN DEFAULT true,
  "phoneNumber" TEXT,
  "enableInPerson" BOOLEAN DEFAULT false,
  "location" TEXT,
  "timezone" TEXT DEFAULT 'America/Los_Angeles',
  "companyName" TEXT,
  "logoDataUrl" TEXT,
  "signatureDataUrl" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "planTier" TEXT DEFAULT 'FREE',
  "role" TEXT DEFAULT 'USER', -- Assuming 'Role' enum values
  "position" TEXT, -- Assuming 'CompanyPosition' enum values
  "positionId" TEXT,
  "reportsToId" TEXT,
  "companyId" TEXT,
  "mailToAddressEnabled" BOOLEAN DEFAULT false,
  "mailToAddressTo" TEXT,
  "stripeAccountId" TEXT,
  "stripePublishableKey" TEXT,
  "venmoHandle" TEXT,
  "zelleHandle" TEXT,
  "stripeCustomerId" TEXT UNIQUE,
  "stripeSubscriptionId" TEXT UNIQUE,
  "trackdriveLeadToken" TEXT,
  "trackdriveLeadEnabled" BOOLEAN DEFAULT false,
  "pro_trial_ends_at" TIMESTAMP WITH TIME ZONE,
  "proTrialReminderSent" BOOLEAN DEFAULT false,
  "defaultPaymentMethodId" TEXT,
  "subscriptionCancelAt" TIMESTAMP WITH TIME ZONE,
  "isConfirmed" BOOLEAN DEFAULT false,
  "inviteToken" TEXT,
  "inviteTokenExpires" TIMESTAMP WITH TIME ZONE,
  "googleCalendarConnected" BOOLEAN DEFAULT false,
  "googleRefreshToken" TEXT,
  "googleAccessToken" TEXT,
  "googleTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
  "googleCalendarEmail" TEXT,
  "googleWatchChannelId" TEXT,
  "googleWatchResourceId" TEXT,
  "googleWatchExpiration" TIMESTAMP WITH TIME ZONE,
  "isOnboarded" BOOLEAN DEFAULT false
);

CREATE TABLE "Company" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT DEFAULT 'My Business',
  "logoUrl" TEXT,
  "website" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "hasCustomDomain" BOOLEAN DEFAULT false,
  "iconUrl" TEXT,
  "industry" TEXT,
  "isWhiteLabelEligible" BOOLEAN DEFAULT false,
  "slogan" TEXT,
  "stripeAccountId" TEXT,
  "stripePublishableKey" TEXT,
  "stripeAccountType" TEXT, -- Assuming 'StripeAccountType' enum values
  "stripeWebhookMode" TEXT, -- Assuming 'StripeWebhookMode' enum values
  "stripeWebhookStatus" TEXT, -- Assuming 'StripeWebhookStatus' enum values
  "stripeWebhookLastError" TEXT,
  "stripeWebhookPlatformManaged" BOOLEAN,
  "venmoHandle" TEXT,
  "zelleHandle" TEXT,
  "mailToAddressEnabled" BOOLEAN DEFAULT false,
  "mailToAddressTo" TEXT,
  "trackdriveLeadToken" TEXT,
  "trackdriveLeadEnabled" BOOLEAN DEFAULT false,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postalCode" TEXT,
  "country" TEXT DEFAULT 'USA',
  "primaryColor" TEXT DEFAULT '#1d4ed8',
  "useHeaderLogo" BOOLEAN DEFAULT false,
  "isOnboarded" BOOLEAN DEFAULT false,
  "revenueGoalMonthly" DECIMAL,
  "revenueGoalQuarterly" DECIMAL,
  "revenueGoalYearly" DECIMAL,
  "quickbooksRealmId" TEXT,
  "quickbooksAccessToken" TEXT,
  "quickbooksRefreshToken" TEXT,
  "quickbooksTokenExpiry" TIMESTAMP WITH TIME ZONE,
  "quickbooksConnected" BOOLEAN DEFAULT false,
  "ownerId" TEXT UNIQUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE "Lead" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "assignedToId" TEXT,
  "name" TEXT,
  "email" TEXT,
  "website" TEXT,
  "phone" TEXT,
  "companyName" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postalCode" TEXT,
  "country" TEXT,
  "source" TEXT,
  "notes" TEXT,
  "status" TEXT DEFAULT 'new',
  "archived" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "clientId" TEXT UNIQUE
);

CREATE TABLE "Client" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "assignedToId" TEXT,
  "companyName" TEXT,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postalCode" TEXT,
  "country" TEXT,
  "notes" TEXT,
  "convertedFromLead" BOOLEAN DEFAULT false,
  "source" TEXT,
  "status" TEXT,
  "isLead" BOOLEAN DEFAULT true,
  "archived" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "quickbooksId" TEXT
);

-- Add more tables following the same pattern...

-- Foreign Key Constraints
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;