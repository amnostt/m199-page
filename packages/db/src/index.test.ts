import { describe, it, expect } from "vitest";
import { prisma, DB_PACKAGE_VERSION } from "./index.js";

describe("@m199/db — smoke test", () => {
  it("exports a known package version", () => {
    expect(DB_PACKAGE_VERSION).toBe("0.0.0");
  });

  it("exports a PrismaClient singleton", () => {
    // Type-level boundary: the export exists and is truthy.
    // No live database connection is required for this unit test.
    expect(prisma).toBeTruthy();
  });
});
