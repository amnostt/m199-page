/*
  Safe renames — PostgreSQL RENAME COLUMN is metadata-only (O(1), no data rewrite).

  Original column → New column:
    "originalName"   → "originalFilename"
    "sizeBytes"      → "fileSize"
    "path"           → "storagePath"

  New column:
    "thumbnailPath" TEXT (nullable)

  New index:
    "FileAsset_createdAt_idx" on "createdAt"

  Data preservation: RENAME COLUMN preserves all existing row data.
  Revert: see down.sql in this directory.
*/

-- Renames (data-preserving — no DROP COLUMN)
ALTER TABLE "FileAsset" RENAME COLUMN "originalName" TO "originalFilename";
ALTER TABLE "FileAsset" RENAME COLUMN "sizeBytes" TO "fileSize";
ALTER TABLE "FileAsset" RENAME COLUMN "path" TO "storagePath";

-- New column (no data to migrate for existing rows — NULL by default)
ALTER TABLE "FileAsset" ADD COLUMN "thumbnailPath" TEXT;

-- New index
CREATE INDEX "FileAsset_createdAt_idx" ON "FileAsset"("createdAt");
