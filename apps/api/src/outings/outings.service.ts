/**
 * OutingsService — CRUD, publish-readiness guard, and asset validation.
 *
 * Phase 2a: Core CRUD operations (create, update, archive, findAll, findBySlug)
 * plus publish-readiness enforcement (OUT-02) and asset reference validation (OUT-04).
 *
 * Phase 2b (deferred, next PR slice): findAllPublic, visitor hash derivation,
 * transactional likes (OUT-07), and featured outing delegation (OUT-05).
 *
 * OUT-01: create/read/update/archive with Prisma.
 * OUT-02: publish-readiness guard rejects PUBLISHED when required fields are empty.
 * OUT-03: slug uniqueness enforced at DB level.
 * OUT-04: asset references validated against FileAsset table.
 *
 * Follows the same pattern as LandingService: minimal Prisma interfaces
 * avoid static @prisma/client imports in apps/api/ (BF-02).
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService } from "../db/db.service.js";
import type { CreateOutingDto } from "./dto/create-outing.dto.js";
import type { UpdateOutingDto } from "./dto/update-outing.dto.js";
import type { OutingListQueryDto } from "./dto/outing-list-query.dto.js";

// ---------------------------------------------------------------------------
// Minimal Prisma-model interfaces
// ---------------------------------------------------------------------------

interface OutingRow {
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

interface OutingPrismaClient {
  outing: {
    create(args: { data: Record<string, unknown> }): Promise<OutingRow>;
    findUnique(args: { where: Record<string, unknown> }): Promise<OutingRow | null>;
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
    findUnique(args: { where: Record<string, unknown> }): Promise<FileAssetRow | null>;
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class OutingsService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
  ) {}

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private get client(): OutingPrismaClient {
    return this.dbService.client as unknown as OutingPrismaClient;
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

    await this.validateAssetIds(
      dto.mainImageId,
      dto.croquisId,
      dto.planId,
    );

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
      const effectiveSlug =
        dto.slug !== undefined ? dto.slug : existing.slug;
      const effectiveDateTime =
        dto.dateTime !== undefined ? dto.dateTime : existing.dateTime.toISOString();
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
    await this.validateAssetIds(
      dto.mainImageId,
      dto.croquisId,
      dto.planId,
    );

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
}
