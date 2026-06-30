/**
 * DbService tests (BF-04).
 *
 * Proves the guarded client getter and verifies onModuleInit() wires
 * the dynamic @m199/db import correctly.
 *
 * Uses vi.hoisted to obtain mock references without a static @m199/db import,
 * keeping imports consistent with the runtime invariant (zero static
 * @m199/db imports in apps/api/).
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { getPrismaMock } = vi.hoisted(() => ({
  getPrismaMock: vi.fn(),
}));

vi.mock("@m199/db", () => ({
  getPrisma: getPrismaMock,
  DB_PACKAGE_VERSION: "0.0.0",
}));

import { DbService } from "./db.service.js";

describe("DbService", () => {
  let service: DbService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [DbService],
    }).compile();
    service = module.get(DbService);
  });

  it("throws when client is accessed before onModuleInit", () => {
    expect(() => service.client).toThrow(
      "DbService not initialized — call onModuleInit first",
    );
  });

  it("returns client after onModuleInit", async () => {
    const mockClient = { $connect: vi.fn(), $disconnect: vi.fn() };
    getPrismaMock.mockResolvedValue(mockClient);

    await service.onModuleInit();

    expect(service.client).toBe(mockClient);
  });

  it("calls getPrisma exactly once during onModuleInit", async () => {
    const mockClient = { $connect: vi.fn(), $disconnect: vi.fn() };
    getPrismaMock.mockResolvedValue(mockClient);

    await service.onModuleInit();

    expect(getPrismaMock).toHaveBeenCalledTimes(1);
  });
});
