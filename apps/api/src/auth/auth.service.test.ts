/**
 * AuthService behavior tests for durable family rotation and recovery.
 * The Prisma surface is mocked in memory; no PostgreSQL process is required
 * for these transaction, proof, cookie, and terminal-state assertions.
 */
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequestTimeoutException, UnauthorizedException } from "@nestjs/common";
import { AuthService, type AuthUser } from "./auth.service.js";
import { DbService } from "../db/db.service.js";
import {
  REFRESH_OPERATION_TIMEOUT_MS,
  REFRESH_TOKEN,
  REFRESH_TRANSACTION_TIMEOUT_MS,
} from "./auth.constants.js";

const { compareMock } = vi.hoisted(() => ({
  compareMock: vi.fn<(password: string, hash: string) => Promise<boolean>>(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: compareMock },
}));

const ACTIVE_USER = {
  id: "u-1",
  email: "admin@test.com",
  displayName: "Admin",
  passwordHash: "hash",
  authVersion: 0,
  status: "ACTIVE" as const,
};

const OPERATION_A = "11111111-1111-4111-8111-111111111111";
const OPERATION_B = "22222222-2222-4222-8222-222222222222";

function mockRes() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    setHeader: vi.fn(),
  };
}

function mockReq(token?: string, operationId?: string, minEpoch?: number) {
  const headers: Record<string, string> = {};
  if (operationId) headers["x-refresh-operation-id"] = operationId;
  if (minEpoch !== undefined) headers["x-auth-min-epoch"] = String(minEpoch);
  return {
    cookies: token ? { [REFRESH_TOKEN]: token } : undefined,
    headers,
  } as unknown as import("express").Request;
}

function refreshCookie(res: ReturnType<typeof mockRes>): string {
  const call = res.cookie.mock.calls.find(([name]) => name === REFRESH_TOKEN);
  if (!call) throw new Error("refresh cookie was not set");
  return call[1] as string;
}

function expectNoAuthCookies(res: ReturnType<typeof mockRes>): void {
  expect(res.cookie).not.toHaveBeenCalled();
  expect(res.clearCookie).not.toHaveBeenCalled();
}

function makeFixture() {
  let tokenCounter = 0;
  const claims = new Map<string, Record<string, unknown>>();
  const families = new Map<string, Record<string, unknown>>();
  const operations = new Map<string, Record<string, unknown>>();
  const user = { ...ACTIVE_USER };

  const jwt = {
    sign: vi.fn(
      (
        payload: Record<string, unknown>,
        options?: { expiresIn?: number | string },
      ) => {
        const token =
          payload.type === "refresh"
            ? `refresh-${++tokenCounter}`
            : `access-${++tokenCounter}`;
        if (payload.type === "refresh") {
          const seconds =
            typeof options?.expiresIn === "number" ? options.expiresIn : 900;
          claims.set(token, {
            ...payload,
            exp: Math.floor(Date.now() / 1000) + seconds,
          });
        }
        return token;
      },
    ),
    verify: vi.fn((token: string) => {
      const value = claims.get(token);
      if (!value) throw new Error("invalid token");
      return value;
    }),
  };

  const client = {
    responsibleUser: {
      findUnique: vi.fn(
        async ({ where }: { where: { id?: string; email?: string } }) => {
          if (where.id === user.id || where.email === user.email) return user;
          return null;
        },
      ),
      update: vi.fn(
        async ({ data }: { data: { authVersion: { increment: number } } }) => {
          user.authVersion += data.authVersion.increment;
          return user;
        },
      ),
    },
    refreshSession: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    refreshFamily: {
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) =>
          families.get(where.id) ?? null,
      ),
      findMany: vi.fn(async () =>
        [...families.values()]
          .filter(
            (family) => family.userId === user.id && family.status === "ACTIVE",
          )
          .map((family) => ({ id: family.id as string })),
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        families.set(data.id as string, data);
        return data;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const family = families.get(where.id);
          if (!family) throw new Error("family not found");
          Object.assign(family, data);
          return family;
        },
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { userId?: string; status?: string };
          data: Record<string, unknown>;
        }) => {
          let count = 0;
          for (const family of families.values()) {
            if (
              (!where.userId || family.userId === where.userId) &&
              (!where.status || family.status === where.status)
            ) {
              Object.assign(family, data);
              count++;
            }
          }
          return { count };
        },
      ),
    },
    refreshOperation: {
      findFirst: vi.fn(
        async ({
          where,
          orderBy,
        }: {
          where: Record<string, unknown>;
          orderBy?: Record<string, string>;
        }) => {
          const rows = [...operations.values()].filter((operation) =>
            Object.entries(where).every(
              ([key, value]) => operation[key] === value,
            ),
          );
          const orderKey = orderBy ? Object.keys(orderBy)[0] : undefined;
          if (orderKey)
            rows.sort(
              (a, b) =>
                Number(b[orderKey] as Date) - Number(a[orderKey] as Date),
            );
          return rows[0] ?? null;
        },
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        operations.set(data.id as string, data);
        return data;
      }),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { familyId: string };
          data: Record<string, unknown>;
        }) => {
          let count = 0;
          for (const operation of operations.values()) {
            if (operation.familyId === where.familyId) {
              Object.assign(operation, data);
              count++;
            }
          }
          return { count };
        },
      ),
    },
    $queryRaw: vi.fn(
      async (_strings: TemplateStringsArray, familyId: string) =>
        families.has(familyId) ? [{ id: familyId }] : [],
    ),
    $transaction: vi.fn(),
  };

  // Model the database transaction boundary deterministically. This makes
  // Promise.all tests exercise the API's serialized contract without claiming
  // to replace PostgreSQL row-lock/contention coverage.
  let transactionTail = Promise.resolve();
  client.$transaction.mockImplementation(
    async (fn: (tx: typeof client) => Promise<unknown>) => {
      const previous = transactionTail;
      let release!: () => void;
      transactionTail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await fn(client);
      } finally {
        release();
      }
    },
  );

  return { client, jwt, claims, families, operations, user };
}

async function buildService() {
  compareMock.mockResolvedValue(true);
  const fixture = makeFixture();
  const module = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: JwtService, useValue: fixture.jwt },
      { provide: DbService, useValue: { client: fixture.client } },
      {
        provide: ConfigService,
        useValue: {
          getOrThrow: vi.fn(() => "unit-test-jwt-secret"),
        },
      },
    ],
  }).compile();
  return { service: module.get(AuthService), ...fixture };
}

describe("AuthService family contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates durable family state and encrypted initial lineage on login", async () => {
    const { service, families, operations, client } = await buildService();
    const res = mockRes();

    const result = await service.login(
      { email: ACTIVE_USER.email, password: "password123" },
      res as unknown as import("express").Response,
    );

    expect(result).toEqual<AuthUser>({
      id: ACTIVE_USER.id,
      email: ACTIVE_USER.email,
      displayName: ACTIVE_USER.displayName,
    });
    expect(families.size).toBe(1);
    expect(operations.size).toBe(1);
    expect([...families.values()][0]).toMatchObject({
      currentVersion: 1,
      status: "ACTIVE",
    });
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(client.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: "Serializable",
        timeout: expect.any(Number),
      }),
    );
  });

  it("converges concurrent/stale callers to the same current-family result", async () => {
    const { service } = await buildService();
    const loginRes = mockRes();
    await service.login(
      { email: ACTIVE_USER.email, password: "password123" },
      loginRes as unknown as import("express").Response,
    );
    const firstToken = refreshCookie(loginRes);

    const firstRes = mockRes();
    const secondRes = mockRes();
    const [first, replay] = await Promise.all([
      service.refresh(
        mockReq(firstToken, OPERATION_A),
        firstRes as unknown as import("express").Response,
      ),
      service.refresh(
        mockReq(firstToken, OPERATION_B),
        secondRes as unknown as import("express").Response,
      ),
    ]);

    expect(first).toEqual(replay);
    expect(refreshCookie(firstRes)).toBe(refreshCookie(secondRes));
  });

  it("serializes a headerless legacy caller with an identified caller", async () => {
    const { service, families, operations } = await buildService();
    const loginRes = mockRes();
    await service.login(
      { email: ACTIVE_USER.email, password: "password123" },
      loginRes as unknown as import("express").Response,
    );
    const legacyToken = refreshCookie(loginRes);
    const legacyRes = mockRes();
    const identifiedRes = mockRes();

    const [legacy, identified] = await Promise.all([
      service.refresh(
        mockReq(legacyToken),
        legacyRes as unknown as import("express").Response,
      ),
      service.refresh(
        mockReq(legacyToken, OPERATION_B),
        identifiedRes as unknown as import("express").Response,
      ),
    ]);

    expect(legacy).toEqual(identified);
    expect(refreshCookie(legacyRes)).toBe(refreshCookie(identifiedRes));
    expect([...families.values()][0]).toMatchObject({ currentVersion: 2 });
    expect(operations.size).toBe(2);
    expect(legacyRes.setHeader).toHaveBeenCalledWith(
      "x-refresh-family-version",
      "2",
    );
    expect(identifiedRes.setHeader).toHaveBeenCalledWith(
      "x-refresh-family-version",
      "2",
    );
  });

  it("returns the exact operation result for a valid identified retry", async () => {
    const { service } = await buildService();
    const loginRes = mockRes();
    await service.login(
      { email: ACTIVE_USER.email, password: "password123" },
      loginRes as unknown as import("express").Response,
    );
    const token = refreshCookie(loginRes);

    const firstRes = mockRes();
    const first = await service.refresh(
      mockReq(token, OPERATION_A),
      firstRes as unknown as import("express").Response,
    );
    const retryRes = mockRes();
    const retry = await service.refresh(
      mockReq(token, OPERATION_A),
      retryRes as unknown as import("express").Response,
    );

    expect(retry).toEqual(first);
    expect(refreshCookie(retryRes)).toBe(refreshCookie(firstRes));
  });

  it("treats X-Auth-Min-Epoch as compatibility input, not family authority", async () => {
    const { service } = await buildService();
    const loginRes = mockRes();
    await service.login(
      { email: ACTIVE_USER.email, password: "password123" },
      loginRes as unknown as import("express").Response,
    );
    const token = refreshCookie(loginRes);
    const firstRes = mockRes();
    const first = await service.refresh(
      mockReq(token, OPERATION_A),
      firstRes as unknown as import("express").Response,
    );

    const replayRes = mockRes();
    const replay = await service.refresh(
      mockReq(token, OPERATION_B, 999),
      replayRes as unknown as import("express").Response,
    );

    expect(replay).toEqual(first);
    expect(replayRes.setHeader).toHaveBeenCalledWith(
      "x-refresh-family-version",
      "2",
    );
    expect(refreshCookie(replayRes)).toBe(refreshCookie(firstRes));
  });

  it("rejects proof mismatch and expired bounded replay", async () => {
    const { service, operations } = await buildService();
    const loginRes = mockRes();
    await service.login(
      { email: ACTIVE_USER.email, password: "password123" },
      loginRes as unknown as import("express").Response,
    );
    const token = refreshCookie(loginRes);
    await service.refresh(
      mockReq(token, OPERATION_A),
      mockRes() as unknown as import("express").Response,
    );

    const operation = [...operations.values()].find(
      (row) => row.presentedVersion === 1,
    );
    if (!operation) throw new Error("refresh operation was not recorded");
    const validProofHash = operation.presentedProofHash;
    operation.presentedProofHash = "wrong-proof";
    const proofMismatchRes = mockRes();
    await expect(
      service.refresh(
        mockReq(token, OPERATION_B),
        proofMismatchRes as unknown as import("express").Response,
      ),
    ).rejects.toThrow(UnauthorizedException);
    expectNoAuthCookies(proofMismatchRes);

    operation.presentedProofHash = validProofHash;
    operation.replayUntil = new Date(Date.now() - 1);
    const expiredReplayRes = mockRes();
    await expect(
      service.refresh(
        mockReq(token, OPERATION_B),
        expiredReplayRes as unknown as import("express").Response,
      ),
    ).rejects.toThrow("Refresh replay proof is invalid or expired");
    expectNoAuthCookies(expiredReplayRes);
  });

  it("rejects malformed lineage, signed-lineage mismatch, and future versions without cookies", async () => {
    const { service, claims } = await buildService();
    const loginRes = mockRes();
    await service.login(
      { email: ACTIVE_USER.email, password: "password123" },
      loginRes as unknown as import("express").Response,
    );
    const token = refreshCookie(loginRes);
    const initialClaims = claims.get(token);
    if (!initialClaims)
      throw new Error("initial refresh claims were not recorded");

    const malformedToken = "malformed-lineage";
    claims.set(malformedToken, {
      ...initialClaims,
      issuedByOperationId: undefined,
    });
    const malformedRes = mockRes();
    await expect(
      service.refresh(
        mockReq(malformedToken, OPERATION_A),
        malformedRes as unknown as import("express").Response,
      ),
    ).rejects.toThrow("Invalid refresh token lineage");
    expectNoAuthCookies(malformedRes);

    const validIssuedByOperationId = initialClaims.issuedByOperationId;
    const rotationRes = mockRes();
    await service.refresh(
      mockReq(token, OPERATION_A),
      rotationRes as unknown as import("express").Response,
    );
    const currentToken = refreshCookie(rotationRes);
    initialClaims.issuedByOperationId = "signed-lineage-mismatch";
    const lineageRes = mockRes();
    await expect(
      service.refresh(
        mockReq(token, OPERATION_B),
        lineageRes as unknown as import("express").Response,
      ),
    ).rejects.toThrow("Refresh replay proof is invalid or expired");
    expectNoAuthCookies(lineageRes);

    initialClaims.issuedByOperationId = validIssuedByOperationId;
    const currentClaims = claims.get(currentToken);
    if (!currentClaims)
      throw new Error("current refresh claims were not recorded");
    const futureToken = "future-version";
    claims.set(futureToken, { ...currentClaims, version: 99 });
    const futureRes = mockRes();
    await expect(
      service.refresh(
        mockReq(futureToken, OPERATION_B),
        futureRes as unknown as import("express").Response,
      ),
    ).rejects.toThrow("Refresh token version is ahead of family state");
    expectNoAuthCookies(futureRes);
  });

  it("terminates the whole family and increments authVersion atomically on logout", async () => {
    const { service, families, operations, user } = await buildService();
    const loginRes = mockRes();
    await service.login(
      { email: ACTIVE_USER.email, password: "password123" },
      loginRes as unknown as import("express").Response,
    );
    const token = refreshCookie(loginRes);
    const logoutRes = mockRes();

    await service.logout(
      mockReq(token),
      logoutRes as unknown as import("express").Response,
    );

    expect([...families.values()][0]).toMatchObject({ status: "TERMINATED" });
    expect(
      [...operations.values()].every((row) => row.status === "INVALIDATED"),
    ).toBe(true);
    expect(user.authVersion).toBe(1);
    const terminalRefreshRes = mockRes();
    await expect(
      service.refresh(
        mockReq(token, OPERATION_A),
        terminalRefreshRes as unknown as import("express").Response,
      ),
    ).rejects.toThrow("Refresh family is terminated");
    expectNoAuthCookies(terminalRefreshRes);
    expect(logoutRes.clearCookie).toHaveBeenCalledTimes(3);
  });

  it("retries only a bounded Serializable P2034 conflict", async () => {
    const { service, client } = await buildService();
    const transaction = client.$transaction;
    transaction.mockRejectedValueOnce(
      Object.assign(new Error("conflict"), { code: "P2034" }),
    );
    const res = mockRes();

    await service.login(
      { email: ACTIVE_USER.email, password: "password123" },
      res as unknown as import("express").Response,
    );

    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("emits structured telemetry when Serializable retries are exhausted", async () => {
    const { service, client } = await buildService();
    const transaction = client.$transaction;
    const conflict = Object.assign(new Error("serialization conflict"), {
      code: "P2034",
    });
    transaction.mockRejectedValue(conflict);
    const warn = vi.spyOn(
      (service as unknown as { logger: { warn: (...args: unknown[]) => void } })
        .logger,
      "warn",
    );

    await expect(
      service.login(
        { email: ACTIVE_USER.email, password: "password123" },
        mockRes() as unknown as import("express").Response,
      ),
    ).rejects.toBe(conflict);

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.serializable_conflict_exhausted",
      }),
      "Serializable auth transaction retries exhausted",
    );
  });

  it("emits structured telemetry when the transaction deadline expires", async () => {
    const { service, client } = await buildService();
    const deadlineError = Object.assign(new Error("transaction timeout"), {
      code: "P2028",
    });
    client.$transaction.mockRejectedValue(deadlineError);
    const warn = vi.spyOn(
      (service as unknown as { logger: { warn: (...args: unknown[]) => void } })
        .logger,
      "warn",
    );

    await expect(
      service.login(
        { email: ACTIVE_USER.email, password: "password123" },
        mockRes() as unknown as import("express").Response,
      ),
    ).rejects.toBe(deadlineError);

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.transaction_deadline_exceeded",
      }),
      "Auth transaction deadline exceeded",
    );
  });

  it("maps the absolute operation deadline while preserving transaction bounds", async () => {
    const { service, client } = await buildService();
    const transaction = client.$transaction;
    const warn = vi.spyOn(
      (service as unknown as { logger: { warn: (...args: unknown[]) => void } })
        .logger,
      "warn",
    );
    const conflict = Object.assign(new Error("serialization conflict"), {
      code: "P2034",
    });
    let expired = false;
    const start = Date.now();
    const nowSpy = vi
      .spyOn(Date, "now")
      .mockImplementation(() =>
        expired ? start + REFRESH_OPERATION_TIMEOUT_MS + 1 : start,
      );
    transaction.mockImplementationOnce(async () => {
      expired = true;
      throw conflict;
    });

    try {
      await expect(
        service.login(
          { email: ACTIVE_USER.email, password: "password123" },
          mockRes() as unknown as import("express").Response,
        ),
      ).rejects.toThrow(RequestTimeoutException);
    } finally {
      nowSpy.mockRestore();
    }

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.operation_deadline_exceeded",
      }),
      "Auth operation deadline exceeded",
    );
    expect(transaction.mock.calls[0]?.[1]).toMatchObject({
      isolationLevel: "Serializable",
      timeout: REFRESH_TRANSACTION_TIMEOUT_MS,
      maxWait: 1_000,
    });
  });
});
