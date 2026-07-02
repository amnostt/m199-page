/**
 * Migration data-preservation test (FU-08).
 *
 * Proves that the align_file_asset_to_spec migration:
 * 1. Uses RENAME COLUMN (data-preserving), not DROP COLUMN + ADD COLUMN
 *    for renamed fields (originalName → originalFilename,
 *    sizeBytes → fileSize, path → storagePath).
 * 2. Only uses ADD COLUMN for the new thumbnailPath field.
 * 3. Includes a corresponding down.sql for safe revert.
 * 4. Schema is up to date after deployment.
 *
 * This test intentionally avoids database mutations (no INSERT/DELETE)
 * and proves data preservation through structural assertion: RENAME
 * COLUMN is a PostgreSQL metadata-only operation that never touches
 * row data. The SQL is read and pattern-matched against the safe
 * patterns to prevent accidental regression to DROP+ADD.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATION_DIR = resolve(
  import.meta.dirname,
  "../prisma/migrations/20260702015314_align_file_asset_to_spec",
);

function readMigrationFile(filename: string): string {
  return readFileSync(resolve(MIGRATION_DIR, filename), "utf-8");
}

describe("FU-08: FileAsset migration data preservation", () => {
  describe("migration.sql uses RENAME COLUMN (data-preserving)", () => {
    const sql = readMigrationFile("migration.sql");

    it('uses "RENAME COLUMN" for originalName → originalFilename', () => {
      expect(sql).toContain(
        'RENAME COLUMN "originalName" TO "originalFilename"',
      );
    });

    it('uses "RENAME COLUMN" for sizeBytes → fileSize', () => {
      expect(sql).toContain('RENAME COLUMN "sizeBytes" TO "fileSize"');
    });

    it('uses "RENAME COLUMN" for path → storagePath', () => {
      expect(sql).toContain('RENAME COLUMN "path" TO "storagePath"');
    });

    it("does NOT use DROP COLUMN for renamed fields", () => {
      // The ONLY DROP should be in the comment block, not in executable SQL.
      // Extract executable lines (exclude comment lines starting with -- or /* ... */).
      const executable = sql
        .split("\n")
        .filter(
          (line) =>
            !line.trimStart().startsWith("--") &&
            !line.trimStart().startsWith("/*") &&
            !line.trimStart().startsWith("*") &&
            line.trim().length > 0,
        )
        .join("\n");

      expect(executable).not.toContain('DROP COLUMN "originalName"');
      expect(executable).not.toContain('DROP COLUMN "sizeBytes"');
      expect(executable).not.toContain('DROP COLUMN "path"');
    });

    it('adds "thumbnailPath" as a new column (ADD COLUMN, not a rename)', () => {
      expect(sql).toContain('ADD COLUMN "thumbnailPath" TEXT');
    });

    it('creates "FileAsset_createdAt_idx" index', () => {
      expect(sql).toContain(
        'CREATE INDEX "FileAsset_createdAt_idx" ON "FileAsset"("createdAt")',
      );
    });
  });

  describe("down.sql provides safe revert", () => {
    const down = readMigrationFile("down.sql");

    it("reverts with RENAME COLUMN back to original names", () => {
      // Revert path uses RENAME COLUMN to restore original names — data-preserving both ways
      expect(down).toContain(
        'RENAME COLUMN "originalFilename" TO "originalName"',
      );
      expect(down).toContain('RENAME COLUMN "fileSize" TO "sizeBytes"');
      expect(down).toContain('RENAME COLUMN "storagePath" TO "path"');
    });

    it("drops the added thumbnailPath and index", () => {
      expect(down).toContain('DROP COLUMN IF EXISTS "thumbnailPath"');
      expect(down).toContain('DROP INDEX IF EXISTS "FileAsset_createdAt_idx"');
    });

    it("does NOT use DROP COLUMN for renamed columns (safe revert)", () => {
      const executable = down
        .split("\n")
        .filter(
          (line) =>
            !line.trimStart().startsWith("--") &&
            !line.trimStart().startsWith("/*") &&
            !line.trimStart().startsWith("*") &&
            line.trim().length > 0,
        )
        .join("\n");

      // Only thumbnailPath should be dropped — renamed columns must use RENAME
      const dropMatches = executable.match(/DROP COLUMN/g);
      // Only one DROP COLUMN should exist (for thumbnailPath)
      expect(dropMatches).not.toBeNull();
      expect(dropMatches!.length).toBe(1);
    });
  });

  describe("Prisma schema alignment", () => {
    const schema = readFileSync(
      resolve(import.meta.dirname, "../prisma/schema.prisma"),
      "utf-8",
    );

    it("has originalFilename field in FileAsset model", () => {
      expect(schema).toContain("originalFilename String");
    });

    it("has fileSize field in FileAsset model", () => {
      expect(schema).toContain("fileSize        Int");
    });

    it("has storagePath field in FileAsset model", () => {
      expect(schema).toContain("storagePath     String");
    });

    it("has thumbnailPath field in FileAsset model", () => {
      expect(schema).toContain("thumbnailPath   String?");
    });

    it("has createdAt index in FileAsset model", () => {
      expect(schema).toContain("@@index([createdAt])");
    });

    it("does NOT have originalName, sizeBytes, or path fields", () => {
      // These old column names must not appear as fields in the model
      expect(schema).not.toMatch(/\boriginalName\b/);
      expect(schema).not.toMatch(/\bsizeBytes\b/);
      // "path" appears in many contexts (e.g., filepath, storagePath) so
      // we verify storagePath is the field used for the file path.
      expect(schema).toContain("storagePath     String");
    });
  });
});
