-- Create ClientPortalUser table
CREATE TABLE "ClientPortalUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL UNIQUE,
    "email" TEXT,
    "portalToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "ClientPortalUser_clientId_key" ON "ClientPortalUser"("clientId");

ALTER TABLE "ClientPortalUser"
    ADD CONSTRAINT "ClientPortalUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
