/**
 * Auth service — login, family-backed refresh rotation, and terminal logout.
 *
 * Refresh-family state is the authority for rotation and recovery. A family
 * row is locked inside a Serializable Prisma transaction; consumed descendants
 * are retained for a bounded, proof-bound replay window. Plaintext current
 * tokens and exact replay results are encrypted with a key derived from the
 * validated JWT secret. Legacy RefreshSession rows remain untouched by the
 * migration and are revoked as a compatibility fallback only.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";
import bcrypt from "bcryptjs";
import { ConfigService } from "@nestjs/config";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  RequestTimeoutException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request, Response } from "express";
import { DbService } from "../db/db.service.js";
import {
  ACCESS_TOKEN,
  ACCESS_TOKEN_TTL,
  AUTH_MIN_EPOCH_HEADER,
  REFRESH_FAMILY_VERSION_HEADER,
  REFRESH_OPERATION_HEADER,
  REFRESH_OPERATION_TIMEOUT_MS,
  REFRESH_REPLAY_WINDOW_MS,
  REFRESH_TOKEN,
  REFRESH_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TYPE,
  REFRESH_TRANSACTION_TIMEOUT_MS,
} from "./auth.constants.js";
import type { LoginDto } from "./dto/login.dto.js";

const LEGACY_REFRESH_TOKEN_PATH = "/auth/refresh";
const AUTH_NO_STORE = "no-store";
const SERIALIZATION_RETRIES = 2;
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_IV_BYTES = 12;

type FamilyStatus = "ACTIVE" | "TERMINATED";
type OperationStatus = "COMPLETED" | "INVALIDATED";

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  authVersion: number;
  status: "ACTIVE" | "INACTIVE";
}

interface FamilyRow {
  id: string;
  userId: string;
  status: FamilyStatus;
  currentVersion: number;
  currentTokenHash: string;
  encryptedCurrentToken: string;
  expiresAt: Date;
  terminalAt: Date | null;
}

interface OperationRow {
  id: string;
  familyId: string;
  operationId: string;
  presentedVersion: number;
  presentedJti: string;
  presentedIssuedByOperationId: string;
  presentedProofHash: string;
  childVersion: number;
  encryptedResult: string;
  completedAt: Date;
  replayUntil: Date;
  status: OperationStatus;
}

interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface RefreshClaims {
  sub: string;
  type: typeof REFRESH_TOKEN_TYPE;
  familyId: string;
  version: number;
  jti: string;
  issuedByOperationId: string;
  exp: number;
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
    updateMany(args: {
      where: {
        id?: string;
        userId?: string;
        tokenHash?: string;
        status: "ACTIVE";
      };
      data: { status: "REVOKED"; revokedAt: Date };
    }): Promise<{ count: number }>;
  };
  refreshFamily: {
    findUnique(args: { where: { id: string } }): Promise<FamilyRow | null>;
    findMany(args: {
      where: { userId: string; status: "ACTIVE" };
      select: { id: true };
    }): Promise<Array<{ id: string }>>;
    create(args: { data: Record<string, unknown> }): Promise<FamilyRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<FamilyRow>;
    updateMany(args: {
      where: { userId?: string; id?: string; status?: "ACTIVE" };
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
  refreshOperation: {
    findFirst(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
    }): Promise<OperationRow | null>;
    create(args: { data: Record<string, unknown> }): Promise<OperationRow>;
    updateMany(args: {
      where: { familyId: string };
      data: { status: "INVALIDATED" };
    }): Promise<{ count: number }>;
  };
  $queryRaw<T = unknown>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
  $transaction<T>(
    fn: (tx: AuthPrismaClient) => Promise<T>,
    options?: {
      isolationLevel?: "Serializable";
      timeout?: number;
      maxWait?: number;
    },
  ): Promise<T>;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface RefreshTransactionResult {
  result: AuthResult;
  version: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  private get client(): AuthPrismaClient {
    return this.dbService.client as unknown as AuthPrismaClient;
  }

  private get encryptionKey(): Buffer {
    const secret = this.config.getOrThrow<string>("JWT_SECRET");
    return createHash("sha256").update(`m199-refresh:${secret}`).digest();
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private proofHash(token: string): string {
    return createHmac("sha256", this.encryptionKey).update(token).digest("hex");
  }

  private encrypt(value: string): string {
    const iv = randomBytes(ENCRYPTION_IV_BYTES);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString("hex"),
      tag.toString("hex"),
      ciphertext.toString("hex"),
    ].join(".");
  }

  private decrypt(value: string): string {
    const [ivHex, tagHex, ciphertextHex] = value.split(".");
    if (!ivHex || !tagHex || !ciphertextHex)
      throw new Error("Invalid encrypted auth state");
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      this.encryptionKey,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, "hex")),
      decipher.final(),
    ]).toString("utf8");
  }

  private setNoStore(res: Response): void {
    res.setHeader?.("Cache-Control", AUTH_NO_STORE);
  }

  private setFamilyVersion(res: Response, version: number): void {
    res.setHeader?.(REFRESH_FAMILY_VERSION_HEADER, String(version));
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const secure = process.env["NODE_ENV"] === "production";
    const baseOptions = { httpOnly: true, sameSite: "lax" as const, secure };

    res.clearCookie(REFRESH_TOKEN, {
      ...baseOptions,
      path: LEGACY_REFRESH_TOKEN_PATH,
    });
    res.cookie(ACCESS_TOKEN, accessToken, { ...baseOptions, path: "/" });
    res.cookie(REFRESH_TOKEN, refreshToken, { ...baseOptions, path: "/" });
  }

  private clearAuthCookies(res: Response): void {
    const secure = process.env["NODE_ENV"] === "production";
    const baseOptions = { httpOnly: true, sameSite: "lax" as const, secure };

    res.clearCookie(ACCESS_TOKEN, { ...baseOptions, path: "/" });
    res.clearCookie(REFRESH_TOKEN, { ...baseOptions, path: "/" });
    res.clearCookie(REFRESH_TOKEN, {
      ...baseOptions,
      path: LEGACY_REFRESH_TOKEN_PATH,
    });
  }

  private toAuthUser(user: UserRow): AuthUser {
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  private operationId(req: Request): string {
    const raw = req.headers[REFRESH_OPERATION_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) return randomUUID();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new ConflictException("Invalid refresh operation identifier");
    }
    return value;
  }

  private minEpoch(req: Request): number | undefined {
    const raw = req.headers[AUTH_MIN_EPOCH_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new ConflictException("Invalid auth epoch");
    }
    return parsed;
  }

  private verifyRefreshToken(
    rawToken: string,
    options?: { ignoreExpiration?: boolean },
  ): RefreshClaims {
    let claims: RefreshClaims;
    try {
      claims = this.jwtService.verify<RefreshClaims>(rawToken, options);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (
      claims.type !== REFRESH_TOKEN_TYPE ||
      typeof claims.familyId !== "string" ||
      typeof claims.version !== "number" ||
      !Number.isSafeInteger(claims.version) ||
      typeof claims.jti !== "string" ||
      typeof claims.issuedByOperationId !== "string" ||
      typeof claims.exp !== "number"
    ) {
      throw new UnauthorizedException("Invalid refresh token lineage");
    }
    return claims;
  }

  private signRefreshToken(
    userId: string,
    familyId: string,
    version: number,
    jti: string,
    issuedByOperationId: string,
    expiresAt: Date,
  ): string {
    const expiresIn = Math.max(
      1,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    );
    return this.jwtService.sign(
      {
        sub: userId,
        type: REFRESH_TOKEN_TYPE,
        familyId,
        version,
        jti,
        issuedByOperationId,
      },
      { expiresIn: Math.min(expiresIn, REFRESH_TOKEN_TTL_SECONDS) },
    );
  }

  private async serialized<T>(
    fn: (tx: AuthPrismaClient) => Promise<T>,
  ): Promise<T> {
    const deadline = Date.now() + REFRESH_OPERATION_TIMEOUT_MS;
    let retries = 0;

    while (true) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        this.logger.warn(
          {
            event: "auth.operation_deadline_exceeded",
            deadlineMs: REFRESH_OPERATION_TIMEOUT_MS,
            retries,
          },
          "Auth operation deadline exceeded",
        );
        throw new RequestTimeoutException("Auth operation timed out");
      }

      try {
        const result = await this.client.$transaction(fn, {
          isolationLevel: "Serializable",
          timeout: Math.min(REFRESH_TRANSACTION_TIMEOUT_MS, remaining),
          maxWait: Math.min(1_000, remaining),
        });
        if (Date.now() >= deadline) {
          this.logger.warn(
            {
              event: "auth.operation_deadline_exceeded",
              deadlineMs: REFRESH_OPERATION_TIMEOUT_MS,
              retries,
            },
            "Auth operation deadline exceeded",
          );
          throw new RequestTimeoutException("Auth operation timed out");
        }
        return result;
      } catch (error) {
        if (this.isTransactionDeadline(error)) {
          this.logger.warn(
            {
              err: error,
              event: "auth.transaction_deadline_exceeded",
              deadlineMs: REFRESH_TRANSACTION_TIMEOUT_MS,
            },
            "Auth transaction deadline exceeded",
          );
          throw error;
        }
        if (
          !this.isSerializationConflict(error) ||
          retries >= SERIALIZATION_RETRIES
        ) {
          if (this.isSerializationConflict(error)) {
            this.logger.warn(
              {
                err: error,
                event: "auth.serializable_conflict_exhausted",
                retries,
              },
              "Serializable auth transaction retries exhausted",
            );
          }
          throw error;
        }
        retries++;
        if (Date.now() >= deadline) {
          this.logger.warn(
            {
              err: error,
              event: "auth.operation_deadline_exceeded",
              deadlineMs: REFRESH_OPERATION_TIMEOUT_MS,
              retries,
            },
            "Auth operation deadline exceeded",
          );
          throw new RequestTimeoutException("Auth operation timed out");
        }
        await Promise.resolve();
      }
    }
  }

  private isSerializationConflict(error: unknown): boolean {
    const value = error as {
      code?: unknown;
      meta?: {
        driverAdapterError?: {
          cause?: { originalCode?: unknown };
        };
      };
    };
    return (
      value.code === "P2034" ||
      value.code === "40001" ||
      value.meta?.driverAdapterError?.cause?.originalCode === "40001"
    );
  }

  private isTransactionDeadline(error: unknown): boolean {
    const value = error as { code?: unknown; message?: unknown };
    return (
      value.code === "P2024" ||
      value.code === "P2028" ||
      (typeof value.message === "string" &&
        /transaction.*(?:timed out|timeout|expired)|(?:timed out|timeout).*transaction/i.test(
          value.message,
        ))
    );
  }

  private async findActiveUser(
    tx: AuthPrismaClient,
    userId: string,
  ): Promise<UserRow> {
    const user = await tx.responsibleUser.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");
    if (user.status === "INACTIVE")
      throw new ForbiddenException("User is inactive");
    return user;
  }

  private async lockFamily(
    tx: AuthPrismaClient,
    familyId: string,
  ): Promise<FamilyRow | null> {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "RefreshFamily" WHERE "id" = ${familyId} FOR UPDATE
    `;
    if (locked.length === 0) return null;
    return tx.refreshFamily.findUnique({ where: { id: familyId } });
  }

  private resultFromOperation(operation: OperationRow): AuthResult {
    return JSON.parse(this.decrypt(operation.encryptedResult)) as AuthResult;
  }

  private async latestFamilyResult(
    tx: AuthPrismaClient,
    familyId: string,
    currentVersion: number,
  ): Promise<AuthResult> {
    const operation = await tx.refreshOperation.findFirst({
      where: { familyId, childVersion: currentVersion, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    });
    if (!operation)
      throw new UnauthorizedException("Refresh result is unavailable");
    return this.resultFromOperation(operation);
  }

  async login(dto: LoginDto, res: Response): Promise<AuthUser> {
    this.setNoStore(res);
    const user = await this.client.responsibleUser.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    if (user.status === "INACTIVE")
      throw new ForbiddenException("User is inactive");

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException("Invalid credentials");

    const familyId = randomUUID();
    const operationId = randomUUID();
    const jti = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        type: "access",
        authVersion: user.authVersion,
        familyId,
      },
      { expiresIn: ACCESS_TOKEN_TTL },
    );
    const refreshToken = this.signRefreshToken(
      user.id,
      familyId,
      1,
      jti,
      operationId,
      expiresAt,
    );
    const result: AuthResult = {
      user: this.toAuthUser(user),
      accessToken,
      refreshToken,
    };
    const now = new Date();

    await this.serialized(async (tx) => {
      await tx.refreshFamily.create({
        data: {
          id: familyId,
          userId: user.id,
          status: "ACTIVE",
          currentVersion: 1,
          currentTokenHash: this.hashToken(refreshToken),
          encryptedCurrentToken: this.encrypt(refreshToken),
          expiresAt,
          terminalAt: null,
        },
      });
      await tx.refreshOperation.create({
        data: {
          id: randomUUID(),
          familyId,
          operationId,
          presentedVersion: 0,
          presentedJti: "login",
          presentedIssuedByOperationId: operationId,
          presentedProofHash: this.proofHash(refreshToken),
          childVersion: 1,
          encryptedResult: this.encrypt(JSON.stringify(result)),
          completedAt: now,
          replayUntil: new Date(
            Math.min(
              expiresAt.getTime(),
              now.getTime() + REFRESH_REPLAY_WINDOW_MS,
            ),
          ),
          status: "COMPLETED",
        },
      });
    });

    this.setFamilyVersion(res, 1);
    this.setAuthCookies(res, accessToken, refreshToken);
    return result.user;
  }

  async refresh(req: Request, res: Response): Promise<AuthUser> {
    this.setNoStore(res);
    const rawToken: string | undefined = req.cookies?.[REFRESH_TOKEN];
    if (!rawToken) {
      this.clearAuthCookies(res);
      throw new UnauthorizedException("Missing refresh token");
    }

    const claims = this.verifyRefreshToken(rawToken);
    const proofHash = this.proofHash(rawToken);
    const operationId = this.operationId(req);
    const minEpoch = this.minEpoch(req);
    const transactionResult = await this.serialized(async (tx) => {
      const family = await this.lockFamily(tx, claims.familyId);
      if (!family || family.status === "TERMINATED") {
        throw new UnauthorizedException("Refresh family is terminated");
      }
      const now = new Date();
      if (family.expiresAt <= now || claims.exp * 1000 <= now.getTime()) {
        throw new UnauthorizedException("Refresh token expired");
      }

      const user = await this.findActiveUser(tx, family.userId);
      if (claims.sub !== user.id)
        throw new UnauthorizedException("Invalid refresh lineage");

      // An identified retry is checked before the version branch so it keeps
      // returning its exact stored result even if a later operation has already
      // advanced the family. The browser may receive that old cookie, but the
      // family authority makes it converge safely on its next request.
      const existing = await tx.refreshOperation.findFirst({
        where: { familyId: family.id, operationId },
      });
      if (existing) {
        if (
          existing.status !== "COMPLETED" ||
          existing.presentedVersion !== claims.version ||
          existing.presentedProofHash !== proofHash ||
          existing.presentedJti !== claims.jti ||
          existing.presentedIssuedByOperationId !==
            claims.issuedByOperationId ||
          existing.replayUntil <= now
        ) {
          throw new ConflictException(
            "Refresh operation retry does not match lineage",
          );
        }
        return {
          result: this.resultFromOperation(existing),
          version: existing.childVersion,
        } satisfies RefreshTransactionResult;
      }

      if (claims.version > family.currentVersion) {
        throw new ConflictException(
          "Refresh token version is ahead of family state",
        );
      }

      if (claims.version < family.currentVersion) {
        const consumed = await tx.refreshOperation.findFirst({
          where: { familyId: family.id, presentedVersion: claims.version },
        });
        if (
          !consumed ||
          consumed.status !== "COMPLETED" ||
          consumed.presentedProofHash !== proofHash ||
          consumed.presentedJti !== claims.jti ||
          consumed.presentedIssuedByOperationId !==
            claims.issuedByOperationId ||
          consumed.replayUntil <= now
        ) {
          throw new UnauthorizedException(
            "Refresh replay proof is invalid or expired",
          );
        }
        const result = await this.latestFamilyResult(
          tx,
          family.id,
          family.currentVersion,
        );
        if (minEpoch !== undefined && result.user.id !== user.id) {
          throw new ConflictException(
            "Refresh response does not satisfy auth epoch",
          );
        }
        return {
          result,
          version: family.currentVersion,
        } satisfies RefreshTransactionResult;
      }

      let currentToken: string;
      try {
        currentToken = this.decrypt(family.encryptedCurrentToken);
      } catch {
        throw new UnauthorizedException("Refresh state is invalid");
      }
      if (
        currentToken !== rawToken ||
        this.hashToken(rawToken) !== family.currentTokenHash
      ) {
        throw new UnauthorizedException("Refresh token proof is invalid");
      }

      const childVersion = family.currentVersion + 1;
      const childOperationId = operationId;
      const childToken = this.signRefreshToken(
        user.id,
        family.id,
        childVersion,
        randomUUID(),
        childOperationId,
        family.expiresAt,
      );
      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          type: "access",
          authVersion: user.authVersion,
          familyId: family.id,
        },
        { expiresIn: ACCESS_TOKEN_TTL },
      );
      const result: AuthResult = {
        user: this.toAuthUser(user),
        accessToken,
        refreshToken: childToken,
      };
      const completedAt = new Date();
      const replayUntil = new Date(
        Math.min(
          family.expiresAt.getTime(),
          completedAt.getTime() + REFRESH_REPLAY_WINDOW_MS,
        ),
      );

      await tx.refreshOperation.create({
        data: {
          id: randomUUID(),
          familyId: family.id,
          operationId,
          presentedVersion: claims.version,
          presentedJti: claims.jti,
          presentedIssuedByOperationId: claims.issuedByOperationId,
          presentedProofHash: proofHash,
          childVersion,
          encryptedResult: this.encrypt(JSON.stringify(result)),
          completedAt,
          replayUntil,
          status: "COMPLETED",
        },
      });
      await tx.refreshFamily.update({
        where: { id: family.id },
        data: {
          currentVersion: childVersion,
          currentTokenHash: this.hashToken(childToken),
          encryptedCurrentToken: this.encrypt(childToken),
        },
      });
      return {
        result,
        version: childVersion,
      } satisfies RefreshTransactionResult;
    });

    this.setFamilyVersion(res, transactionResult.version);
    this.setAuthCookies(
      res,
      transactionResult.result.accessToken,
      transactionResult.result.refreshToken,
    );
    return transactionResult.result.user;
  }

  async logout(req: Request, res: Response): Promise<void> {
    this.setNoStore(res);
    const rawToken: string | undefined = req.cookies?.[REFRESH_TOKEN];
    if (!rawToken) {
      this.clearAuthCookies(res);
      return;
    }

    let claims: RefreshClaims;
    try {
      claims = this.verifyRefreshToken(rawToken);
    } catch {
      try {
        // An expired but authentic family token still identifies the family
        // that logout must terminate. Only malformed/non-family tokens use
        // the legacy opaque-session fallback.
        claims = this.verifyRefreshToken(rawToken, { ignoreExpiration: true });
      } catch {
        await this.serialized(async (tx) => {
          await tx.refreshSession.updateMany({
            where: { tokenHash: this.hashToken(rawToken), status: "ACTIVE" },
            data: { status: "REVOKED", revokedAt: new Date() },
          });
        });
        this.clearAuthCookies(res);
        return;
      }
    }

    await this.serialized(async (tx) => {
      const family = await this.lockFamily(tx, claims.familyId);
      if (!family || family.status === "TERMINATED") return;

      await tx.refreshFamily.update({
        where: { id: family.id },
        data: { status: "TERMINATED", terminalAt: new Date() },
      });
      await tx.refreshOperation.updateMany({
        where: { familyId: family.id },
        data: { status: "INVALIDATED" },
      });
      await tx.responsibleUser.update({
        where: { id: family.userId },
        data: { authVersion: { increment: 1 } },
      });
    });

    this.clearAuthCookies(res);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.serialized(async (tx) => {
      await tx.responsibleUser.update({
        where: { id: userId },
        data: { authVersion: { increment: 1 } },
      });
      const families = await tx.refreshFamily.findMany({
        where: { userId, status: "ACTIVE" },
        select: { id: true },
      });
      await tx.refreshFamily.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "TERMINATED", terminalAt: new Date() },
      });
      for (const family of families) {
        await tx.refreshOperation.updateMany({
          where: { familyId: family.id },
          data: { status: "INVALIDATED" },
        });
      }
      await tx.refreshSession.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
    });
  }
}
