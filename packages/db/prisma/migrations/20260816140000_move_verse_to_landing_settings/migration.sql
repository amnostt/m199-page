-- Move the current landing verse into the singleton settings row.
-- Existing verse history is intentionally removed after the latest row is copied.

BEGIN;

ALTER TABLE "LandingSettings"
  ADD COLUMN "verseText" TEXT,
  ADD COLUMN "verseReference" TEXT;

WITH latest_verse AS (
  SELECT "text", "reference"
  FROM "Verse"
  WHERE "status" = 'PUBLISHED'
  ORDER BY "publishedAt" DESC NULLS LAST, "id" DESC
  LIMIT 1
)
INSERT INTO "LandingSettings" AS landing_settings
  ("id", "verseText", "verseReference", "updatedAt")
SELECT 1, "text", "reference", CURRENT_TIMESTAMP
FROM latest_verse
ON CONFLICT ("id") DO UPDATE
SET
  "verseText" = COALESCE(
    landing_settings."verseText",
    EXCLUDED."verseText"
  ),
  "verseReference" = COALESCE(
    landing_settings."verseReference",
    EXCLUDED."verseReference"
  ),
  "updatedAt" = CURRENT_TIMESTAMP;

DROP TABLE IF EXISTS "VerseRevision";
DROP TABLE IF EXISTS "Verse";

COMMIT;
