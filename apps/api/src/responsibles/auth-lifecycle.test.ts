/**
 * Auth lifecycle integration test (AR-02, AR-03, AR-04).
 *
 * Exercises the complete auth flow sequentially: login → refresh →
 * logout → refresh-rejected. Uses a real AuthService wired with
 * mocked DbService + JwtService to verify lifecycle correctness
 * across multiple operations without real JWT/DB/crypto.
 *
 * This test proves that:
 * - A session created by login can be refreshed (AR-02)
 * - Logout revokes the session and clears cookies (AR-03)
 * - A revoked session is rejected on refresh (AR-02)
 * - Multiple independent sessions per user are supported (AR-04)
 *
 * The bcryptjs mock uses a Map from password→result for deterministic
 * per-password matching. The crypto mock returns deterministic hashes
 * based on the input token string so the stateful DB can distinguish
 * sessions created at different points in the lifecycle.
 */
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- hoisted mocks --------------------------------------------------------
const { compareMock } = vi.hoisted(() => ({
  compareMock: vi.fn<(password: string, hash: string) => Promise<boolean>>(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: compareMock,
  },
}));

let currentUpdateValue = "";

const { randomBytesMock, createHashMock } = vi.hoisted(() => ({
  randomBytesMock: vi.fn(),
  createHashMock: {
    update: vi.fn(),
    digest: vi.fn(),
  },
}));

// Wire the mock so digest returns a deterministic hash based on the
// last value passed to update(), regardless of interleaved calls.
createHashMock.update.mockImplementation((val: string) => {
  currentUpdateValue = val;
  return createHashMock;
});
createHashMock.digest.mockImplementation(() => {
  return `hashed:${currentUpdateValue}`;
});

vi.mock("node:crypto", () => ({
  createHash: vi.fn(() => createHashMock),
  randomBytes: randomBytesMock,
}));

// ---- imports after mocks --------------------------------------------------
import { AuthService } from "../auth/auth.service.js";
import { DbService } from "../db/db.service.js";
import { REFRESH_TOKEN } from "../auth/auth.constants.js";

// ---- helpers --------------------------------------------------------------

function mockRes() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

function mockReq(cookies?: Record<string, string>) {
  return { cookies } as unknown as import("express").Request;
}

interface DbRow {
  id: string;
  userId?: string;
  tokenHash?: string;
  status: string;
  expiresAt: Date;
  revokedAt: Date | null;
  email?: string;
  displayName?: string;
  passwordHash?: string;
  authVersion?: number;
}

/**
 * Builds a stateful mock DbService that tracks users and sessions
 * in memory across multiple operations. Sessions are indexed by both
 * id and tokenHash so they can be found by either lookup path.
 */
function makeStatefulDb() {
  const users = new Map<string, DbRow>();
  const sessions = new Map<string, DbRow>();

  const alice = {
    id: "u-1",
    email: "alice@test.com",
    displayName: "Alice",
    passwordHash: "$2b$hashed",
    authVersion: 0,
    status: "ACTIVE" as const,
    expiresAt: new Date(0),
    revokedAt: null,
  };

  // Index by both id and email so lookups via either key work.
  users.set("u-1", alice);
  users.set("alice@test.com", alice);

  const client = {
    responsibleUser: {
      findUnique: vi.fn(
        async (args: { where: { id?: string; email?: string } }) => {
          const key = args.where["email"] ?? args.where["id"];
          return users.get(key as string) ?? null;
        },
      ),
      update: vi.fn(
        async (args: {
          where: { id: string };
          data: { authVersion?: { increment: number } };
        }) => {
          const user = users.get(args.where.id);
          if (!user) throw new Error("User not found");
          if (args.data.authVersion) {
            user.authVersion =
              (user.authVersion ?? 0) + args.data.authVersion.increment;
          }
          return user;
        },
      ),
    },
    refreshSession: {
      findUnique: vi.fn(
        async (args: { where: { tokenHash?: string; id?: string } }) => {
          const key = args.where["tokenHash"] ?? args.where["id"];
          return sessions.get(key as string) ?? null;
        },
      ),
      create: vi.fn(async (args: { data: DbRow }) => {
        const id = `s-${sessions.size / 2 + 1}`; // divide by 2 because we index twice
        const row = { ...args.data, id };
        sessions.set(row.tokenHash!, row);
        sessions.set(row.id, row);
        return row;
      }),
      updateMany: vi.fn(
        async (args: {
          where: {
            id?: string;
            userId?: string;
            tokenHash?: string;
            status: string;
          };
          data: { status: string; revokedAt: Date };
        }) => {
          let count = 0;
          for (const [key, session] of sessions) {
            // Only iterate sessions indexed by id (skip tokenHash-indexed duplicates).
            if (!key.startsWith("s-")) continue;

            let match = true;
            if (args.where["id"] && session.id !== args.where["id"])
              match = false;
            if (args.where["userId"] && session.userId !== args.where["userId"])
              match = false;
            if (
              args.where["tokenHash"] &&
              session.tokenHash !== args.where["tokenHash"]
            )
              match = false;
            if (args.where["status"] && session.status !== args.where["status"])
              match = false;
            if (match) {
              session.status = args.data.status;
              session.revokedAt = args.data.revokedAt;
              count++;
            }
          }
          return { count };
        },
      ),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(client),
    ),
  };

  return { client };
}

// ---- tests ----------------------------------------------------------------

describe("Auth lifecycle (AR-02, AR-03, AR-04)", () => {
  let tokenCounter: number;

  beforeEach(() => {
    vi.clearAllMocks();
    tokenCounter = 0;

    // Each call to randomBytes returns a unique raw token string.
    randomBytesMock.mockReturnValue({
      toString: () => {
        tokenCounter++;
        return `raw-token-${tokenCounter}`;
      },
    });

    compareMock.mockResolvedValue(true);
  });

  async function buildService(): Promise<AuthService> {
    const dbValue = makeStatefulDb();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { sign: vi.fn().mockReturnValue("jwt-access-token") },
        },
        { provide: DbService, useValue: dbValue },
      ],
    }).compile();

    return module.get(AuthService);
  }

  // ---- full lifecycle -----------------------------------------------------

  it("completes login → refresh → logout → refresh-rejected (AR-02, AR-03)", async () => {
    const service = await buildService();

    // 1. Login → creates session with raw-token-1 (hash: "hashed:raw-token-1")
    const loginRes = mockRes();
    const user = await service.login(
      { email: "alice@test.com", password: "password123" },
      loginRes as unknown as import("express").Response,
    );

    expect(user.email).toBe("alice@test.com");
    expect(loginRes.cookie).toHaveBeenCalledTimes(2);
    expect(loginRes.clearCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN,
      expect.objectContaining({ path: "/auth/refresh" }),
    );

    // 2. Refresh with raw-token-1 → should rotate to new tokens,
    //    revoking the old session and creating a new one with raw-token-2.
    const refreshRes = mockRes();
    const refreshReq = mockReq({ [REFRESH_TOKEN]: "raw-token-1" });

    const refreshedUser = await service.refresh(
      refreshReq,
      refreshRes as unknown as import("express").Response,
    );

    expect(refreshedUser.email).toBe("alice@test.com");
    expect(refreshRes.cookie).toHaveBeenCalledTimes(2);
    expect(refreshRes.clearCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN,
      expect.objectContaining({ path: "/auth/refresh" }),
    );

    // 3. Logout with the new token (raw-token-2) → revokes session
    const logoutRes = mockRes();
    const logoutReq = mockReq({ [REFRESH_TOKEN]: "raw-token-2" });

    await service.logout(
      logoutReq,
      logoutRes as unknown as import("express").Response,
    );

    expect(logoutRes.clearCookie).toHaveBeenCalledTimes(3);
    expect(logoutRes.clearCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN,
      expect.objectContaining({ path: "/auth/refresh" }),
    );

    // 4. Refresh with raw-token-2 (now revoked) → should fail with 401
    // without clearing cookies, because another refresh response may already
    // have installed a newer token in the browser.
    const badRefreshRes = mockRes();
    const badRefreshReq = mockReq({ [REFRESH_TOKEN]: "raw-token-2" });

    await expect(
      service.refresh(
        badRefreshReq,
        badRefreshRes as unknown as import("express").Response,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(badRefreshRes.clearCookie).not.toHaveBeenCalled();
  });

  // ---- Multiple independent sessions (AR-04) ------------------------------

  it("supports multiple independent sessions per user (AR-04)", async () => {
    const service = await buildService();

    // Session 1: login on device A (raw-token-1)
    const res1 = mockRes();
    await service.login(
      { email: "alice@test.com", password: "password123" },
      res1 as unknown as import("express").Response,
    );

    // Session 2: login on device B (raw-token-2)
    const res2 = mockRes();
    await service.login(
      { email: "alice@test.com", password: "password123" },
      res2 as unknown as import("express").Response,
    );

    // Logout from device A only
    const logoutRes1 = mockRes();
    await service.logout(
      mockReq({ [REFRESH_TOKEN]: "raw-token-1" }),
      logoutRes1 as unknown as import("express").Response,
    );

    // Device B should still work — refresh with session 2 token
    const refreshRes2 = mockRes();
    const user = await service.refresh(
      mockReq({ [REFRESH_TOKEN]: "raw-token-2" }),
      refreshRes2 as unknown as import("express").Response,
    );

    expect(user.email).toBe("alice@test.com");
    expect(refreshRes2.cookie).toHaveBeenCalledTimes(2);
  });

  // ---- Inactive user enforcement (AR-05) ----------------------------------

  it("rejects login with 403 when user is inactive (AR-05)", async () => {
    // Override the user lookup to return INACTIVE.
    const dbValue = makeStatefulDb();
    const client = dbValue.client as unknown as {
      responsibleUser: { findUnique: ReturnType<typeof vi.fn> };
    };

    client.responsibleUser.findUnique.mockImplementation(
      async (args: { where: { id?: string; email?: string } }) => {
        const key = args.where["email"] ?? args.where["id"];
        if (key === "alice@test.com" || key === "u-1") {
          return {
            id: "u-1",
            email: "alice@test.com",
            displayName: "Alice",
            passwordHash: "$2b$hashed",
            status: "INACTIVE",
          };
        }
        return null;
      },
    );

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { sign: vi.fn() },
        },
        { provide: DbService, useValue: dbValue },
      ],
    }).compile();

    const service = module.get(AuthService);

    const loginRes = mockRes();
    await expect(
      service.login(
        { email: "alice@test.com", password: "password123" },
        loginRes as unknown as import("express").Response,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
