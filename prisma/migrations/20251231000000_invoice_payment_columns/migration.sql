ALTER TABLE "Invoice"
  ADD COLUMN "amountPaid" REAL NOT NULL DEFAULT 0,
  ADD COLUMN "amountRefunded" REAL NOT NULL DEFAULT 0,
  ADD COLUMN "stripePaymentIntentId" TEXT,
  ADD COLUMN "stripeChargeId" TEXT;
