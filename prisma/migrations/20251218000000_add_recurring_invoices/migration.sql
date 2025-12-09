ALTER TABLE "Invoice"
ADD COLUMN "recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "recurringInterval" TEXT,
ADD COLUMN "recurringDayOfMonth" INTEGER,
ADD COLUMN "recurringDayOfWeek" INTEGER,
ADD COLUMN "nextOccurrence" TIMESTAMP(3),
ADD COLUMN "parentInvoiceId" TEXT;

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_parentInvoiceId_fkey"
FOREIGN KEY ("parentInvoiceId")
REFERENCES "Invoice" ("id")
ON DELETE NO ACTION;

CREATE INDEX "Invoice_parentInvoiceId_index" ON "Invoice" ("parentInvoiceId");
