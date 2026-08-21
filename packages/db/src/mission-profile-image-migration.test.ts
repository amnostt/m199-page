import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  resolve(
    import.meta.dirname,
    "../prisma/migrations/20260820130000_add_mission_profile_image/migration.sql",
  ),
  "utf8",
);
const schemaSql = readFileSync(
  resolve(import.meta.dirname, "../prisma/schema.prisma"),
  "utf8",
);

describe("mission profile image migration", () => {
  it("adds a nullable profile image FK without rewriting Mission rows", () => {
    expect(migrationSql).toContain('ADD COLUMN "profileImageId" TEXT');
    expect(migrationSql).toMatch(
      /Mission_profileImageId_fkey[\s\S]*?ON DELETE SET NULL/u,
    );
    expect(migrationSql).not.toContain('UPDATE "Mission"');
  });

  it("declares the profile relation separately from the documentary hero", () => {
    expect(schemaSql).toContain("profileImageId String?");
    expect(schemaSql).toContain(
      '@relation("MissionProfileImage", fields: [profileImageId], references: [id], onDelete: SetNull)',
    );
    expect(schemaSql).toContain(
      'missionProfiles        Mission[]          @relation("MissionProfileImage")',
    );
  });
});
