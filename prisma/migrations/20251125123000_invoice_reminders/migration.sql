-- Add lastReminderSentAt to Invoice
ALTER TABLE "Invoice" ADD COLUMN "lastReminderSentAt" TIMESTAMP(3);
