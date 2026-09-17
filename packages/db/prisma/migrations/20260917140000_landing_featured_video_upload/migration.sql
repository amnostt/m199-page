-- The legacy URL is intentionally dropped; featured video content is now a managed FileAsset.
ALTER TYPE "FileCategory" ADD VALUE 'LANDING_FEATURED_VIDEO';

ALTER TABLE "LandingSettings" ADD COLUMN "featuredVideoId" TEXT;

ALTER TABLE "LandingSettings" DROP COLUMN "featuredVideoUrl";

ALTER TABLE "LandingSettings"
ADD CONSTRAINT "LandingSettings_featuredVideoId_fkey"
FOREIGN KEY ("featuredVideoId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
