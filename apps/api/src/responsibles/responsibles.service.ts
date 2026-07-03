/**
 * ResponsiblesService — CRUD, bulk session revocation, and password reset
 * for responsible users (AR-06, AR-07, AR-08).
 *
 * Never returns passwordHash in any response shape. Delegates session
 * revocation to AuthService.revokeAllUserSessions so the session lifecycle
 * stays owned by the auth module.
 *
 * Password hashing uses bcryptjs (pure JS, zero native deps), matching
 * the AuthService convention.
 */
import bcrypt from "bcryptjs";
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService } from "../db/db.service.js";
import { AuthService } from "../auth/auth.service.js";
import type { CreateResponsibleDto } from "./dto/create-responsible.dto.js";
import type { UpdateResponsibleDto } from "./dto/update-responsible.dto.js";
import type { ResetPasswordDto } from "./dto/reset-password.dto.js";

// ---------------------------------------------------------------------------
// Minimal Prisma-model interfaces used by the responsibles service.
// Follows the same pattern as AuthService — apps/api/ avoids static
// @prisma/client imports (BF-02).
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  status: "ACTIVE" | "INACTIVE";
}

interface UserCreateInput {
  email: string;
  displayName: string;
  passwordHash: string;
}

interface UserUpdateInput {
  displayName?: string;
  status?: "ACTIVE" | "INACTIVE";
  passwordHash?: string;
}

interface ResponsiblesPrismaClient {
  responsibleUser: {
    findMany(args?: {
      orderBy?: Record<string, string>;
    }): Promise<UserRow[]>;
    findUnique(args: {
      where: { id?: string; email?: string };
    }): Promise<UserRow | null>;
    create(args: { data: UserCreateInput }): Promise<UserRow>;
    update(args: {
      where: { id: string };
      data: Partial<UserUpdateInput>;
    }): Promise<UserRow>;
  };
}

// ---------------------------------------------------------------------------
// Public response shape — never includes passwordHash (AR-06, AR-08).
// ---------------------------------------------------------------------------

export interface ResponsibleUserResponse {
  id: string;
  email: string;
  displayName: string;
  status: "ACTIVE" | "INACTIVE";
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ResponsiblesService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /** Casts DbService.client to the minimal Prisma interface this service needs. */
  private get client(): ResponsiblesPrismaClient {
    return this.dbService.client as unknown as ResponsiblesPrismaClient;
  }

  /** Strips passwordHash from a full user row — never leaks it in responses. */
  private toResponse(user: UserRow): ResponsibleUserResponse {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
    };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Lists all responsible users (AR-06).
   *
   * Returns every user sorted by creation date, descending. No pagination
   * for MVP — the admin user pool is expected to be small.
   */
  async findAll(): Promise<ResponsibleUserResponse[]> {
    const users = await this.client.responsibleUser.findMany({
      orderBy: { createdAt: "desc" },
    });
    return users.map((u) => this.toResponse(u));
  }

  /**
   * Retrieves a single responsible user by id (AR-06).
   *
   * Throws 404 when the user does not exist.
   */
  async findById(id: string): Promise<ResponsibleUserResponse> {
    const user = await this.client.responsibleUser.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.toResponse(user);
  }

  /**
   * Creates a new responsible user (AR-06).
   *
   * Hashes the password with bcryptjs before persisting. Rejects duplicate
   * emails with a 409 to give the caller a clear signal beyond a generic
   * database constraint error.
   *
   * The first responsible user is expected to be created via seed/manual
   * setup; this endpoint is behind AuthGuard (AR-09).
   */
  async create(dto: CreateResponsibleDto): Promise<ResponsibleUserResponse> {
    const existing = await this.client.responsibleUser.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException("Email already in use");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.client.responsibleUser.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        passwordHash,
      },
    });

    return this.toResponse(user);
  }

  /**
   * Updates displayName and/or status of a responsible user (AR-06).
   *
   * If status is set to INACTIVE, all refresh sessions for that user are
   * immediately revoked (AR-07). This guarantees that an inactivated user
   * cannot use existing cookies to access the API.
   *
   * Throws 404 when the user does not exist.
   */
  async update(
    id: string,
    dto: UpdateResponsibleDto,
  ): Promise<ResponsibleUserResponse> {
    const existing = await this.client.responsibleUser.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("User not found");
    }

    const data: Partial<UserUpdateInput> = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.status !== undefined) data.status = dto.status;

    const user = await this.client.responsibleUser.update({
      where: { id },
      data,
    });

    // AR-07: Deactivation revokes all sessions.
    if (dto.status === "INACTIVE") {
      await this.authService.revokeAllUserSessions(id);
    }

    return this.toResponse(user);
  }

  /**
   * Resets the password of another responsible user (AR-08).
   *
   * Hashes the new password with bcryptjs, persists it, and revokes all
   * refresh sessions for the affected account. This ensures that any
   * existing cookies from previous sessions become immediately invalid.
   *
   * Throws 404 when the user does not exist.
   */
  async resetPassword(
    id: string,
    dto: ResetPasswordDto,
  ): Promise<ResponsibleUserResponse> {
    const existing = await this.client.responsibleUser.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("User not found");
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    const user = await this.client.responsibleUser.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });

    // AR-08: Password reset revokes all sessions.
    await this.authService.revokeAllUserSessions(id);

    return this.toResponse(user);
  }
}
