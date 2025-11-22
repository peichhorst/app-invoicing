-- Make invoice numbers unique per user instead of globally

-- Drop the global unique constraint
DROP INDEX IF EXISTS "Invoice_invoiceNumber_key";

-- Add a composite unique constraint on userId + invoiceNumber
CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");
