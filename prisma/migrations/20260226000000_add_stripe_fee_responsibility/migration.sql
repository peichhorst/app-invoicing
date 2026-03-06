DO $$ BEGIN
  CREATE TYPE "StripeFeeResponsibility" AS ENUM ('business_absorbs', 'client_pays');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Company"
ADD COLUMN IF NOT EXISTS "stripeFeeResponsibility" "StripeFeeResponsibility" NOT NULL DEFAULT 'business_absorbs';
