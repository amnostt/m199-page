import { describe, it, expect, vi } from "vitest";

// Mock dynamic imports inside getPrisma() — vitest hoists vi.mock,
// intercepting both static and dynamic imports of these modules.
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function (this: Record<string, unknown>) {
    this.$connect = vi.fn();
    this.$disconnect = vi.fn();
  }),
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(),
}));

import { getPrisma, DB_PACKAGE_VERSION } from "./index.js";

describe("@m199/db — smoke test", () => {
  it("exports a known package version", () => {
    expect(DB_PACKAGE_VERSION).toBe("0.0.0");
  });

  it("getPrisma() returns a PrismaClient-like instance", async () => {
    const client = await getPrisma();

    expect(client).toBeTruthy();
    expect(client).toHaveProperty("$connect");
    expect(client).toHaveProperty("$disconnect");
  }, 15000);
});
