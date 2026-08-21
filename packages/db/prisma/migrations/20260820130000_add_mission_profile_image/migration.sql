-- Add an optional identifying image to Mission without changing existing rows.
ALTER TABLE "Mission"
  ADD COLUMN "profileImageId" TEXT;

ALTER TABLE "Mission"
  ADD CONSTRAINT "Mission_profileImageId_fkey"
  FOREIGN KEY ("profileImageId") REFERENCES "FileAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
