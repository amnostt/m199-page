import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  import.meta.dirname,
  "../prisma/migrations/20260720000000_safe_post_transitions/migration.sql",
);

describe("safe post transitions migration", () => {
  it("locks and snapshots invalid published posts with preservation proof", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain('LOCK TABLE "Post", "FeaturedPost", "PostDownload"');
    expect(sql).toContain('CREATE TEMP TABLE "InvalidPublishedPosts"');
    expect(sql).toContain('CREATE TEMP TABLE "PostRemediationProof"');
    expect(sql).toContain('CREATE TEMP TABLE "PostDownloadRemediationProof"');
    expect(sql).toContain("\"status\" = 'PUBLISHED'");
    expect(sql).toContain('"publishedAt" IS NULL');
    expect(sql).toContain("RAISE NOTICE");
  });

  it("unfeatures exact targets and reclassifies them to DRAFT without deleting data", () => {
    const sql = readFileSync(migrationPath, "utf8");
    const featuredDelete = sql.indexOf('DELETE FROM "FeaturedPost"');
    const draftUpdate = sql.indexOf('UPDATE "Post"');

    expect(featuredDelete).toBeGreaterThan(-1);
    expect(draftUpdate).toBeGreaterThan(featuredDelete);
    expect(sql).toContain("SET \"status\" = 'DRAFT'");
    expect(sql).not.toContain('DELETE FROM "Post"');
    expect(sql).not.toContain('DELETE FROM "PostDownload"');
    expect(sql).not.toMatch(
      /CREATE\s+(?:TEMP\s+)?TABLE\s+.*(?:archive|delet)/i,
    );
  });

  it("verifies post and download preservation before adding the durable check", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("Post preservation mismatch");
    expect(sql).toContain("PostDownload preservation mismatch");
    expect(sql).toContain("Valid post preservation mismatch");
    expect(sql).toContain("Published posts without publishedAt remain");
    expect(sql).toContain('ADD CONSTRAINT "Post_publishedAt_required"');
    expect(sql).toContain(
      'CHECK ("status" <> \'PUBLISHED\' OR "publishedAt" IS NOT NULL)',
    );
  });
});
