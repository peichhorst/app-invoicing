DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'PARTIALLY_REFUNDED' AND enumtypid = '\"InvoiceStatus\"'::regtype
  ) THEN
    ALTER TYPE "InvoiceStatus" ADD VALUE 'PARTIALLY_REFUNDED';
  END IF;
END
$do$

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'REFUNDED' AND enumtypid = '\"InvoiceStatus\"'::regtype
  ) THEN
    ALTER TYPE "InvoiceStatus" ADD VALUE 'REFUNDED';
  END IF;
END
$do$
