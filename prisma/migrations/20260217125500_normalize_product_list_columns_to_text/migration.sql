-- Align Product list columns with Prisma schema (TEXT, JSON-string encoded).
-- Some environments drifted to TEXT[] which breaks product create/update payloads.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Product'
      AND column_name = 'features'
      AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE "Product"
    ALTER COLUMN "features" TYPE TEXT
    USING to_json("features")::text;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Product'
      AND column_name = 'tags'
      AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE "Product"
    ALTER COLUMN "tags" TYPE TEXT
    USING to_json("tags")::text;
  END IF;
END $$;
