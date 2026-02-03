-- CreateTable
CREATE TABLE "StripeWebhookEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "endpointId" TEXT,
    "signingSecret" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "enableVideo" BOOLEAN NOT NULL DEFAULT true,
    "videoLink" TEXT,
    "enablePhone" BOOLEAN NOT NULL DEFAULT true,
    "phoneNumber" TEXT,
    "enableInPerson" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "companyName" TEXT,
    "logoDataUrl" TEXT,
    "signatureDataUrl" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "planTier" TEXT NOT NULL DEFAULT 'FREE',
    "role" TEXT NOT NULL DEFAULT 'USER',
    "position" TEXT,
    "positionId" TEXT,
    "reportsToId" TEXT,
    "companyId" TEXT,
    "mailToAddressEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mailToAddressTo" TEXT,
    "stripeAccountId" TEXT,
    "stripePublishableKey" TEXT,
    "venmoHandle" TEXT,
    "zelleHandle" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "trackdriveLeadToken" TEXT,
    "trackdriveLeadEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pro_trial_ends_at" DATETIME,
    "proTrialReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "defaultPaymentMethodId" TEXT,
    "subscriptionCancelAt" DATETIME,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "inviteToken" TEXT,
    "inviteTokenExpires" DATETIME,
    "googleCalendarConnected" BOOLEAN NOT NULL DEFAULT false,
    "googleRefreshToken" TEXT,
    "googleAccessToken" TEXT,
    "googleTokenExpiresAt" DATETIME,
    "googleCalendarEmail" TEXT,
    "googleWatchChannelId" TEXT,
    "googleWatchResourceId" TEXT,
    "googleWatchExpiration" DATETIME,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "User_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "status" TEXT NOT NULL DEFAULT 'new',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT,
    CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "convertedFromLead" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "status" TEXT,
    "isLead" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "quickbooksId" TEXT,
    CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Client_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "feeAmount" REAL,
    "netAmount" REAL,
    "refundedAmount" REAL NOT NULL DEFAULT 0,
    "paidAt" DATETIME,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeBalanceTransactionId" TEXT,
    "lastError" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "paidAt" DATETIME,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subTotal" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "amountRefunded" REAL NOT NULL DEFAULT 0,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "shortCode" TEXT,
    "lastReminderSentAt" DATETIME,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "quickbooksId" TEXT,
    "quickbooksSyncedAt" DATETIME,
    "quickbooksSyncError" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringInterval" TEXT,
    "recurringDayOfMonth" INTEGER,
    "recurringDayOfWeek" INTEGER,
    "nextOccurrence" DATETIME,
    "parentInvoiceId" TEXT,
    "recurringParentId" TEXT,
    "proposalId" TEXT,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_parentInvoiceId_fkey" FOREIGN KEY ("parentInvoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_recurringParentId_fkey" FOREIGN KEY ("recurringParentId") REFERENCES "RecurringInvoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "nextSendDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sendFirstNow" BOOLEAN NOT NULL DEFAULT true,
    "firstPaidAt" DATETIME,
    "autoPayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripePaymentMethodId" TEXT,
    "stripeCustomerId" TEXT,
    "lastPaymentError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "type" TEXT NOT NULL DEFAULT 'PROPOSAL',
    "total" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lineItems" JSONB NOT NULL,
    "notes" TEXT,
    "validUntil" DATETIME,
    "taxRate" REAL,
    "signedAt" DATETIME,
    "signedById" TEXT,
    "signatureUrl" TEXT,
    "completedAt" DATETIME,
    "pdfUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "invoiceId" TEXT,
    CONSTRAINT "Proposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Proposal_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT,
    "validUntil" DATETIME,
    "notes" TEXT,
    "lineItems" JSONB,
    "total" REAL,
    "currency" TEXT DEFAULT 'USD',
    "taxRate" REAL,
    "terms" TEXT NOT NULL,
    "paymentMilestones" JSONB,
    "timeline" JSONB,
    "revisionsIncluded" INTEGER,
    "additionalRevisionRate" REAL,
    "ipOwnership" TEXT,
    "cancellationTerms" TEXT,
    "liabilityCap" REAL,
    "governingLaw" TEXT,
    "disputeResolution" TEXT,
    "status" TEXT NOT NULL,
    "signedAt" DATETIME,
    "signedById" TEXT,
    "signatureUrl" TEXT,
    "completedAt" DATETIME,
    "pdfUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "endpoint" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "companyId" TEXT,
    "p256dh" TEXT,
    "auth" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PushSubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientPortalUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "email" TEXT,
    "portalToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientPortalUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'My Business',
    "logoUrl" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "hasCustomDomain" BOOLEAN NOT NULL DEFAULT false,
    "iconUrl" TEXT,
    "industry" TEXT,
    "isWhiteLabelEligible" BOOLEAN NOT NULL DEFAULT false,
    "slogan" TEXT,
    "stripeAccountId" TEXT,
    "stripePublishableKey" TEXT,
    "stripeAccountType" TEXT,
    "stripeWebhookMode" TEXT,
    "stripeWebhookStatus" TEXT,
    "stripeWebhookLastError" TEXT,
    "stripeWebhookPlatformManaged" BOOLEAN,
    "venmoHandle" TEXT,
    "zelleHandle" TEXT,
    "mailToAddressEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mailToAddressTo" TEXT,
    "trackdriveLeadToken" TEXT,
    "trackdriveLeadEnabled" BOOLEAN NOT NULL DEFAULT false,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'USA',
    "primaryColor" TEXT NOT NULL DEFAULT '#1d4ed8',
    "useHeaderLogo" BOOLEAN NOT NULL DEFAULT false,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "revenueGoalMonthly" REAL,
    "revenueGoalQuarterly" REAL,
    "revenueGoalYearly" REAL,
    "quickbooksRealmId" TEXT,
    "quickbooksAccessToken" TEXT,
    "quickbooksRefreshToken" TEXT,
    "quickbooksTokenExpiry" DATETIME,
    "quickbooksConnected" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Position_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "features" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "unitAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "interval" TEXT,
    "intervalCount" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "visibleToRoles" TEXT NOT NULL,
    "visibleToPositions" TEXT NOT NULL,
    "requiresAcknowledgment" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceAcknowledgment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceAcknowledgment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceAcknowledgment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "buffer" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "fileUrl" TEXT,
    "toAll" BOOLEAN NOT NULL DEFAULT false,
    "toRoles" TEXT NOT NULL,
    "toPositions" TEXT NOT NULL,
    "toUserIds" TEXT NOT NULL,
    "contextType" TEXT,
    "contextId" TEXT,
    "participants" TEXT NOT NULL,
    "parentId" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailChangeToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailChangeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "value" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT NOT NULL DEFAULT 'prospect',
    "pipelineId" TEXT NOT NULL DEFAULT 'default',
    "assignedToId" TEXT NOT NULL,
    "estimatedCloseDate" DATETIME,
    "actualCloseDate" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'direct',
    "tags" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "nextActionDate" DATETIME,
    "nextAction" TEXT,
    "notes" TEXT,
    "customFields" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastActivityDate" DATETIME,
    CONSTRAINT "Opportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ReadMessages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ReadMessages_A_fkey" FOREIGN KEY ("A") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ReadMessages_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhookEndpoint_accountId_key" ON "StripeWebhookEndpoint"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_clientId_key" ON "Lead"("clientId");

-- CreateIndex
CREATE INDEX "Lead_companyId_idx" ON "Lead"("companyId");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE INDEX "Client_assignedToId_idx" ON "Client"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeCheckoutSessionId_key" ON "Payment"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Payment_clientId_idx" ON "Payment"("clientId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_shortCode_key" ON "Invoice"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_proposalId_key" ON "Invoice"("proposalId");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_parentInvoiceId_idx" ON "Invoice"("parentInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "RecurringInvoice_userId_idx" ON "RecurringInvoice"("userId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_clientId_idx" ON "RecurringInvoice"("clientId");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_invoiceId_key" ON "Proposal"("invoiceId");

-- CreateIndex
CREATE INDEX "Proposal_userId_idx" ON "Proposal"("userId");

-- CreateIndex
CREATE INDEX "Proposal_clientId_idx" ON "Proposal"("clientId");

-- CreateIndex
CREATE INDEX "Proposal_invoiceId_idx" ON "Proposal"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_proposalId_key" ON "Contract"("proposalId");

-- CreateIndex
CREATE INDEX "Contract_userId_idx" ON "Contract"("userId");

-- CreateIndex
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");

-- CreateIndex
CREATE INDEX "Contract_proposalId_idx" ON "Contract"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_token_key" ON "MagicLink"("token");

-- CreateIndex
CREATE INDEX "MagicLink_email_idx" ON "MagicLink"("email");

-- CreateIndex
CREATE INDEX "MagicLink_token_idx" ON "MagicLink"("token");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "PushSubscription_companyId_idx" ON "PushSubscription"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalUser_clientId_key" ON "ClientPortalUser"("clientId");

-- CreateIndex
CREATE INDEX "ClientPortalUser_clientId_idx" ON "ClientPortalUser"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_ownerId_key" ON "Company"("ownerId");

-- CreateIndex
CREATE INDEX "Position_companyId_order_idx" ON "Position"("companyId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Position_companyId_name_key" ON "Position"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_type_idx" ON "Product"("type");

-- CreateIndex
CREATE INDEX "Resource_companyId_idx" ON "Resource"("companyId");

-- CreateIndex
CREATE INDEX "Resource_requiresAcknowledgment_idx" ON "Resource"("requiresAcknowledgment");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceAcknowledgment_resourceId_userId_key" ON "ResourceAcknowledgment"("resourceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_userId_dayOfWeek_key" ON "Availability"("userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_startTime_idx" ON "Booking"("startTime");

-- CreateIndex
CREATE INDEX "Message_contextType_contextId_idx" ON "Message"("contextType", "contextId");

-- CreateIndex
CREATE INDEX "Message_companyId_idx" ON "Message"("companyId");

-- CreateIndex
CREATE INDEX "Message_fromId_idx" ON "Message"("fromId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeToken_token_key" ON "EmailChangeToken"("token");

-- CreateIndex
CREATE INDEX "EmailChangeToken_userId_idx" ON "EmailChangeToken"("userId");

-- CreateIndex
CREATE INDEX "Opportunity_userId_idx" ON "Opportunity"("userId");

-- CreateIndex
CREATE INDEX "Opportunity_clientId_idx" ON "Opportunity"("clientId");

-- CreateIndex
CREATE INDEX "Opportunity_assignedToId_idx" ON "Opportunity"("assignedToId");

-- CreateIndex
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");

-- CreateIndex
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");

-- CreateIndex
CREATE INDEX "Opportunity_estimatedCloseDate_idx" ON "Opportunity"("estimatedCloseDate");

-- CreateIndex
CREATE UNIQUE INDEX "_ReadMessages_AB_unique" ON "_ReadMessages"("A", "B");

-- CreateIndex
CREATE INDEX "_ReadMessages_B_index" ON "_ReadMessages"("B");
