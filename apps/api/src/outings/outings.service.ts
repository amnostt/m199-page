/**
 * OutingsService — CRUD, publish-readiness guard, and asset validation.
 *
 * Phase 2a: Core CRUD operations (create, update, archive, findAll, findBySlug)
 * plus publish-readiness enforcement (OUT-02) and asset reference validation (OUT-04).
 *
 * Phase 2b (this slice): findAllPublic, visitor hash derivation,
 * transactional likes (OUT-07), and featured outing delegation (OUT-05).
 *
 * OUT-01: create/read/update/archive with Prisma.
 * OUT-02: publish-readiness guard rejects PUBLISHED when required fields are empty.
 * OUT-03: slug uniqueness enforced at DB level.
 * OUT-04: asset references validated against FileAsset table.
 * OUT-05: featureOuting delegates to LandingService for PUBLISHED outings.
 * OUT-06: findAllPublic returns only PUBLISHED outings as OutingResponse.
 * OUT-07: addLike uses privacy-safe visitor hash with transactional dedupe.
 *
 * Follows the same pattern as LandingService: minimal Prisma interfaces
 * avoid static @prisma/client imports in apps/api/ (BF-02).
 */
import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DbService } from "../db/db.service.js";
import { LandingService } from "../landing/landing.service.js";
import type { CreateOutingDto } from "./dto/create-outing.dto.js";
import type { UpdateOutingDto } from "./dto/update-outing.dto.js";
import type { OutingListQueryDto } from "./dto/outing-list-query.dto.js";

// ---------------------------------------------------------------------------
// Minimal Prisma-model interfaces
// ---------------------------------------------------------------------------

export interface OutingRow {
  id: string;
  slug: string;
  title: string;
  dateTime: Date;
  location: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  likesCount: number;
  mainImageId: string | null;
  croquisId: string | null;
  planId: string | null;
  createdById: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FileAssetRow {
  id: string;
}

interface OutingLikeRow {
  id: string;
  outingId: string;
  visitorHash: string;
  fingerprintVersion: number;
  createdAt: Date;
}

interface OutingPrismaClient {
  outing: {
    create(args: { data: Record<string, unknown> }): Promise<OutingRow>;
    findUnique(args: {
      where: Record<string, unknown>;
    }): Promise<OutingRow | null>;
    findMany(args?: {
      where?: Record<string, unknown>;
      skip?: number;
      take?: number;
      orderBy?: Record<string, unknown>;
    }): Promise<OutingRow[]>;
    update(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<OutingRow>;
  };
  fileAsset: {
    findUnique(args: {
      where: Record<string, unknown>;
    }): Promise<FileAssetRow | null>;
  };
  outingLike: {
    findUnique(args: {
      where: {
        outingId_visitorHash: { outingId: string; visitorHash: string };
      };
    }): Promise<OutingLikeRow | null>;
    create(args: {
      data: {
        outingId: string;
        visitorHash: string;
        fingerprintVersion: number;
      };
    }): Promise<OutingLikeRow>;
    upsert(args: {
      where: {
        outingId_visitorHash: { outingId: string; visitorHash: string };
      };
      create: {
        outingId: string;
        visitorHash: string;
        fingerprintVersion: number;
      };
      update: Record<string, unknown>;
    }): Promise<OutingLikeRow>;
  };
  $transaction<T>(fn: (tx: OutingPrismaClient) => Promise<T>): Promise<T>;
}

// ---------------------------------------------------------------------------
// Public response shape
// ---------------------------------------------------------------------------

export interface OutingResponse {
  id: string;
  slug: string;
  title: string;
  dateTime: string;
  location: string;
  description: string;
  status: "PUBLISHED";
  likesCount: number;
  mainImageUrl: string | null;
  croquisUrl: string | null;
  planUrl: string | null;
}

// ---------------------------------------------------------------------------
// Pure helpers — privacy-safe visitor fingerprinting
// ---------------------------------------------------------------------------

/**
 * Normalizes IP addresses for consistent visitor hashing.
 *
 * Strips the IPv4-mapped IPv6 prefix (::ffff:) to canonicalize dual-stack
 * clients that connect via IPv6 but originate from IPv4 addresses.
 * Non-mapped addresses pass through unchanged.
 */
export function normalizeIp(ip: string): string {
  // Case-insensitive match against ::ffff: prefix (IPv4-mapped IPv6)
  if (/^::ffff:/i.test(ip)) {
    return ip.slice(7);
  }
  return ip;
}

/**
 * Derives a privacy-safe visitor hash using the required secret.
 *
 * Uses SHA-256 with colon-delimited concatenation for unambiguous separation
 * of the hash inputs: version, secret, normalized IP, and user-agent.
 * The delimiter prevents collision between adjacent fields (e.g., "v1" +
 * "secret" vs "v" + "1secret").
 *
 * OUT-07: hash stored on OutingLike; raw IP/UA never persisted.
 */
export function deriveVisitorHash(
  secret: string,
  version: string,
  ip: string,
  userAgent: string,
): string {
  const normalized = normalizeIp(ip);
  const input = `${version}:${secret}:${normalized}:${userAgent}`;
  return createHash("sha256").update(input).digest("hex");
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class OutingsService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(LandingService)
    private readonly landingService: LandingService,
  ) {}

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private get client(): OutingPrismaClient {
    return this.dbService.client as unknown as OutingPrismaClient;
  }

  /** Resolves a file ID to a public URL path, or null if no ID. */
  private fileUrl(fileId: string | null | undefined): string | null {
    if (!fileId) return null;
    return `/files/${fileId}`;
  }

  /** Maps an internal OutingRow to the public OutingResponse shape. */
  private toOutingResponse(row: OutingRow): OutingResponse {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      dateTime: row.dateTime.toISOString(),
      location: row.location,
      description: row.description,
      status: "PUBLISHED",
      likesCount: row.likesCount,
      mainImageUrl: this.fileUrl(row.mainImageId),
      croquisUrl: this.fileUrl(row.croquisId),
      planUrl: this.fileUrl(row.planId),
    };
  }

  /**
   * Validates that every non-null asset ID references an existing FileAsset.
   * Throws BadRequestException for invalid references (OUT-04).
   */
  private async validateAssetIds(
    mainImageId?: string | null,
    croquisId?: string | null,
    planId?: string | null,
  ): Promise<void> {
    const idsToCheck = [mainImageId, croquisId, planId].filter(
      (id): id is string => !!id,
    );
    for (const id of idsToCheck) {
      const asset = await this.client.fileAsset.findUnique({
        where: { id },
      });
      if (!asset) {
        throw new BadRequestException(`FileAsset with id "${id}" not found`);
      }
    }
  }

  /**
   * Checks all public-visible fields are present for PUBLISHED status (OUT-02).
   * Rejects if any of title, slug, dateTime, location, or description
   * would be null or empty after the intended operation.
   */
  private guardPublishReadiness(
    title?: string,
    slug?: string,
    dateTime?: string,
    location?: string,
    description?: string,
  ): void {
    const fields: Record<string, string | undefined> = {
      title,
      slug,
      dateTime,
      location,
      description,
    };
    const missing = Object.entries(fields).filter(
      ([, v]) => v == null || (typeof v === "string" && v.trim() === ""),
    );
    if (missing.length > 0) {
      const names = missing.map(([k]) => k).join(", ");
      throw new BadRequestException(
        `Cannot set status to PUBLISHED: missing or empty required fields: ${names}`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // CRUD (2.1)
  // -----------------------------------------------------------------------

  /**
   * Creates an outing (OUT-01).
   *
   * Validates asset references (OUT-04), enforces publish-readiness
   * for PUBLISHED status (OUT-02), and defaults to DRAFT.
   */
  async create(dto: CreateOutingDto): Promise<OutingRow> {
    const status = dto.status ?? "DRAFT";

    if (status === "PUBLISHED") {
      this.guardPublishReadiness(
        dto.title,
        dto.slug,
        dto.dateTime,
        dto.location,
        dto.description,
      );
    }

    await this.validateAssetIds(dto.mainImageId, dto.croquisId, dto.planId);

    try {
      return await this.client.outing.create({
        data: {
          title: dto.title,
          slug: dto.slug,
          dateTime: new Date(dto.dateTime),
          location: dto.location,
          description: dto.description,
          status,
          mainImageId: dto.mainImageId ?? null,
          croquisId: dto.croquisId ?? null,
          planId: dto.planId ?? null,
        },
      });
    } catch (err: unknown) {
      // P2002 = unique constraint violation (slug)
      const pgErr = err as { code?: string };
      if (pgErr.code === "P2002") {
        throw new ConflictException(`Slug "${dto.slug}" already exists`);
      }
      throw err;
    }
  }

  /**
   * Partially updates an outing (OUT-01).
   *
   * Validates asset references (OUT-04), enforces publish-readiness
   * when the effective status would be PUBLISHED.
   */
  async update(id: string, dto: UpdateOutingDto): Promise<OutingRow> {
    const existing = await this.client.outing.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Outing "${id}" not found`);
    }

    // Build update payload from only provided fields
    const data: Record<string, unknown> = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.dateTime !== undefined) data.dateTime = new Date(dto.dateTime);
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.mainImageId !== undefined) data.mainImageId = dto.mainImageId;
    if (dto.croquisId !== undefined) data.croquisId = dto.croquisId;
    if (dto.planId !== undefined) data.planId = dto.planId;
    if (dto.status !== undefined) data.status = dto.status;

    // Determine effective status after update
    const effectiveStatus = (dto.status ?? existing.status) as string;

    // Validate publish-readiness if the effective status is PUBLISHED
    if (effectiveStatus === "PUBLISHED") {
      const effectiveTitle =
        dto.title !== undefined ? dto.title : existing.title;
      const effectiveSlug = dto.slug !== undefined ? dto.slug : existing.slug;
      const effectiveDateTime =
        dto.dateTime !== undefined
          ? dto.dateTime
          : existing.dateTime.toISOString();
      const effectiveLocation =
        dto.location !== undefined ? dto.location : existing.location;
      const effectiveDescription =
        dto.description !== undefined ? dto.description : existing.description;

      this.guardPublishReadiness(
        effectiveTitle,
        effectiveSlug,
        effectiveDateTime,
        effectiveLocation,
        effectiveDescription,
      );
    }

    // Validate asset IDs (only the ones being updated)
    await this.validateAssetIds(dto.mainImageId, dto.croquisId, dto.planId);

    try {
      return await this.client.outing.update({
        where: { id },
        data,
      });
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "P2002") {
        throw new ConflictException(`Slug already exists`);
      }
      if (pgErr.code === "P2025") {
        throw new NotFoundException(`Outing "${id}" not found`);
      }
      throw err;
    }
  }

  /**
   * Archives an outing — sets status to ARCHIVED (OUT-01).
   */
  async archive(id: string): Promise<OutingRow> {
    try {
      return await this.client.outing.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "P2025") {
        throw new NotFoundException(`Outing "${id}" not found`);
      }
      throw err;
    }
  }

  /**
   * Lists outings with optional status filter and pagination (OUT-01).
   */
  async findAll(query: OutingListQueryDto): Promise<OutingRow[]> {
    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }

    return this.client.outing.findMany({
      where,
      skip: query.skip,
      take: query.take,
      orderBy: { dateTime: "desc" },
    });
  }

  /**
   * Finds a single outing by slug (OUT-01).
   */
  async findBySlug(slug: string): Promise<OutingRow | null> {
    return this.client.outing.findUnique({
      where: { slug },
    });
  }

  // -----------------------------------------------------------------------
  // Public API — OUT-06: findAllPublic
  // -----------------------------------------------------------------------

  /**
   * Returns only PUBLISHED outings, mapped to the public OutingResponse shape.
   *
   * Internal fields (createdById, publishedAt, createdAt, updatedAt) are
   * excluded. Asset IDs are resolved to URL paths.
   */
  async findAllPublic(): Promise<OutingResponse[]> {
    const rows = await this.client.outing.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { dateTime: "desc" },
    });
    return rows.map((row) => this.toOutingResponse(row));
  }

  // -----------------------------------------------------------------------
  // Public API — OUT-07: Anonymous Likes
  // -----------------------------------------------------------------------

  /**
   * Likes a PUBLISHED outing using a privacy-safe visitor hash.
   *
   * Derives `visitorHash` from the required VISITOR_HASH_SECRET and request
   * signals (IP + user-agent). Deduplicates via the `@@unique([outingId,
   * visitorHash])` constraint — duplicate likes for the same hash are
   * idempotent and do not increment likesCount.
   *
   * Rejects non-PUBLISHED and non-existent outings.
   * Returns the current (potentially unchanged) likesCount.
   */
  async addLike(
    outingId: string,
    ip: string,
    userAgent: string,
  ): Promise<{ likesCount: number }> {
    const secret = this.configService.get<string>("VISITOR_HASH_SECRET");
    if (!secret) {
      throw new Error("VISITOR_HASH_SECRET is not configured");
    }

    const visitorHash = deriveVisitorHash(secret, "1", ip, userAgent);

    // Validate the outing exists and is PUBLISHED (read-only — outside transaction)
    const outing = await this.client.outing.findUnique({
      where: { id: outingId },
    });
    if (!outing) {
      throw new NotFoundException(`Outing "${outingId}" not found`);
    }
    if (outing.status !== "PUBLISHED") {
      throw new BadRequestException(
        `Cannot like outing "${outingId}": status is ${outing.status}, must be PUBLISHED`,
      );
    }

    // Transactional dedupe: atomic check-then-create with P2002 catch.
    // The @@unique([outingId, visitorHash]) constraint guarantees at most
    // one like row per visitor.  findUnique catches the common idempotent
    // case; the P2002 catch handles concurrent inserts where two requests
    // both pass findUnique before either create commits.
    const result = await this.client.$transaction(async (tx) => {
      const existing = await tx.outingLike.findUnique({
        where: { outingId_visitorHash: { outingId, visitorHash } },
      });
      if (existing) {
        return { likesCount: outing.likesCount };
      }

      try {
        await tx.outingLike.create({
          data: { outingId, visitorHash, fingerprintVersion: 1 },
        });
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === "P2002") {
          return { likesCount: outing.likesCount };
        }
        throw e;
      }

      const updated = await tx.outing.update({
        where: { id: outingId },
        data: { likesCount: { increment: 1 } },
      });
      return { likesCount: updated.likesCount };
    });

    return result;
  }

  // -----------------------------------------------------------------------
  // Admin API — OUT-05: Feature Outing
  // -----------------------------------------------------------------------

  /**
   * Features a PUBLISHED outing by updating the landing singleton.
   *
   * Validates the outing exists and is PUBLISHED, then delegates to
   * LandingService.updateSettings({ featuredOutingId }). The landing
   * singleton remains the source of truth for the featured outing.
   *
   * Rejects DRAFT, ARCHIVED, and non-existent outings.
   * Requires LandingService to be available in the DI container.
   */
  async featureOuting(id: string): Promise<{ featuredOutingId: string }> {
    const outing = await this.client.outing.findUnique({ where: { id } });
    if (!outing) {
      throw new NotFoundException(`Outing "${id}" not found`);
    }
    if (outing.status !== "PUBLISHED") {
      throw new BadRequestException(
        `Cannot feature outing "${id}": status is ${outing.status}, must be PUBLISHED`,
      );
    }

    await this.landingService.persistFeaturedOutingId(id);
    return { featuredOutingId: id };
  }

  /** Clears the landing pointer; repeated clears are intentionally idempotent. */
  async clearFeaturedOuting(): Promise<{ featuredOutingId: null }> {
    await this.landingService.persistFeaturedOutingId(null);
    return { featuredOutingId: null };
  }
}
