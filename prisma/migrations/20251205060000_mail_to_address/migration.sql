ALTER TABLE "User"
ADD COLUMN "mailToAddressEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mailToAddressTo" TEXT;
