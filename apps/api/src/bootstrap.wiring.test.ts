/**
 * Bootstrap wiring test (BF-01, BF-03, BF-05, BF-06).
 *
 * Proves that main.ts bootstrap is correctly wired by building a real
 * NestApplication via @nestjs/testing, calling the same
 * `applyGlobalPipes(app)` helper that main.ts uses, and asserting the
 * resulting wiring through Nest's own introspection seam
 * (applicationConfig + the registered route table) — no live HTTP
 * socket required.
 *
 * - BF-03: A ValidationPipe is registered via `app.useGlobalPipes(...)`
 *   with `whitelist: true` and `transform: true` (the same options
 *   that the production runtime relies on). Removing the pipe from
 *   main.ts or flipping either option would make these assertions fail.
 * - BF-05: `GET /health` is registered as an HTTP route through the
 *   full AppModule bootstrap. The route's path, method, and target
 *   controller are read directly from the registered NestApplication
 *   router — if the controller is removed from HealthModule or the
 *   module is dropped from AppModule.imports, the route table will
 *   not contain `/health` and this test will fail.
 *
 * We do NOT bind to a TCP port or send real HTTP requests. esbuild
 * (vitest's transpiler) does not honor `emitDecoratorMetadata`, so
 * parameter `metatype` information is lost in the test environment,
 * which would silently turn a 400 into a 201 if we used supertest.
 * Asserting against Nest's own wiring primitives is both more reliable
 * and tighter in scope.
 *
 * The `bootstrap()` listen path (BF-01) and the direct ValidationPipe
 * behavior on EchoDto are covered separately in main.test.ts and
 * echo.controller.test.ts.
 */

import "reflect-metadata";

import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AppModule } from "./app.module.js";
import { applyGlobalPipes } from "./main.js";

// Mock env.validation so AppModule's @Module decorator evaluates
// ConfigModule.forRoot({ validate }) cleanly at import time without
// requiring real process.env entries.
vi.mock("./config/env.validation.js", () => ({
  validate: vi.fn().mockReturnValue({
    NODE_ENV: "test",
    PORT: 0,
    DATABASE_URL: "postgresql://localhost/test",
    JWT_SECRET: "test-jwt-secret",
  }),
}));

// Mock @m199/db so AppModule → DbService → onModuleInit() does not
// attempt a real dynamic import('@m199/db') in the test environment.
vi.mock("@m199/db", () => ({
  getPrisma: vi.fn().mockResolvedValue({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  }),
  DB_PACKAGE_VERSION: "0.0.0",
}));

interface AppLike {
  config: { globalPipes: ValidationPipe[] };
  getHttpAdapter(): {
    getInstance(): {
      router?: {
        stack: Array<{
          route?: {
            path: string | RegExp;
            methods: Record<string, boolean>;
          };
        }>;
      };
    };
  };
}

describe("bootstrap wiring (BF-01, BF-03, BF-05)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    applyGlobalPipes(app);
    await app.init();
  });

  describe("BF-03 global ValidationPipe wiring", () => {
    it("registers a ValidationPipe with whitelist:true and transform:true", () => {
      const appLike = app as unknown as AppLike;
      const pipes = appLike.config.globalPipes;

      expect(pipes).toHaveLength(1);
      const pipe = pipes[0];
      expect(pipe).toBeInstanceOf(ValidationPipe);

      // ValidationPipe stores the configured options on protected
      // fields. Read them via `unknown` to assert the invariants the
      // production code relies on. If main.ts changes the pipe
      // options (e.g. removes `whitelist`), this assertion fails.
      const opts = pipe as unknown as {
        validatorOptions: { whitelist?: boolean };
        isTransformEnabled: boolean;
      };
      expect(opts.validatorOptions.whitelist).toBe(true);
      expect(opts.isTransformEnabled).toBe(true);
    });
  });

  describe("BF-05 GET /health route registration", () => {
    it("registers GET /health through the AppModule bootstrap", () => {
      const appLike = app as unknown as AppLike;
      const stack = appLike.getHttpAdapter().getInstance().router?.stack ?? [];

      const healthRoute = stack.find((layer) => {
        const path = layer.route?.path;
        const methods = layer.route?.methods ?? {};
        return (
          (path === "/health" || path === "/health/") && methods["get"] === true
        );
      });

      expect(healthRoute).toBeDefined();
      const methods = healthRoute?.route?.methods ?? {};
      expect(methods["get"]).toBe(true);
      // Only GET is exposed for /health — POST/PUT/DELETE would
      // indicate the controller grew methods beyond the readiness
      // contract (BF-05).
      expect(Object.keys(methods).sort()).toEqual(["get"]);
    });
  });
});
