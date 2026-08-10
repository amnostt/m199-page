-- Mission/Publication domain reset (Slice 1). Destructive transactional
-- migration: legacy Post/Outing graph removed in favor of approved
-- Mission/Publication/PublicationMission foundation. App is unpublished.

BEGIN;

-- Drop legacy FK constraints referencing Post/Outing/FeaturedPost.
ALTER TABLE "LandingSettings" DROP CONSTRAINT IF EXISTS "LandingSettings_featuredOutingId_fkey";
DROP INDEX IF EXISTS "LandingSettings_featuredOutingId_key";
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_coverImageId_fkey";
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_createdById_fkey";
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_publishedAt_required";
ALTER TABLE "FeaturedPost" DROP CONSTRAINT IF EXISTS "FeaturedPost_postId_fkey";
ALTER TABLE "PostDownload" DROP CONSTRAINT IF EXISTS "PostDownload_postId_fkey";
ALTER TABLE "PostDownload" DROP CONSTRAINT IF EXISTS "PostDownload_fileId_fkey";
ALTER TABLE "Outing" DROP CONSTRAINT IF EXISTS "Outing_mainImageId_fkey";
ALTER TABLE "Outing" DROP CONSTRAINT IF EXISTS "Outing_croquisId_fkey";
ALTER TABLE "Outing" DROP CONSTRAINT IF EXISTS "Outing_planId_fkey";
ALTER TABLE "Outing" DROP CONSTRAINT IF EXISTS "Outing_createdById_fkey";
ALTER TABLE "OutingLike" DROP CONSTRAINT IF EXISTS "OutingLike_outingId_fkey";

-- Drop legacy indexes and tables.
DROP INDEX IF EXISTS "Outing_slug_key";
DROP INDEX IF EXISTS "Outing_status_dateTime_idx";
DROP INDEX IF EXISTS "Outing_createdById_idx";
DROP INDEX IF EXISTS "OutingLike_outingId_visitorHash_key";
DROP INDEX IF EXISTS "OutingLike_createdAt_idx";
DROP INDEX IF EXISTS "Post_slug_key";
DROP INDEX IF EXISTS "Post_status_publishedAt_idx";
DROP INDEX IF EXISTS "Post_tags_idx";
DROP INDEX IF EXISTS "Post_createdById_idx";
DROP INDEX IF EXISTS "FeaturedPost_slot_key";
DROP INDEX IF EXISTS "FeaturedPost_postId_key";
DROP INDEX IF EXISTS "FeaturedPost_featuredAt_idx";
DROP INDEX IF EXISTS "PostDownload_postId_fileId_key";
DROP INDEX IF EXISTS "PostDownload_postId_sortOrder_idx";

DROP TABLE IF EXISTS "OutingLike";
DROP TABLE IF EXISTS "FeaturedPost";
DROP TABLE IF EXISTS "PostDownload";
DROP TABLE IF EXISTS "Outing";
DROP TABLE IF EXISTS "Post";

ALTER TABLE "LandingSettings" DROP COLUMN IF EXISTS "featuredOutingId";

-- Recreate FileCategory with the approved vocabulary (legacy -> OTHER).
ALTER TABLE "FileAsset" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "FileAsset" ALTER COLUMN "category" TYPE TEXT USING "category"::text;
DROP TYPE IF EXISTS "FileCategory";

CREATE TYPE "FileCategory" AS ENUM (
  'MISSION_HERO',
  'PUBLICATION_FEATURED_IMAGE',
  'PUBLICATION_DOWNLOAD',
  'LANDING_HERO',
  'OTHER'
);

ALTER TABLE "FileAsset" ALTER COLUMN "category" TYPE "FileCategory" USING (
  CASE
    WHEN "category" = 'LANDING_HERO' THEN 'LANDING_HERO'::"FileCategory"
    ELSE 'OTHER'::"FileCategory"
  END
);
ALTER TABLE "FileAsset" ALTER COLUMN "category" SET DEFAULT 'OTHER';

-- Convert Verse.status, then drop legacy enums.
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');
ALTER TABLE "Verse" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Verse" ALTER COLUMN "status" TYPE "PublicationStatus" USING "status"::text::"PublicationStatus";
ALTER TABLE "Verse" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';

DROP TYPE IF EXISTS "ContentStatus";
DROP TYPE IF EXISTS "FeaturedPostSlot";

CREATE TYPE "MissionStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "PublicationType" AS ENUM ('POST', 'OUTING', 'EVENT');
CREATE TYPE "PublicationScope" AS ENUM ('GENERAL', 'MISSION');
CREATE TYPE "ActivityStatus" AS ENUM ('UPCOMING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DocumentationStatus" AS ENUM ('PENDING_DOCUMENTATION', 'DOCUMENTED');

-- Mission table. Image FK uses ON DELETE RESTRICT.
CREATE TABLE "Mission" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "heroImageId" TEXT NOT NULL,
  "heroPhrase" TEXT NOT NULL,
  "status" "MissionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Mission_slug_key" ON "Mission"("slug");
CREATE INDEX "Mission_status_idx" ON "Mission"("status");
ALTER TABLE "Mission"
  ADD CONSTRAINT "Mission_heroImageId_fkey"
  FOREIGN KEY ("heroImageId") REFERENCES "FileAsset"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Publication table. Image FK uses ON DELETE RESTRICT.
CREATE TABLE "Publication" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "featuredImageId" TEXT NOT NULL,
  "authorId" TEXT,
  "type" "PublicationType" NOT NULL,
  "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "scope" "PublicationScope" NOT NULL DEFAULT 'GENERAL',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "activityStatus" "ActivityStatus",
  "documentationStatus" "DocumentationStatus",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Publication_slug_key" ON "Publication"("slug");
CREATE INDEX "Publication_status_publishedAt_idx" ON "Publication"("status", "publishedAt");
CREATE INDEX "Publication_type_idx" ON "Publication"("type");
CREATE INDEX "Publication_authorId_idx" ON "Publication"("authorId");
ALTER TABLE "Publication"
  ADD CONSTRAINT "Publication_featuredImageId_fkey"
  FOREIGN KEY ("featuredImageId") REFERENCES "FileAsset"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Publication"
  ADD CONSTRAINT "Publication_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "ResponsibleUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- PublicationMission join. FKs CASCADE on either side.
CREATE TABLE "PublicationMission" (
  "publicationId" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicationMission_pkey" PRIMARY KEY ("publicationId", "missionId")
);
CREATE INDEX "PublicationMission_missionId_idx" ON "PublicationMission"("missionId");
ALTER TABLE "PublicationMission"
  ADD CONSTRAINT "PublicationMission_publicationId_fkey"
  FOREIGN KEY ("publicationId") REFERENCES "Publication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicationMission"
  ADD CONSTRAINT "PublicationMission_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "Mission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraints for publication invariants.
ALTER TABLE "Publication"
  ADD CONSTRAINT "Publication_publishedAt_required"
  CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
ALTER TABLE "Publication"
  ADD CONSTRAINT "Publication_post_activity_fields_null"
  CHECK (
    "type" <> 'POST' OR (
      "startDate" IS NULL AND "endDate" IS NULL
      AND "activityStatus" IS NULL AND "documentationStatus" IS NULL
    )
  );
ALTER TABLE "Publication"
  ADD CONSTRAINT "Publication_activity_required_fields"
  CHECK (
    "type" = 'POST' OR (
      "startDate" IS NOT NULL
      AND "activityStatus" IS NOT NULL
      AND "documentationStatus" IS NOT NULL
    )
  );
ALTER TABLE "Publication"
  ADD CONSTRAINT "Publication_endDate_after_startDate"
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate");

-- Mission BEFORE DELETE trigger.
CREATE OR REPLACE FUNCTION mission_block_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Mission deletion is not supported; archive the Mission instead';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "mission_block_delete_trigger" ON "Mission";
CREATE TRIGGER "mission_block_delete_trigger"
BEFORE DELETE ON "Mission"
FOR EACH ROW EXECUTE FUNCTION mission_block_delete();

-- PublicationMission scope-sync trigger.
CREATE OR REPLACE FUNCTION publication_mission_scope_sync()
RETURNS TRIGGER AS $$
DECLARE
  target_publication_id TEXT;
  link_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target_publication_id := NEW."publicationId";
    UPDATE "Publication" SET "scope" = 'MISSION'
      WHERE "id" = target_publication_id AND "scope" = 'GENERAL';
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    target_publication_id := OLD."publicationId";
    SELECT COUNT(*) INTO link_count FROM "PublicationMission"
      WHERE "publicationId" = target_publication_id;
    IF link_count = 0 THEN
      UPDATE "Publication" SET "scope" = 'GENERAL'
        WHERE "id" = target_publication_id AND "scope" = 'MISSION';
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "publication_mission_scope_sync_trigger" ON "PublicationMission";
CREATE TRIGGER "publication_mission_scope_sync_trigger"
AFTER INSERT OR DELETE ON "PublicationMission"
FOR EACH ROW EXECUTE FUNCTION publication_mission_scope_sync();

-- Publication scope validation: GENERAL=>0 links, MISSION=>≥1 link.
CREATE OR REPLACE FUNCTION publication_scope_validate()
RETURNS TRIGGER AS $$
DECLARE
  link_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO link_count FROM "PublicationMission"
    WHERE "publicationId" = NEW."id";
  IF NEW."scope" = 'GENERAL' AND link_count > 0 THEN
    RAISE EXCEPTION 'Publication scope GENERAL must have zero PublicationMission links';
  END IF;
  IF NEW."scope" = 'MISSION' AND link_count = 0 THEN
    RAISE EXCEPTION 'Publication scope MISSION must have at least one PublicationMission link';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "publication_scope_validate_trigger" ON "Publication";
CREATE TRIGGER "publication_scope_validate_trigger"
BEFORE INSERT OR UPDATE OF "scope" ON "Publication"
FOR EACH ROW EXECUTE FUNCTION publication_scope_validate();

COMMIT;
