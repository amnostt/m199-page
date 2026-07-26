/**
 * PostgreSQL-backed refresh-family integration coverage.
 *
 * Unlike auth.service.test.ts, this harness uses the real DbService and the
 * local Compose PostgreSQL database so Promise.all exercises actual Prisma
 * transactions, Serializable isolation, and the RefreshFamily row lock.
 *
 * Opt-in command (after the migration is deployed):
 * DATABASE_URL=<database-url> JWT_SECRET=<jwt-secret> pnpm --filter @m199/api test:integration
 */
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { JwtModule } from "@nestjs/jwt";
import {
  describe,
  expect,
  it,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { DbService } from "../db/db.service.js";
import { REFRESH_TOKEN } from "./auth.constants.js";

const OPERATION_A = "11111111-1111-4111-8111-111111111111";
const OPERATION_B = "22222222-2222-4222-8222-222222222222";
const OPERATION_C = "33333333-3333-4333-8333-333333333333";
const INTEGRATION_ENABLED = process.env["RUN_POSTGRES_INTEGRATION"] === "1";

function requiredEnvironment(name: "DATABASE_URL" | "JWT_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be provided when RUN_POSTGRES_INTEGRATION=1`);
  }
  return value;
}

async function getIntegrationPrisma() {
  const db = await import("@m199/db");
  return db.getPrisma();
}

type IntegrationPrisma = Awaited<ReturnType<typeof getIntegrationPrisma>>;

type TestResponse = ReturnType<typeof response>;

function response() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    setHeader: vi.fn(),
  };
}

function request(token: string, operationId?: string): Request {
  return {
    cookies: { [REFRESH_TOKEN]: token },
    headers: operationId ? { "x-refresh-operation-id": operationId } : {},
  } as unknown as Request;
}

function cookie(res: TestResponse, name: string): string {
  const call = res.cookie.mock.calls.find(
    ([cookieName]) => cookieName === name,
  );
  if (!call) throw new Error(`${name} cookie was not set`);
  return call[1] as string;
}

function assertNoAuthCookies(res: TestResponse): void {
  expect(res.cookie).not.toHaveBeenCalled();
  expect(res.clearCookie).not.toHaveBeenCalled();
}

const integrationDescribe = INTEGRATION_ENABLED ? describe : describe.skip;

integrationDescribe("AuthService refresh-family PostgreSQL integration", () => {
  let module: TestingModule;
  let service: AuthService;
  let dbService: DbService;
  let prisma: IntegrationPrisma;
  let userId: string | undefined;

  beforeAll(async () => {
    const databaseUrl = requiredEnvironment("DATABASE_URL");
    const jwtSecret = requiredEnvironment("JWT_SECRET");
    process.env["DATABASE_URL"] = databaseUrl;

    module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: jwtSecret })],
      providers: [
        AuthService,
        DbService,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            JWT_SECRET: jwtSecret,
          }),
        },
      ],
    }).compile();
    await module.init();

    service = module.get(AuthService);
    dbService = module.get(DbService);
    prisma = await getIntegrationPrisma();
  });

  afterEach(async () => {
    if (!userId) return;

    const families = await prisma.refreshFamily.findMany({
      where: { userId },
      select: { id: true },
    });
    const familyIds = families.map(({ id }) => id);
    if (familyIds.length > 0) {
      await prisma.refreshOperation.deleteMany({
        where: { familyId: { in: familyIds } },
      });
      await prisma.refreshFamily.deleteMany({
        where: { id: { in: familyIds } },
      });
    }
    await prisma.refreshSession.deleteMany({ where: { userId } });
    await prisma.responsibleUser.delete({ where: { id: userId } });
    userId = undefined;
  });

  afterAll(async () => {
    await module?.close();
    await dbService?.client.$disconnect();
  });

  it("serializes a real concurrent race, replays the loser, and prevents terminal resurrection", async () => {
    const email = `refresh-integration-${randomUUID()}@test.invalid`;
    const password = randomUUID();
    const user = await prisma.responsibleUser.create({
      data: {
        email,
        displayName: "Refresh Integration User",
        passwordHash: await bcrypt.hash(password, 4),
      },
    });
    userId = user.id;

    const loginResponse = response();
    await service.login(
      { email, password },
      loginResponse as unknown as Response,
    );
    const initialToken = cookie(loginResponse, REFRESH_TOKEN);

    const firstResponse = response();
    const secondResponse = response();
    const [firstUser, secondUser] = await Promise.all([
      service.refresh(
        request(initialToken, OPERATION_A),
        firstResponse as unknown as Response,
      ),
      service.refresh(
        request(initialToken, OPERATION_B),
        secondResponse as unknown as Response,
      ),
    ]);

    expect(secondUser).toEqual(firstUser);
    expect(cookie(firstResponse, "access_token")).toBe(
      cookie(secondResponse, "access_token"),
    );
    expect(cookie(firstResponse, REFRESH_TOKEN)).toBe(
      cookie(secondResponse, REFRESH_TOKEN),
    );
    expect(firstResponse.setHeader).toHaveBeenCalledWith(
      "x-refresh-family-version",
      "2",
    );
    expect(secondResponse.setHeader).toHaveBeenCalledWith(
      "x-refresh-family-version",
      "2",
    );

    const family = await prisma.refreshFamily.findFirstOrThrow({
      where: { userId },
    });
    const operations = await prisma.refreshOperation.findMany({
      where: { familyId: family.id },
      orderBy: { childVersion: "asc" },
    });
    expect(family.currentVersion).toBe(2);
    expect(operations).toHaveLength(2);
    expect(operations.map(({ childVersion }) => childVersion)).toEqual([1, 2]);
    expect(
      operations.filter(({ presentedVersion }) => presentedVersion === 1),
    ).toHaveLength(1);

    const staleReplayResponse = response();
    await service.refresh(
      request(initialToken, OPERATION_C),
      staleReplayResponse as unknown as Response,
    );
    expect(cookie(staleReplayResponse, REFRESH_TOKEN)).toBe(
      cookie(firstResponse, REFRESH_TOKEN),
    );
    await expect(
      prisma.refreshFamily.findUniqueOrThrow({ where: { id: family.id } }),
    ).resolves.toMatchObject({ currentVersion: 2 });
    await expect(
      prisma.refreshOperation.count({ where: { familyId: family.id } }),
    ).resolves.toBe(2);

    await service.logout(
      request(cookie(firstResponse, REFRESH_TOKEN)),
      response() as unknown as Response,
    );
    const terminalFamily = await prisma.refreshFamily.findUniqueOrThrow({
      where: { id: family.id },
    });
    expect(terminalFamily.status).toBe("TERMINATED");

    const terminalReplayResponse = response();
    await expect(
      service.refresh(
        request(initialToken, OPERATION_C),
        terminalReplayResponse as unknown as Response,
      ),
    ).rejects.toThrow("Refresh family is terminated");
    assertNoAuthCookies(terminalReplayResponse);
    await expect(
      prisma.refreshFamily.findUniqueOrThrow({ where: { id: family.id } }),
    ).resolves.toMatchObject({ status: "TERMINATED", currentVersion: 2 });
  });
});
