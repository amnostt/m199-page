import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Mission/Publication domain reset migration (Slice 1) — contract test.
 * Asserts the SQL contract of the destructive single-transaction migration.
 */

const migrationSql = readFileSync(
  resolve(
    import.meta.dirname,
    "../prisma/migrations/20260810120000_mission_publication_domain_reset/migration.sql",
  ),
  "utf8",
);
const schemaSql = readFileSync(
  resolve(import.meta.dirname, "../prisma/schema.prisma"),
  "utf8",
);
const activityImagesMigrationSql = readFileSync(
  resolve(
    import.meta.dirname,
    "../prisma/migrations/20260916120000_publication_activity_date_images/migration.sql",
  ),
  "utf8",
);

describe("mission/publication domain reset migration SQL contract", () => {
  it("wraps the destructive migration in a single BEGIN/COMMIT transaction", () => {
    const firstNonComment = migrationSql
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("--"));
    expect(firstNonComment).toBe("BEGIN;");
    expect(migrationSql.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect((migrationSql.match(/^\s*BEGIN;\s*$/gmu) ?? []).length).toBe(1);
  });

  it("drops every legacy table, featured FK, and legacy enum", () => {
    for (const table of [
      "OutingLike",
      "FeaturedPost",
      "PostDownload",
      "Outing",
      "Post",
    ]) {
      expect(migrationSql).toContain(`DROP TABLE IF EXISTS "${table}"`);
    }
    expect(migrationSql).toContain(
      'DROP CONSTRAINT IF EXISTS "LandingSettings_featuredOutingId_fkey"',
    );
    expect(migrationSql).toContain(
      'ALTER TABLE "LandingSettings" DROP COLUMN IF EXISTS "featuredOutingId"',
    );
    expect(migrationSql).toContain('DROP TYPE IF EXISTS "ContentStatus"');
    expect(migrationSql).toContain('DROP TYPE IF EXISTS "FeaturedPostSlot"');
  });

  it("rebuilds FileCategory with the approved vocabulary", () => {
    expect(migrationSql).toContain('DROP TYPE IF EXISTS "FileCategory"');
    expect(migrationSql).toContain('CREATE TYPE "FileCategory" AS ENUM (');
    for (const value of [
      "MISSION_HERO",
      "PUBLICATION_FEATURED_IMAGE",
      "PUBLICATION_DOWNLOAD",
      "LANDING_HERO",
      "OTHER",
    ]) {
      expect(migrationSql).toContain(`'${value}'`);
    }
    for (const legacy of [
      "OUTING_MAIN_IMAGE",
      "OUTING_CROQUIS",
      "OUTING_PLAN",
      "POST_COVER_IMAGE",
      "POST_DOWNLOAD",
    ]) {
      expect(migrationSql).not.toMatch(new RegExp(`'${legacy}'`));
    }
    expect(migrationSql).not.toMatch(/CREATE INDEX "FileAsset_category_idx"/u);
  });

  it("converts Verse.status before dropping ContentStatus", () => {
    const createIndex = migrationSql.indexOf(
      'CREATE TYPE "PublicationStatus" AS ENUM',
    );
    const alterIndex = migrationSql.indexOf(
      'ALTER TABLE "Verse" ALTER COLUMN "status" TYPE "PublicationStatus"',
    );
    const dropIndex = migrationSql.indexOf(
      'DROP TYPE IF EXISTS "ContentStatus"',
    );
    expect(alterIndex).toBeGreaterThan(createIndex);
    expect(alterIndex).toBeLessThan(dropIndex);
  });

  it("creates Mission and Publication tables with RESTRICT image FKs", () => {
    for (const fragment of [
      /CREATE TABLE "Mission"/,
      '"heroImageId" TEXT NOT NULL',
      '"heroPhrase" TEXT NOT NULL',
      'CREATE UNIQUE INDEX "Mission_slug_key" ON "Mission"("slug")',
      /Mission_heroImageId_fkey[\s\S]*?ON DELETE RESTRICT/u,
      /CREATE TABLE "Publication"/,
      '"featuredImageId" TEXT NOT NULL',
      '"type" "PublicationType" NOT NULL',
      '"scope" "PublicationScope"',
      /Publication_featuredImageId_fkey[\s\S]*?ON DELETE RESTRICT/u,
    ]) {
      expect(migrationSql).toMatch(fragment);
    }
  });

  it("creates PublicationMission with composite PK and CASCADE FKs", () => {
    expect(migrationSql).toMatch(/CREATE TABLE "PublicationMission"/);
    expect(migrationSql).toContain(
      'CONSTRAINT "PublicationMission_pkey" PRIMARY KEY ("publicationId", "missionId")',
    );
    expect(migrationSql).toMatch(
      /PublicationMission_publicationId_fkey[\s\S]*?ON DELETE CASCADE/u,
    );
    expect(migrationSql).toMatch(
      /PublicationMission_missionId_fkey[\s\S]*?ON DELETE CASCADE/u,
    );
  });

  it("adds every CHECK constraint for publication invariants", () => {
    for (const constraint of [
      "Publication_publishedAt_required",
      "Publication_post_activity_fields_null",
      "Publication_activity_required_fields",
      "Publication_endDate_after_startDate",
    ]) {
      expect(migrationSql).toContain(`ADD CONSTRAINT "${constraint}"`);
    }
    expect(migrationSql).toContain(
      'CHECK ("status" <> \'PUBLISHED\' OR "publishedAt" IS NOT NULL)',
    );
    expect(migrationSql).toContain(
      'CHECK ("endDate" IS NULL OR "endDate" >= "startDate")',
    );
    expect(migrationSql).toContain("\"type\" <> 'POST' OR (");
    expect(migrationSql).toContain("\"type\" = 'POST' OR (");
  });

  it("installs the Mission delete blocker and the scope triggers", () => {
    for (const fragment of [
      'CREATE TRIGGER "mission_block_delete_trigger"',
      'BEFORE DELETE ON "Mission"',
      "RAISE EXCEPTION 'Mission deletion is not supported",
      'CREATE TRIGGER "publication_mission_scope_sync_trigger"',
      'AFTER INSERT OR DELETE ON "PublicationMission"',
      "SET \"scope\" = 'MISSION'",
      "SET \"scope\" = 'GENERAL'",
      'CREATE TRIGGER "publication_scope_validate_trigger"',
      'BEFORE INSERT OR UPDATE OF "scope"',
      "Publication scope GENERAL must have zero",
      "Publication scope MISSION must have at least one",
    ]) {
      expect(migrationSql).toContain(fragment);
    }
  });
});

describe("Prisma schema reflects the migration foundation", () => {
  it("exposes Mission/Publication/PublicationMission and removes legacy models", () => {
    for (const model of ["Mission", "Publication", "PublicationMission"]) {
      expect(schemaSql).toMatch(new RegExp(`^model\\s+${model}\\s+\\{`, "m"));
    }
    for (const model of [
      "Post",
      "Outing",
      "FeaturedPost",
      "PostDownload",
      "OutingLike",
    ]) {
      expect(schemaSql).not.toMatch(
        new RegExp(`^model\\s+${model}\\s+\\{`, "m"),
      );
    }
    expect(schemaSql).not.toMatch(/^enum\s+ContentStatus\s+\{/m);
    expect(schemaSql).not.toMatch(/^enum\s+FeaturedPostSlot\s+\{/m);
    expect(schemaSql).not.toMatch(/featuredOutingId\s+\??\s*String/u);
    for (const legacy of [
      "OUTING_MAIN_IMAGE",
      "OUTING_CROQUIS",
      "OUTING_PLAN",
      "POST_COVER_IMAGE",
      "POST_DOWNLOAD",
    ]) {
      expect(schemaSql).not.toMatch(new RegExp(`'${legacy}'`));
    }
  });

  it("uses one civil activity date and an ordered publication image relation", () => {
    expect(schemaSql).toMatch(/^\s*activityDate\s+DateTime\?\s+@db\.Date$/m);
    expect(schemaSql).toMatch(/^model\s+PublicationImage\s+\{/m);
    expect(schemaSql).toContain("@@id([publicationId, fileAssetId])");
    expect(schemaSql).toContain("@@unique([publicationId, position])");

    for (const legacy of [
      "featuredImageId",
      "startDate",
      "endDate",
      "activityStatus",
      "documentationStatus",
      "ActivityStatus",
      "DocumentationStatus",
    ]) {
      expect(schemaSql).not.toContain(legacy);
    }
  });
});

describe("publication activity date/image migration SQL contract", () => {
  it("runs the complete data-preserving reshape in one transaction", () => {
    const firstNonComment = activityImagesMigrationSql
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("--"));

    expect(firstNonComment).toBe("BEGIN;");
    expect(activityImagesMigrationSql.trimEnd().endsWith("COMMIT;")).toBe(true);
  });

  it("copies startDate into a PostgreSQL DATE before dropping legacy columns", () => {
    const addDate = activityImagesMigrationSql.indexOf(
      'ADD COLUMN "activityDate" DATE',
    );
    const copyDate = activityImagesMigrationSql.indexOf(
      'SET "activityDate" = "startDate"::date',
    );
    const dropStartDate = activityImagesMigrationSql.indexOf(
      'DROP COLUMN "startDate"',
    );

    expect(addDate).toBeGreaterThan(-1);
    expect(copyDate).toBeGreaterThan(addDate);
    expect(dropStartDate).toBeGreaterThan(copyDate);
    expect(activityImagesMigrationSql).toContain(
      "WHERE \"type\" IN ('OUTING', 'EVENT')",
    );
  });

  it("copies featured images to ordered position zero before removing the scalar", () => {
    const createImages = activityImagesMigrationSql.indexOf(
      'CREATE TABLE "PublicationImage"',
    );
    const copyImages = activityImagesMigrationSql.indexOf(
      'INSERT INTO "PublicationImage"',
    );
    const dropFeaturedImage = activityImagesMigrationSql.indexOf(
      'DROP COLUMN "featuredImageId"',
    );

    expect(createImages).toBeGreaterThan(-1);
    expect(copyImages).toBeGreaterThan(createImages);
    expect(dropFeaturedImage).toBeGreaterThan(copyImages);
    expect(activityImagesMigrationSql).toContain(
      'SELECT "id", "featuredImageId", 0',
    );
    expect(activityImagesMigrationSql).toContain(
      'PRIMARY KEY ("publicationId", "fileAssetId")',
    );
    expect(activityImagesMigrationSql).toContain(
      'ON "PublicationImage"("publicationId", "position")',
    );
    expect(activityImagesMigrationSql).toMatch(
      /PublicationImage_publicationId_fkey[\s\S]*?ON DELETE CASCADE/u,
    );
    expect(activityImagesMigrationSql).toMatch(
      /PublicationImage_fileAssetId_fkey[\s\S]*?ON DELETE RESTRICT/u,
    );
  });

  it("removes manual lifecycle fields and enforces the date/type invariant", () => {
    for (const column of ["endDate", "activityStatus", "documentationStatus"]) {
      expect(activityImagesMigrationSql).toContain(`DROP COLUMN "${column}"`);
    }
    expect(activityImagesMigrationSql).toContain('DROP TYPE "ActivityStatus"');
    expect(activityImagesMigrationSql).toContain(
      'DROP TYPE "DocumentationStatus"',
    );
    expect(activityImagesMigrationSql).toContain(
      'ADD CONSTRAINT "Publication_post_activity_date_null"',
    );
    expect(activityImagesMigrationSql).toContain(
      'CHECK ("type" <> \'POST\' OR "activityDate" IS NULL)',
    );
    expect(activityImagesMigrationSql).toContain(
      'ADD CONSTRAINT "Publication_activity_date_required"',
    );
    expect(activityImagesMigrationSql).toContain(
      'CHECK ("type" = \'POST\' OR "activityDate" IS NOT NULL)',
    );
  });
});
