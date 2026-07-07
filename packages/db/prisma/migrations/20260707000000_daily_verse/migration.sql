-- Daily Verse migration: remove date uniqueness, add publishedAt, update indexes.

-- 1. Drop the unique constraint on date so multiple verses per date are allowed.
DROP INDEX IF EXISTS "Verse_date_key";

-- 2. Drop the old status+date index (replaced by status+publishedAt).
DROP INDEX IF EXISTS "Verse_status_date_idx";

-- 3. Add publishedAt column (nullable, backfilled below).
ALTER TABLE "Verse" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- 4. Backfill publishedAt from createdAt for existing verses.
UPDATE "Verse" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;

-- 5. Create the new index for latest-remaining ordering by status + publishedAt.
CREATE INDEX "Verse_status_publishedAt_idx" ON "Verse"("status", "publishedAt");
