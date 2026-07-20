BEGIN;

LOCK TABLE "Post", "FeaturedPost", "PostDownload" IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE "InvalidPublishedPosts" ON COMMIT DROP AS
SELECT "id"
FROM "Post"
WHERE "status" = 'PUBLISHED'
  AND "publishedAt" IS NULL;

CREATE TEMP TABLE "PostRemediationProof" ON COMMIT DROP AS
SELECT "id", md5((to_jsonb("Post") - 'status')::text) AS "contentHash"
FROM "Post";

CREATE TEMP TABLE "ValidPostRemediationProof" ON COMMIT DROP AS
SELECT "id", md5(to_jsonb("Post")::text) AS "rowHash"
FROM "Post"
WHERE "id" NOT IN (SELECT "id" FROM "InvalidPublishedPosts");

CREATE TEMP TABLE "PostDownloadRemediationProof" ON COMMIT DROP AS
SELECT "id", md5(to_jsonb("PostDownload")::text) AS "rowHash"
FROM "PostDownload";

DO $$
DECLARE
  target_count BIGINT;
  post_count BIGINT;
  download_count BIGINT;
  featured_deleted BIGINT;
  mismatch_count BIGINT;
BEGIN
  SELECT count(*) INTO target_count FROM "InvalidPublishedPosts";
  SELECT count(*) INTO post_count FROM "Post";
  SELECT count(*) INTO download_count FROM "PostDownload";
  RAISE NOTICE 'Reclassifying % published posts without publishedAt to DRAFT', target_count;

  DELETE FROM "FeaturedPost"
  WHERE "postId" IN (SELECT "id" FROM "InvalidPublishedPosts");
  GET DIAGNOSTICS featured_deleted = ROW_COUNT;
  RAISE NOTICE 'Removed % featured assignments for reclassified posts', featured_deleted;

  UPDATE "Post"
  SET "status" = 'DRAFT'
  WHERE "id" IN (SELECT "id" FROM "InvalidPublishedPosts")
    AND "status" = 'PUBLISHED'
    AND "publishedAt" IS NULL;
  GET DIAGNOSTICS mismatch_count = ROW_COUNT;
  IF mismatch_count <> target_count THEN
    RAISE EXCEPTION 'Expected % reclassified posts, updated %', target_count, mismatch_count;
  END IF;
  RAISE NOTICE 'Reclassified % posts to DRAFT', mismatch_count;

  IF (SELECT count(*) FROM "Post") <> post_count THEN
    RAISE EXCEPTION 'Post preservation mismatch';
  END IF;
  IF (SELECT count(*) FROM "PostDownload") <> download_count THEN
    RAISE EXCEPTION 'PostDownload preservation mismatch';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "PostRemediationProof" proof
    JOIN "Post" post ON post."id" = proof."id"
    WHERE md5((to_jsonb(post) - 'status')::text) <> proof."contentHash"
  ) THEN
    RAISE EXCEPTION 'Post preservation mismatch';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "ValidPostRemediationProof" proof
    JOIN "Post" post ON post."id" = proof."id"
    WHERE md5(to_jsonb(post)::text) <> proof."rowHash"
  ) THEN
    RAISE EXCEPTION 'Valid post preservation mismatch';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "PostDownloadRemediationProof" proof
    JOIN "PostDownload" download ON download."id" = proof."id"
    WHERE md5(to_jsonb(download)::text) <> proof."rowHash"
  ) THEN
    RAISE EXCEPTION 'PostDownload preservation mismatch';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "InvalidPublishedPosts" target
    LEFT JOIN "Post" post ON post."id" = target."id"
    LEFT JOIN "FeaturedPost" featured ON featured."postId" = target."id"
    WHERE post."status" <> 'DRAFT'
      OR post."publishedAt" IS NOT NULL
      OR featured."postId" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Reclassified post verification mismatch';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "Post"
    WHERE "status" = 'PUBLISHED'
      AND "publishedAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'Published posts without publishedAt remain';
  END IF;
END $$;

ALTER TABLE "Post"
ADD CONSTRAINT "Post_publishedAt_required"
CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);

COMMIT;
