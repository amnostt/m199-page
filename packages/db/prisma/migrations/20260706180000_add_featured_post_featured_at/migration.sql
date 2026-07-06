-- Task 1.1: Add FeaturedPost.featuredAt with default now(), backfill from createdAt, add index.

-- Add the non-null column with a default so existing rows get a value.
ALTER TABLE "FeaturedPost" ADD COLUMN "featuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: set featuredAt = createdAt for all existing rows.
-- The ALTER TABLE sets featuredAt to CURRENT_TIMESTAMP via DEFAULT, but
-- existing featured posts must retain their original creation date so
-- ordering reflects when they were first featured, not when the migration ran.
DO $$
BEGIN
  UPDATE "FeaturedPost" SET "featuredAt" = "createdAt"
  WHERE "featuredAt" <> "createdAt";
END $$;

-- Index for landing ordering: featuredAt DESC, TAKE 3.
CREATE INDEX "FeaturedPost_featuredAt_idx" ON "FeaturedPost"("featuredAt");
