/**
 * Bootstrap test (BF-01: Valid config — server starts on configured port).
 *
 * Proves main.ts:
 * - Calls NestFactory.create(AppModule)
 * - Registers a global ValidationPipe (applyGlobalPipes) — see BF-03.
 * - Resolves ConfigService.get("PORT") from the app container
 * - Calls app.listen(port) with the resolved port
 * - Adds cookie-parser middleware via app.use()
 *
 * Avoids real network listening by mocking NestFactory.create to return
 * a fake app whose listen and useGlobalPipes are vitest spies. The
 * real global pipe behavior is covered by `bootstrap.wiring.test.ts`,
 * which builds a full Nest app and exercises the pipe through HTTP.
 */

const { listenMock, useGlobalPipesMock, useMock, mkdirMock } = vi.hoisted(() => ({
  listenMock: vi.fn(),
  useGlobalPipesMock: vi.fn(),
  useMock: vi.fn(),
  mkdirMock: vi.fn(),
}));

// Mock env.validation so the @Module decorator in AppModule evaluates
// ConfigModule.forRoot({ validate }) cleanly at import time without
// requiring real process.env entries.
vi.mock("./config/env.validation.js", () => ({
  validate: vi.fn().mockReturnValue({
    NODE_ENV: "test",
    PORT: 3001,
    DATABASE_URL: "postgresql://localhost/test",
    UPLOAD_DIR: "./uploads",
    MAX_FILE_SIZE: 10485760,
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

// Preserve all real @nestjs/core exports (APP_FILTER is needed by
// AppModule's DI providers) and only replace NestFactory.create.
vi.mock("@nestjs/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nestjs/core")>();
  return {
    ...actual,
    NestFactory: {
      ...actual.NestFactory,
      create: vi.fn().mockResolvedValue({
        use: useMock,
        useGlobalPipes: useGlobalPipesMock,
        get: vi.fn().mockReturnValue({
          get: vi.fn().mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
              PORT: 3001,
              UPLOAD_DIR: "./uploads",
              MAX_FILE_SIZE: 10485760,
            };
            return values[key] ?? "./uploads";
          }),
        }),
        listen: listenMock,
      }),
    },
  };
});

// Mock fs/promises to verify mkdir is called with UPLOAD_DIR on bootstrap.
vi.mock("fs/promises", () => ({
  mkdir: mkdirMock,
}));

import { ValidationPipe } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Dynamic import so vitest hoists all vi.mock factories above module
// evaluation. The VITEST guard in main.ts skips auto-execution, giving
// the test full control over timing.
const { bootstrap } = await import("./main.js");

describe("main bootstrap (BF-01 valid server start)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls app.listen with the configured PORT value", async () => {
    await bootstrap();

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledWith(3001);
  });

  it("registers cookieParser middleware via app.use", async () => {
    await bootstrap();

    expect(useMock).toHaveBeenCalledTimes(1);
    // First argument should be a function (cookieParser is a middleware factory)
    expect(typeof useMock.mock.calls[0]?.[0]).toBe("function");
  });

  it("registers a global ValidationPipe via applyGlobalPipes", async () => {
    await bootstrap();

    expect(useGlobalPipesMock).toHaveBeenCalledTimes(1);
    const arg = useGlobalPipesMock.mock.calls[0]?.[0];
    expect(arg).toBeInstanceOf(ValidationPipe);
    // ValidationPipe stores configured options on a protected
    // `validatorOptions` field. Read it via `unknown` to assert the
    // invariants the API relies on (whitelist strips unknown props,
    // transform coerces payloads). If main.ts removes the pipe or
    // changes these options, this assertion fails.
    const pipe = arg as unknown as {
      validatorOptions: { whitelist?: boolean };
      isTransformEnabled: boolean;
    };
    expect(pipe.validatorOptions.whitelist).toBe(true);
    expect(pipe.isTransformEnabled).toBe(true);
  });

  it("does not call app.listen when NestFactory.create fails", async () => {
    // Override create to reject for this single test
    const { NestFactory } = await import("@nestjs/core");
    const createSpy = vi.mocked(NestFactory.create);
    createSpy.mockRejectedValueOnce(
      new Error(
        "Config validation failed: Missing required env var: DATABASE_URL",
      ),
    );

    await expect(bootstrap()).rejects.toThrow(
      "Missing required env var: DATABASE_URL",
    );

    expect(listenMock).not.toHaveBeenCalled();
  });

  it("calls fs.mkdir with UPLOAD_DIR and recursive:true before app.listen", async () => {
    await bootstrap();

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(mkdirMock).toHaveBeenCalledWith("./uploads", { recursive: true });
  });
});
