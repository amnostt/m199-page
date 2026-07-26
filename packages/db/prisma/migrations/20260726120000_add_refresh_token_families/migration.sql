-- Durable refresh-family state is additive and preserves all existing
-- RefreshSession rows. Legacy rows cannot be safely backfilled because their
-- opaque tokens contain no signed family lineage.

CREATE TYPE "RefreshFamilyStatus" AS ENUM ('ACTIVE', 'TERMINATED');

CREATE TYPE "RefreshOperationStatus" AS ENUM ('COMPLETED', 'INVALIDATED');

CREATE TABLE "RefreshFamily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RefreshFamilyStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentVersion" INTEGER NOT NULL,
    "currentTokenHash" TEXT NOT NULL,
    "encryptedCurrentToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "terminalAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshFamily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshOperation" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "presentedVersion" INTEGER NOT NULL,
    "presentedJti" TEXT NOT NULL,
    "presentedIssuedByOperationId" TEXT NOT NULL,
    "presentedProofHash" TEXT NOT NULL,
    "childVersion" INTEGER NOT NULL,
    "encryptedResult" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "replayUntil" TIMESTAMP(3) NOT NULL,
    "status" "RefreshOperationStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshFamily_currentTokenHash_key"
    ON "RefreshFamily"("currentTokenHash");
CREATE INDEX "RefreshFamily_userId_status_idx"
    ON "RefreshFamily"("userId", "status");
CREATE INDEX "RefreshFamily_status_expiresAt_idx"
    ON "RefreshFamily"("status", "expiresAt");

CREATE UNIQUE INDEX "RefreshOperation_familyId_operationId_key"
    ON "RefreshOperation"("familyId", "operationId");
CREATE UNIQUE INDEX "RefreshOperation_familyId_presentedVersion_key"
    ON "RefreshOperation"("familyId", "presentedVersion");
CREATE INDEX "RefreshOperation_familyId_childVersion_idx"
    ON "RefreshOperation"("familyId", "childVersion");
CREATE INDEX "RefreshOperation_familyId_replayUntil_idx"
    ON "RefreshOperation"("familyId", "replayUntil");

ALTER TABLE "RefreshFamily"
    ADD CONSTRAINT "RefreshFamily_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "ResponsibleUser"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RefreshOperation"
    ADD CONSTRAINT "RefreshOperation_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "RefreshFamily"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
