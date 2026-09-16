-- Replace manual activity lifecycle fields with one civil date and migrate the
-- featured image scalar into the ordered publication image relation.

BEGIN;

-- Remove checks that depend on the legacy activity columns before reshaping
-- Publication. The publishedAt invariant remains unchanged.
ALTER TABLE "Publication"
  DROP CONSTRAINT IF EXISTS "Publication_post_activity_fields_null";
ALTER TABLE "Publication"
  DROP CONSTRAINT IF EXISTS "Publication_activity_required_fields";
ALTER TABLE "Publication"
  DROP CONSTRAINT IF EXISTS "Publication_endDate_after_startDate";

-- PostgreSQL DATE keeps the stored civil calendar day without introducing a
-- server-timezone conversion. Existing POST rows remain NULL.
ALTER TABLE "Publication" ADD COLUMN "activityDate" DATE;
UPDATE "Publication"
SET "activityDate" = "startDate"::date
WHERE "type" IN ('OUTING', 'EVENT');

-- Preserve every current featured image at position zero before removing the
-- scalar source of truth.
CREATE TABLE "PublicationImage" (
  "publicationId" TEXT NOT NULL,
  "fileAssetId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicationImage_pkey" PRIMARY KEY ("publicationId", "fileAssetId")
);
CREATE UNIQUE INDEX "PublicationImage_publicationId_position_key"
  ON "PublicationImage"("publicationId", "position");
CREATE INDEX "PublicationImage_fileAssetId_idx"
  ON "PublicationImage"("fileAssetId");

INSERT INTO "PublicationImage" ("publicationId", "fileAssetId", "position")
SELECT "id", "featuredImageId", 0
FROM "Publication";

ALTER TABLE "PublicationImage"
  ADD CONSTRAINT "PublicationImage_publicationId_fkey"
  FOREIGN KEY ("publicationId") REFERENCES "Publication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicationImage"
  ADD CONSTRAINT "PublicationImage_fileAssetId_fkey"
  FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Publication"
  DROP CONSTRAINT IF EXISTS "Publication_featuredImageId_fkey";
ALTER TABLE "Publication"
  DROP COLUMN "featuredImageId",
  DROP COLUMN "startDate",
  DROP COLUMN "endDate",
  DROP COLUMN "activityStatus",
  DROP COLUMN "documentationStatus";

DROP TYPE "ActivityStatus";
DROP TYPE "DocumentationStatus";

ALTER TABLE "Publication"
  ADD CONSTRAINT "Publication_post_activity_date_null"
  CHECK ("type" <> 'POST' OR "activityDate" IS NULL);
ALTER TABLE "Publication"
  ADD CONSTRAINT "Publication_activity_date_required"
  CHECK ("type" = 'POST' OR "activityDate" IS NOT NULL);

COMMIT;
