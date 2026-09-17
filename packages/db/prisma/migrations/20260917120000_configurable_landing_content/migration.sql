-- Add configurable landing copy and an independently managed visual-break asset.
ALTER TYPE "FileCategory" ADD VALUE 'LANDING_VISUAL_BREAK';

ALTER TABLE "LandingSettings"
  ADD COLUMN "missionsTitle" TEXT,
  ADD COLUMN "missionsDescription" TEXT,
  ADD COLUMN "publicationsTitle" TEXT,
  ADD COLUMN "publicationsDescription" TEXT,
  ADD COLUMN "aboutTitle" TEXT,
  ADD COLUMN "contactTitle" TEXT,
  ADD COLUMN "contactDescription" TEXT,
  ADD COLUMN "visualBreakImageId" TEXT;

ALTER TABLE "LandingSettings"
  ADD CONSTRAINT "LandingSettings_visualBreakImageId_fkey"
  FOREIGN KEY ("visualBreakImageId") REFERENCES "FileAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
