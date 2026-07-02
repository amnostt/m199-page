/*
  Revert: align_file_asset_to_spec
  Restores the original column names and drops the new columns/index.

  Execute with: prisma migrate resolve --rolled-back "20260702015314_align_file_asset_to_spec"
  Or run this SQL directly on the target database.

  Data preservation: reverse-renames are O(1) metadata-only — zero data loss.
*/

-- Drop the added index
DROP INDEX IF EXISTS "FileAsset_createdAt_idx";

-- Drop the added column
ALTER TABLE "FileAsset" DROP COLUMN IF EXISTS "thumbnailPath";

-- Rename back to original column names (data-preserving)
ALTER TABLE "FileAsset" RENAME COLUMN "originalFilename" TO "originalName";
ALTER TABLE "FileAsset" RENAME COLUMN "fileSize" TO "sizeBytes";
ALTER TABLE "FileAsset" RENAME COLUMN "storagePath" TO "path";
