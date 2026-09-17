-- Add configurable landing background music without changing existing settings or assets.
ALTER TYPE "FileCategory" ADD VALUE 'LANDING_BACKGROUND_MUSIC';

ALTER TABLE "LandingSettings" ADD COLUMN "backgroundMusicId" TEXT;

ALTER TABLE "LandingSettings"
ADD CONSTRAINT "LandingSettings_backgroundMusicId_fkey"
FOREIGN KEY ("backgroundMusicId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
