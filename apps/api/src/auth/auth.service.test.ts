/**
 * AuthService unit tests (AR-01, AR-02, AR-03).
 *
 * Proves login, refresh, logout, and session lifecycle using mocked
 * DbService + JwtService. Follows the pattern from db.service.test.ts:
 * Test.createTestingModule with explicit provider overrides.
 *
 * bcryptjs and node:crypto are mocked at the module level so tests are
 * deterministic and never perform real hashing.
 */
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
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

const { randomBytesMock, createHashMock } = vi.hoisted(() => ({
  randomBytesMock: vi.fn(),
  createHashMock: {
    update: vi.fn(),
    digest: vi.fn(),
  },
}));

vi.mock("node:crypto", () => ({
  createHash: vi.fn(() => createHashMock),
  randomBytes: randomBytesMock,
}));

// ---- imports after mocks --------------------------------------------------
import { AuthService, type AuthUser } from "./auth.service.js";
import { DbService } from "../db/db.service.js";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./auth.constants.js";

// ---- helpers --------------------------------------------------------------

interface MockResponse {
  cookie: ReturnType<typeof vi.fn>;
  clearCookie: ReturnType<typeof vi.fn>;
}

function mockRes(): MockResponse {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

function mockReq(cookies?: Record<string, string>) {
  return { cookies } as unknown as import("express").Request;
}

interface SessionOverride {
  id: string;
  userId: string;
  tokenHash: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  expiresAt: Date;
  revokedAt: Date | null;
}

interface UserOverride {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  authVersion: number;
  status: "ACTIVE" | "INACTIVE";
}

interface MockDbOverrides {
  user?: UserOverride | null;
  session?: SessionOverride | null;
}

/**
 * Builds a DbService mock whose client exposes stubbed Prisma models.
 * Each call to makeDbService returns fresh vi.fn() mocks so per-test
 * assertions don't interfere.
 */
function makeDbValue(overrides: MockDbOverrides = {}) {
  const refreshSession = {
    findUnique: vi.fn().mockResolvedValue(overrides.session ?? null),
    create: vi.fn().mockResolvedValue({ id: "new-session-id" }),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };

  const client = {
    responsibleUser: {
      findUnique: vi.fn().mockResolvedValue(overrides.user ?? null),
      update: vi.fn().mockResolvedValue({}),
    },
    refreshSession,
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(client),
    ),
  };

  return {
    client,
  };
}

const ACTIVE_USER: UserOverride = {
  id: "u-1",
  email: "a@test.com",
  displayName: "Alice",
  passwordHash: "$2b$hashed",
  authVersion: 0,
  status: "ACTIVE",
};

const INACTIVE_USER: UserOverride = {
  ...ACTIVE_USER,
  id: "u-2",
  email: "b@test.com",
  displayName: "Bob",
  status: "INACTIVE",
};

// ---- test helpers ---------------------------------------------------------

interface ServiceFixture {
  service: AuthService;
  signSpy: ReturnType<typeof vi.fn>;
  dbValue: ReturnType<typeof makeDbValue>;
}

async function buildService(
  dbOverrides: MockDbOverrides = {},
): Promise<ServiceFixture> {
  const signSpy = vi.fn().mockReturnValue("jwt-access-token");
  randomBytesMock.mockReturnValue({ toString: () => "raw-refresh-token" });
  createHashMock.update.mockReturnValue(createHashMock);
  createHashMock.digest.mockReturnValue("hashed-refresh-token");

  const dbValue = makeDbValue(dbOverrides);

  const module = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: JwtService, useValue: { sign: signSpy } },
      { provide: DbService, useValue: dbValue },
    ],
  }).compile();

  return {
    service: module.get(AuthService),
    signSpy,
    dbValue,
  };
}

// ---- tests ----------------------------------------------------------------

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- AR-01: Login -------------------------------------------------------

  describe("login (AR-01)", () => {
    it("returns user and sets cookies on valid credentials", async () => {
      compareMock.mockResolvedValue(true);
      const { service, signSpy, dbValue } = await buildService({
        user: ACTIVE_USER,
      });

      const res = mockRes();
      const result = await service.login(
        { email: ACTIVE_USER.email, password: "valid-password" },
        res as unknown as import("express").Response,
      );

      expect(result).toEqual<AuthUser>({
        id: ACTIVE_USER.id,
        email: ACTIVE_USER.email,
        displayName: ACTIVE_USER.displayName,
      });
      expect(signSpy).toHaveBeenCalledWith(
        { sub: ACTIVE_USER.id, type: "access", authVersion: 0 },
        { expiresIn: "15m" },
      );
      expect(res.cookie).toHaveBeenCalledWith(
        ACCESS_TOKEN,
        "jwt-access-token",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_TOKEN,
        "raw-refresh-token",
        expect.objectContaining({ httpOnly: true, path: "/" }),
      );
      expect(dbValue.client.refreshSession.create).toHaveBeenCalled();
    });

    it("throws 401 on invalid password", async () => {
      compareMock.mockResolvedValue(false);
      const { service } = await buildService({ user: ACTIVE_USER });

      const res = mockRes();
      await expect(
        service.login(
          { email: ACTIVE_USER.email, password: "wrong" },
          res as unknown as import("express").Response,
        ),
      ).rejects.toThrow("Invalid credentials");

      expect(res.cookie).not.toHaveBeenCalled();
    });

    it("throws 401 when user not found", async () => {
      const { service } = await buildService({ user: null });

      const res = mockRes();
      await expect(
        service.login(
          { email: "nope@test.com", password: "x" },
          res as unknown as import("express").Response,
        ),
      ).rejects.toThrow("Invalid credentials");
    });

    it("throws 403 for inactive user", async () => {
      const { service } = await buildService({ user: INACTIVE_USER });

      const res = mockRes();
      await expect(
        service.login(
          { email: INACTIVE_USER.email, password: "x" },
          res as unknown as import("express").Response,
        ),
      ).rejects.toThrow("User is inactive");

      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  // ---- AR-02: Refresh -----------------------------------------------------

  describe("refresh (AR-02)", () => {
    const ACTIVE_SESSION: SessionOverride = {
      id: "s-1",
      userId: ACTIVE_USER.id,
      tokenHash: "hashed-refresh-token",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
    };

    it("rotates session and sets new cookies on valid refresh", async () => {
      const { service, dbValue } = await buildService({
        user: ACTIVE_USER,
        session: ACTIVE_SESSION,
      });

      const req = mockReq({ refresh_token: "raw-refresh-token" });
      const res = mockRes();
      const result = await service.refresh(
        req,
        res as unknown as import("express").Response,
      );

      expect(result).toEqual<AuthUser>({
        id: ACTIVE_USER.id,
        email: ACTIVE_USER.email,
        displayName: ACTIVE_USER.displayName,
      });
      // Old session revoked inside the same transaction that creates the new one.
      expect(dbValue.client.$transaction).toHaveBeenCalledTimes(1);
      expect(dbValue.client.refreshSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ACTIVE_SESSION.id, status: "ACTIVE" },
          data: expect.objectContaining({ status: "REVOKED" }),
        }),
      );
      // New session created
      expect(dbValue.client.refreshSession.create).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });

    it("rejects a concurrent rotation when another request already revoked the session", async () => {
      const { service, dbValue } = await buildService({
        user: ACTIVE_USER,
        session: ACTIVE_SESSION,
      });
      dbValue.client.refreshSession.updateMany.mockResolvedValueOnce({
        count: 0,
      });

      const req = mockReq({ refresh_token: "raw-refresh-token" });
      const res = mockRes();

      await expect(
        service.refresh(req, res as unknown as import("express").Response),
      ).rejects.toThrow("Invalid or revoked token");

      expect(dbValue.client.$transaction).toHaveBeenCalledTimes(1);
      expect(dbValue.client.refreshSession.create).not.toHaveBeenCalled();
    });

    it("throws 401 and clears cookies for revoked token", async () => {
      const revokedSession = {
        ...ACTIVE_SESSION,
        status: "REVOKED" as const,
      };
      const { service } = await buildService({
        user: ACTIVE_USER,
        session: revokedSession,
      });

      const req = mockReq({ refresh_token: "old-token" });
      const res = mockRes();

      await expect(
        service.refresh(req, res as unknown as import("express").Response),
      ).rejects.toThrow("Invalid or revoked token");

      expect(res.clearCookie).toHaveBeenCalledWith(
        ACCESS_TOKEN,
        expect.any(Object),
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        REFRESH_TOKEN,
        expect.any(Object),
      );
    });

    it("throws 401 and clears cookies when cookie is missing", async () => {
      const { service } = await buildService();

      const req = mockReq(undefined);
      const res = mockRes();

      await expect(
        service.refresh(req, res as unknown as import("express").Response),
      ).rejects.toThrow("Missing refresh token");

      expect(res.clearCookie).toHaveBeenCalled();
    });

    it("throws 403 and clears cookies for inactive user", async () => {
      const { service } = await buildService({
        user: INACTIVE_USER,
        session: ACTIVE_SESSION,
      });

      const req = mockReq({ refresh_token: "raw-refresh-token" });
      const res = mockRes();

      await expect(
        service.refresh(req, res as unknown as import("express").Response),
      ).rejects.toThrow("User is inactive");

      expect(res.clearCookie).toHaveBeenCalled();
    });
  });

  // ---- AR-03: Logout ------------------------------------------------------

  describe("logout (AR-03)", () => {
    it("revokes session and clears cookies", async () => {
      const ACTIVE_SESSION: SessionOverride = {
        id: "s-1",
        userId: ACTIVE_USER.id,
        tokenHash: "hashed-refresh-token",
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: null,
      };
      const { service, dbValue } = await buildService({
        session: ACTIVE_SESSION,
      });

      const req = mockReq({ refresh_token: "raw-refresh-token" });
      const res = mockRes();

      await service.logout(req, res as unknown as import("express").Response);

      expect(dbValue.client.refreshSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenHash: ACTIVE_SESSION.tokenHash, status: "ACTIVE" },
          data: expect.objectContaining({ status: "REVOKED" }),
        }),
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        ACCESS_TOKEN,
        expect.objectContaining({ path: "/" }),
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        REFRESH_TOKEN,
        expect.objectContaining({ path: "/" }),
      );
    });

    it("uses a root-scoped refresh cookie so browser logout sends the current session token", async () => {
      compareMock.mockResolvedValue(true);
      const { service } = await buildService({ user: ACTIVE_USER });

      const res = mockRes();
      await service.login(
        { email: ACTIVE_USER.email, password: "valid-password" },
        res as unknown as import("express").Response,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_TOKEN,
        "raw-refresh-token",
        expect.objectContaining({ path: "/" }),
      );
    });

    it("clears cookies even when token is missing (idempotent)", async () => {
      const { service } = await buildService();

      const req = mockReq(undefined);
      const res = mockRes();

      await service.logout(req, res as unknown as import("express").Response);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  // ---- revokeAllUserSessions ----------------------------------------------

  describe("revokeAllUserSessions", () => {
    it("increments authVersion and revokes all ACTIVE refresh sessions", async () => {
      const { service, dbValue } = await buildService();

      await service.revokeAllUserSessions("u-1");

      expect(dbValue.client.$transaction).toHaveBeenCalledTimes(1);
      expect(dbValue.client.responsibleUser.update).toHaveBeenCalledWith({
        where: { id: "u-1" },
        data: { authVersion: { increment: 1 } },
      });
      expect(dbValue.client.refreshSession.updateMany).toHaveBeenCalledWith({
        where: { userId: "u-1", status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: expect.any(Date) as Date },
      });
    });
  });
});
