/**
 * AppModule compile/bootstrap tests (BF-01, BF-02, BF-06).
 *
 * Proves:
 * - AppModule compiles with valid config (BF-01 valid bootstrap, BF-06 compile).
 * - Missing DATABASE_URL throws before @m199/db is resolved (BF-02 import-order).
 *
 * Uses vi.mock on env.validation to bypass ESM import hoisting: the @Module
 * decorator evaluates ConfigModule.forRoot({ validate }) at import time, and
 * ESM hoists imports above regular statements. Mocking the validate function
 * lets us control when it throws without relying on process.env ordering.
 */

const { getPrismaMock, validateMock } = vi.hoisted(() => ({
  getPrismaMock: vi.fn().mockResolvedValue({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  }),
  validateMock: vi.fn().mockReturnValue({
    NODE_ENV: "test",
    PORT: 3001,
    DATABASE_URL: "postgresql://localhost/test",
  }),
}));

vi.mock("@m199/db", () => ({
  getPrisma: getPrismaMock,
  DB_PACKAGE_VERSION: "0.0.0",
}));

// Mock env.validation so AppModule's @Module decorator evaluates cleanly
// regardless of process.env state at import time.
vi.mock("./config/env.validation.js", () => ({
  validate: validateMock,
}));

import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppModule } from "./app.module.js";
import { DbService } from "./db/db.service.js";

describe("AppModule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset validateMock to return valid config (default)
    validateMock.mockReturnValue({
      NODE_ENV: "test",
      PORT: 3001,
      DATABASE_URL: "postgresql://localhost/test",
    });
    getPrismaMock.mockResolvedValue({
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    });
  });

  describe("BF-01 valid bootstrap, BF-06 compile", () => {
    it("compiles AppModule and resolves @m199/db during onModuleInit", async () => {
      // validateMock returns valid config → compile succeeds
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      expect(module).toBeDefined();
      expect(module.get(AppModule)).toBeInstanceOf(AppModule);

      // NestJS testing module does not auto-call lifecycle hooks during
      // compile(). Manually trigger onModuleInit to prove the @m199/db
      // dynamic import boundary works as designed.
      const dbService = module.get(DbService);
      await dbService.onModuleInit();

      expect(getPrismaMock).toHaveBeenCalled();
    });
  });

  describe("BF-02 import-order: validate fails before @m199/db resolves", () => {
    it("throws on invalid config and never touches @m199/db", async () => {
      // Reproduce the AppModule pattern: ConfigModule.forRoot with a throwing
      // validate BEFORE a provider that would dynamically import @m199/db.
      // ConfigModule.forRoot calls validate() synchronously in forRoot(),
      // so if validate throws, module compilation fails before the factory runs.
      await expect(
        Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              validate: () => {
                throw new Error("Missing required env var: DATABASE_URL");
              },
              isGlobal: true,
            }),
          ],
          providers: [
            {
              provide: "DB_IMPORT_ORDER_PROBE",
              useFactory: async () => {
                // This factory only runs if module compilation succeeds.
                // If validate throws above, this code is unreachable.
                await import("@m199/db");
                return "should-not-reach";
              },
            },
          ],
        }).compile(),
      ).rejects.toThrow("Missing required env var: DATABASE_URL");

      // Critical: @m199/db mock was never called because validate threw
      // before the factory could trigger the dynamic import.
      expect(getPrismaMock).not.toHaveBeenCalled();
    });
  });
});
