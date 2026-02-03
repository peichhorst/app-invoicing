-- Migration script to move QuickBooks data from User to Company
-- Run this BEFORE applying the schema changes

-- Copy QB data from users to their companies
UPDATE "Company" c
SET 
  "quickbooksRealmId" = u."quickbooksRealmId",
  "quickbooksAccessToken" = u."quickbooksAccessToken",
  "quickbooksRefreshToken" = u."quickbooksRefreshToken",
  "quickbooksTokenExpiry" = u."quickbooksTokenExpiry",
  "quickbooksConnected" = u."quickbooksConnected"
FROM "User" u
WHERE u."companyId" = c."id"
  AND u."quickbooksConnected" = true
  AND c."quickbooksConnected" IS NULL;

-- For users without a company (edge case), do nothing
-- They will lose QB connection but that's expected when moving to company-level
