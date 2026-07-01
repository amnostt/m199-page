/**
 * AuthGuard — JWT verification and active-status enforcement (AR-05).
 *
 * Extracts the `access_token` httpOnly cookie, verifies the JWT signature
 * via JwtService, looks up the responsible user, and enforces ACTIVE status
 * plus authVersion equality for immediate server-side revocation.
 * On success attaches `{ id, email, displayName }` to the request so
 * downstream controllers/handlers can access the authenticated user.
 *
 * Exported from AuthModule so ResponsiblesModule (PR 2) can import it.
 */
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { DbService } from "../db/db.service.js";
import { ACCESS_TOKEN } from "./auth.constants.js";

// ---------------------------------------------------------------------------
// JWT payload shape (access token only; refresh tokens are opaque, not JWT).
// ---------------------------------------------------------------------------

interface AccessTokenPayload {
  sub: string;
  type: "access";
  authVersion: number;
}

// ---------------------------------------------------------------------------
// User shape attached to the request after successful guard verification.
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

// ---------------------------------------------------------------------------
// Extended Request so downstream code can read req.user safely.
// ---------------------------------------------------------------------------

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// ---------------------------------------------------------------------------
// Minimal Prisma interface for the user lookup inside the guard.
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  authVersion: number;
  status: "ACTIVE" | "INACTIVE";
}

interface GuardPrismaClient {
  responsibleUser: {
    findUnique(args: {
      where: { id?: string; email?: string };
    }): Promise<UserRow | null>;
  };
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(DbService) private readonly dbService: DbService,
  ) {}

  private get client(): GuardPrismaClient {
    return this.dbService.client as unknown as GuardPrismaClient;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const token: string | undefined = req.cookies?.[ACCESS_TOKEN];
    if (!token) {
      throw new UnauthorizedException("Missing access token");
    }

    // Verify JWT signature. jwtService.verify returns the decoded payload
    // or throws JsonWebTokenError / TokenExpiredError. NestJS wraps those
    // in 500 by default; we catch and re-throw as 401.
    let payload: AccessTokenPayload;
    try {
      payload = this.jwtService.verify<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    // Reject refresh tokens passed as access tokens.
    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }

    if (typeof payload.authVersion !== "number") {
      throw new UnauthorizedException("Invalid access token");
    }

    // Look up user by the JWT subject claim.
    const user = await this.client.responsibleUser.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // AR-05: every authenticated endpoint MUST reject inactive users with 403.
    if (user.status === "INACTIVE") {
      throw new ForbiddenException("User is inactive");
    }

    if (payload.authVersion !== user.authVersion) {
      throw new UnauthorizedException("Access token has been revoked");
    }

    // Attach authenticated user to request for downstream handlers.
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    };

    return true;
  }
}
