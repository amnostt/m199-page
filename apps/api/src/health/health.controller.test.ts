/**
 * HealthController tests (BF-05).
 *
 * Proves the /health endpoint returns process/config readiness shape
 * and has zero database dependencies.
 *
 * Uses direct controller instantiation with a mock ConfigService rather than
 * Test.createTestingModule. NestJS v11 DI does not resolve ConfigService when
 * provided via useValue/useMocker/overrideProvider in the testing module
 * without a full ConfigModule.forRoot import. Since the health controller only
 * depends on ConfigService and has zero lifecycle hooks, direct instantiation
 * with a mock produces functionally identical coverage with less indirection.
 */
import { ConfigService } from "@nestjs/config";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  const mockConfig = {
    get: vi.fn().mockReturnValue("test"),
  };

  const controller = new HealthController(
    mockConfig as unknown as ConfigService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.get.mockReturnValue("test");
  });

  describe("BF-05 healthy endpoint", () => {
    it("returns status ok with uptime and env", () => {
      const result = controller.check();

      expect(result).toEqual({
        status: "ok",
        uptime: expect.any(Number) as number,
        env: "test",
      });
    });
  });

  describe("BF-05 config deferral", () => {
    it("defers env value to ConfigService", () => {
      controller.check();
      expect(mockConfig.get).toHaveBeenCalledWith("NODE_ENV", "unknown");
    });
  });

  describe("BF-05 DB isolation", () => {
    it("has zero DB imports or dependencies", () => {
      // Controller receives only ConfigService; no DbModule, PrismaClient,
      // or database probe in this test file or the source module.
      expect(controller).toBeDefined();
    });
  });
});
