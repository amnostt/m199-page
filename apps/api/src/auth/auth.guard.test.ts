/**
 * AuthGuard unit tests (AR-05).
 *
 * Proves JWT verification, cookie extraction, and active-status enforcement
 * using mocked JwtService + DbService. Follows the direct-instantiation
 * pattern from health.controller.test.ts for simplicity — AuthGuard only
 * depends on two injectables with no lifecycle hooks.
 */
import { JwtService } from "@nestjs/jwt";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthGuard, type AuthenticatedRequest } from "./auth.guard.js";
import { DbService } from "../db/db.service.js";
import { ACCESS_TOKEN } from "./auth.constants.js";

// ---- helpers --------------------------------------------------------------

function makeExecutionContext(cookies?: Record<string, unknown>) {
  const req: Record<string, unknown> = { cookies };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

function makeDbService(
  user: {
    id: string;
    email: string;
    displayName: string;
    authVersion: number;
    status: "ACTIVE" | "INACTIVE";
  } | null,
) {
  return {
    client: {
      responsibleUser: {
        findUnique: vi.fn().mockResolvedValue(user),
      },
    },
  } as unknown as DbService;
}

const ACTIVE_USER = {
  id: "u-1",
  email: "a@test.com",
  displayName: "Alice",
  authVersion: 0,
  status: "ACTIVE" as const,
};

const INACTIVE_USER = {
  ...ACTIVE_USER,
  id: "u-2",
  status: "INACTIVE" as const,
};

// ---- tests ----------------------------------------------------------------

describe("AuthGuard", () => {
  let verifySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    verifySpy = vi.fn();
  });

  // ---- missing token ------------------------------------------------------

  it("throws 401 when access_token cookie is missing", async () => {
    const jwt = { verify: verifySpy } as unknown as JwtService;
    const db = makeDbService(null);
    const guard = new AuthGuard(jwt, db);
    const ctx = makeExecutionContext(undefined);

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException("Missing access token"),
    );
    expect(verifySpy).not.toHaveBeenCalled();
  });

  // ---- invalid JWT --------------------------------------------------------

  it("throws 401 when JWT verification fails", async () => {
    verifySpy.mockImplementation(() => {
      throw new Error("jwt malformed");
    });
    const jwt = { verify: verifySpy } as unknown as JwtService;
    const db = makeDbService(null);
    const guard = new AuthGuard(jwt, db);
    const ctx = makeExecutionContext({ [ACCESS_TOKEN]: "bad-token" });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException("Invalid or expired access token"),
    );
  });

  // ---- wrong token type ---------------------------------------------------

  it("throws 401 when token type is not 'access'", async () => {
    verifySpy.mockReturnValue({ sub: "u-1", type: "refresh", authVersion: 0 });
    const jwt = { verify: verifySpy } as unknown as JwtService;
    const db = makeDbService(null);
    const guard = new AuthGuard(jwt, db);
    const ctx = makeExecutionContext({ [ACCESS_TOKEN]: "refresh-token" });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException("Invalid token type"),
    );
  });

  // ---- user not found -----------------------------------------------------

  it("throws 401 when user is not found in DB", async () => {
    verifySpy.mockReturnValue({ sub: "u-1", type: "access", authVersion: 0 });
    const jwt = { verify: verifySpy } as unknown as JwtService;
    const db = makeDbService(null);
    const guard = new AuthGuard(jwt, db);
    const ctx = makeExecutionContext({ [ACCESS_TOKEN]: "valid-token" });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException("User not found"),
    );
  });

  // ---- inactive user ------------------------------------------------------

  it("throws 403 when user is INACTIVE (AR-05)", async () => {
    verifySpy.mockReturnValue({ sub: "u-2", type: "access", authVersion: 0 });
    const jwt = { verify: verifySpy } as unknown as JwtService;
    const db = makeDbService(INACTIVE_USER);
    const guard = new AuthGuard(jwt, db);
    const ctx = makeExecutionContext({ [ACCESS_TOKEN]: "valid-token" });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenException("User is inactive"),
    );
  });

  it("throws 401 when the token authVersion is stale after session revocation", async () => {
    verifySpy.mockReturnValue({ sub: "u-1", type: "access", authVersion: 0 });
    const jwt = { verify: verifySpy } as unknown as JwtService;
    const db = makeDbService({ ...ACTIVE_USER, authVersion: 1 });
    const guard = new AuthGuard(jwt, db);
    const ctx = makeExecutionContext({ [ACCESS_TOKEN]: "old-token" });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException("Access token has been revoked"),
    );
  });

  it("throws 401 when the token does not carry an authVersion", async () => {
    verifySpy.mockReturnValue({ sub: "u-1", type: "access" });
    const jwt = { verify: verifySpy } as unknown as JwtService;
    const db = makeDbService(ACTIVE_USER);
    const guard = new AuthGuard(jwt, db);
    const ctx = makeExecutionContext({ [ACCESS_TOKEN]: "legacy-token" });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException("Invalid access token"),
    );
  });

  // ---- valid access -------------------------------------------------------

  it("attaches user to request and returns true on valid access", async () => {
    verifySpy.mockReturnValue({ sub: "u-1", type: "access", authVersion: 0 });
    const jwt = { verify: verifySpy } as unknown as JwtService;
    const db = makeDbService(ACTIVE_USER);
    const guard = new AuthGuard(jwt, db);

    const req: Record<string, unknown> = {
      cookies: { [ACCESS_TOKEN]: "valid-token" },
    };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect((req as unknown as AuthenticatedRequest).user).toEqual({
      id: ACTIVE_USER.id,
      email: ACTIVE_USER.email,
      displayName: ACTIVE_USER.displayName,
    });
  });
});
