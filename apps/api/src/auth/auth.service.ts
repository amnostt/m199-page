/**
 * Auth service — login, refresh, and logout lifecycle (AR-01, AR-02, AR-03).
 *
 * Password comparison uses bcryptjs (pure JS, zero native deps).
 * Access tokens are stateless JWTs signed via @nestjs/jwt (15m TTL).
 * Each token carries the user's authVersion so server-side session
 * revocation immediately invalidates older access tokens.
 * Refresh tokens are opaque crypto.randomBytes values stored as SHA-256
 * hashes in RefreshSession (7d TTL, revocable). Both travel as httpOnly
 * cookies with SameSite=Lax for CSRF mitigation.
 *
 * The service sets and clears cookies directly on the Express Response
 * so the controller stays thin — consistent with the auth data-flow
 * diagrams in design.md.
 */
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request, Response } from "express";
import { DbService } from "../db/db.service.js";
import {
  ACCESS_TOKEN,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN,
  REFRESH_TOKEN_BYTES,
  REFRESH_TOKEN_TTL_MS,
} from "./auth.constants.js";
import type { LoginDto } from "./dto/login.dto.js";

// ---------------------------------------------------------------------------
// Minimal Prisma-model interfaces used by the auth service.
// The runtime DbService.client is a full PrismaClient, but apps/api/
// avoids static @prisma/client imports (BF-02). These local interfaces
// describe only the fields and methods this service calls.
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  authVersion: number;
  status: "ACTIVE" | "INACTIVE";
}

interface SessionRow {
  id: string;
  userId: string;
  tokenHash: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  expiresAt: Date;
  revokedAt: Date | null;
}

interface SessionCreateInput {
  userId: string;
  tokenHash: string;
  status: "ACTIVE";
  expiresAt: Date;
}

interface SessionUpdateInput {
  status: "REVOKED";
  revokedAt: Date;
}

interface SessionUpdateManyWhereInput {
  id?: string;
  userId?: string;
  tokenHash?: string;
  status: "ACTIVE";
}

interface AuthPrismaClient {
  responsibleUser: {
    findUnique(args: {
      where: { id?: string; email?: string };
    }): Promise<UserRow | null>;
    update(args: {
      where: { id: string };
      data: { authVersion: { increment: number } };
    }): Promise<UserRow>;
  };
  refreshSession: {
    findUnique(args: {
      where: { id?: string; tokenHash?: string };
    }): Promise<SessionRow | null>;
    create(args: { data: SessionCreateInput }): Promise<SessionRow>;
    update(args: {
      where: { id: string };
      data: SessionUpdateInput;
    }): Promise<SessionRow>;
    updateMany(args: {
      where: SessionUpdateManyWhereInput;
      data: SessionUpdateInput;
    }): Promise<{ count: number }>;
  };
  $transaction<T>(fn: (tx: AuthPrismaClient) => Promise<T>): Promise<T>;
}

// ---------------------------------------------------------------------------
// Public response shape (never includes passwordHash — AR-06, AR-08).
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class AuthService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /** Casts DbService.client to the minimal Prisma interface this service needs. */
  private get client(): AuthPrismaClient {
    return this.dbService.client as unknown as AuthPrismaClient;
  }

  /** SHA-256 hex digest of a plaintext refresh token. */
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /** Cryptographically random opaque refresh token (96 hex chars). */
  private generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  }

  /** Sets access_token and refresh_token as httpOnly + SameSite=Lax cookies. */
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const secure = process.env["NODE_ENV"] === "production";
    const baseOptions = { httpOnly: true, sameSite: "lax" as const, secure };

    res.cookie(ACCESS_TOKEN, accessToken, { ...baseOptions, path: "/" });
    res.cookie(REFRESH_TOKEN, refreshToken, {
      ...baseOptions,
      path: "/",
    });
  }

  /** Clears both auth cookies from the client. */
  private clearAuthCookies(res: Response): void {
    const secure = process.env["NODE_ENV"] === "production";
    const baseOptions = { httpOnly: true, sameSite: "lax" as const, secure };

    res.clearCookie(ACCESS_TOKEN, { ...baseOptions, path: "/" });
    res.clearCookie(REFRESH_TOKEN, { ...baseOptions, path: "/" });
  }

  /** Looks up a user by email and enforces ACTIVE status. */
  private async findActiveUser(email: string): Promise<UserRow> {
    const user = await this.client.responsibleUser.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.status === "INACTIVE") {
      throw new ForbiddenException("User is inactive");
    }

    return user;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Authenticates a responsible user by email + password (AR-01).
   *
   * On success: inserts a new RefreshSession, signs a JWT access token,
   * and sets httpOnly cookies. Returns the user profile (no passwordHash).
   *
   * Throws 401 for invalid credentials; 403 for inactive users.
   */
  async login(dto: LoginDto, res: Response): Promise<AuthUser> {
    const user = await this.findActiveUser(dto.email);

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Sign JWT (stateless, 15m TTL) with the current auth version.
    const accessToken = this.jwtService.sign(
      { sub: user.id, type: "access", authVersion: user.authVersion },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    // Generate opaque refresh token + SHA-256 hash for DB storage.
    const rawToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(rawToken);

    await this.client.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    // Set cookies: the raw refresh token goes to the client (never stored
    // plaintext server-side). The hash is in the DB for lookup on refresh.
    this.setAuthCookies(res, accessToken, rawToken);

    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  /**
   * Refreshes the access + refresh token pair (AR-02).
   *
   * Reads the raw refresh token from the request cookie, hashes it,
   * locates the matching ACTIVE session, and performs a token rotation:
   * the old session is revoked, a new session is created, and fresh
   * cookies are set.
   *
   * Throws 401 for revoked/expired/missing tokens; 403 for inactive users.
   * Clears cookies on any failure so the client does not retry with a
   * dead token.
   */
  async refresh(req: Request, res: Response): Promise<AuthUser> {
    const rawToken: string | undefined = req.cookies?.[REFRESH_TOKEN];
    if (!rawToken) {
      this.clearAuthCookies(res);
      throw new UnauthorizedException("Missing refresh token");
    }

    const tokenHash = this.hashToken(rawToken);

    // Locate matching ACTIVE session.
    const session = await this.client.refreshSession.findUnique({
      where: { tokenHash },
    });

    if (!session || session.status !== "ACTIVE") {
      this.clearAuthCookies(res);
      throw new UnauthorizedException("Invalid or revoked token");
    }

    // Check if the session is expired (DB-level guard).
    if (session.expiresAt < new Date()) {
      this.clearAuthCookies(res);
      throw new UnauthorizedException("Refresh token expired");
    }

    // Verify the user still exists and is ACTIVE (AR-02, AR-05).
    const user = await this.client.responsibleUser.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.status === "INACTIVE") {
      this.clearAuthCookies(res);
      throw new ForbiddenException("User is inactive");
    }

    // Token rotation: sign new JWT, generate new opaque refresh,
    // revoke the old session, insert the new one.
    const accessToken = this.jwtService.sign(
      { sub: user.id, type: "access", authVersion: user.authVersion },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const newRawToken = this.generateRefreshToken();
    const newTokenHash = this.hashToken(newRawToken);

    await this.client.$transaction(async (tx) => {
      const revoked = await tx.refreshSession.updateMany({
        where: { id: session.id, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
        },
      });

      if (revoked.count !== 1) {
        throw new UnauthorizedException("Invalid or revoked token");
      }

      await tx.refreshSession.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      });
    });

    this.setAuthCookies(res, accessToken, newRawToken);

    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  /**
   * Revokes the current refresh session and clears cookies (AR-03).
   *
   * Reads the raw refresh token from the request cookie. If the token
   * is missing or the session is already revoked/expired, cookies are
   * still cleared (idempotent logout).
   */
  async logout(req: Request, res: Response): Promise<void> {
    const rawToken: string | undefined = req.cookies?.[REFRESH_TOKEN];

    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);

      await this.client.refreshSession.updateMany({
        where: { tokenHash, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
        },
      });
    }

    // Always clear cookies — idempotent logout (AR-03).
    this.clearAuthCookies(res);
  }

  /**
   * Revokes all ACTIVE sessions for a given user.
   *
   * Called externally when a user is deactivated or their password
   * is reset (AR-07, AR-08). The auth service owns the session
   * lifecycle, so bulk revocation lives here rather than in the
   * responsibles module.
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.client.$transaction(async (tx) => {
      await tx.responsibleUser.update({
        where: { id: userId },
        data: { authVersion: { increment: 1 } },
      });

      await tx.refreshSession.updateMany({
        where: { userId, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
        },
      });
    });
  }
}
