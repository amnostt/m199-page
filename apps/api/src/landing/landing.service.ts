/**
 * LandingService — singleton settings CRUD and public payload assembly.
 *
 * LP-01: getSettings() reads the singleton LandingSettings row.
 *        updateSettings(dto) upserts with id:1, applying only provided fields.
 * LP-02: getPublicPayload() assembles hero, featured posts, featured outing,
 *        and current verse into a public response with null-safe fallbacks.
 *
 * Follows the same pattern as ResponsiblesService: minimal Prisma interfaces
 * avoid static @prisma/client imports in apps/api/ (BF-02).
 */
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { DbService } from "../db/db.service.js";
import type { UpdateLandingSettingsDto } from "./dto/update-landing-settings.dto.js";

// ---------------------------------------------------------------------------
// Minimal Prisma-model interfaces used by the landing service.
// ---------------------------------------------------------------------------

export interface LandingSettingsRow {
  id: number;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageId: string | null;
  featuredOutingId: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface OutingRow {
  id: string;
  slug: string;
  title: string;
  location: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  mainImageId: string | null;
}

interface PostRow {
  id: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  coverImageId: string | null;
}

interface FeaturedPostRow {
  id: string;
  slot: string;
  postId: string;
  featuredAt: Date;
  post: PostRow;
}

interface VerseRow {
  id: string;
  text: string;
  reference: string;
  date: Date;
  publishedAt: Date | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

interface FileAssetRow {
  id: string;
  category: string;
}

interface LandingPrismaClient {
  landingSettings: {
    findFirst(
      args?: Record<string, unknown>,
    ): Promise<LandingSettingsRow | null>;
    upsert(args: {
      where: { id: number };
      create: { id: number } & Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<LandingSettingsRow>;
  };
  fileAsset: {
    findUnique(args: { where: { id: string } }): Promise<FileAssetRow | null>;
  };
  featuredPost: {
    findMany(args?: {
      where?: { post?: { status?: string } };
      include?: { post?: boolean };
      orderBy?: { featuredAt?: string };
      take?: number;
    }): Promise<FeaturedPostRow[]>;
  };
  outing: {
    findUnique(args: { where: { id: string } }): Promise<OutingRow | null>;
  };
  verse: {
    findFirst(args?: {
      where?: { status?: string };
      orderBy?:
        { publishedAt?: string } | { publishedAt?: string; id?: string }[];
    }): Promise<VerseRow | null>;
  };
}

// ---------------------------------------------------------------------------
// Public response shapes
// ---------------------------------------------------------------------------

export interface FeaturedOutingPayload {
  id: string;
  slug: string;
  title: string;
  location: string;
  mainImageUrl: string | null;
}

export interface FeaturedPostPayload {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
}

export interface CurrentVersePayload {
  text: string;
  reference: string;
  date: string;
}

export interface LandingPublicPayload {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  featuredOuting: FeaturedOutingPayload | null;
  featuredPosts: FeaturedPostPayload[];
  currentVerse: CurrentVersePayload | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class LandingService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /** Casts DbService.client to the minimal Prisma interface this service needs. */
  private get client(): LandingPrismaClient {
    return this.dbService.client as unknown as LandingPrismaClient;
  }

  /** Resolves a file ID to a public URL path, or null if no ID. */
  private fileUrl(fileId: string | null | undefined): string | null {
    if (!fileId) return null;
    return `/files/${fileId}`;
  }

  /** Validates that a hero asset exists and belongs to the hero category. */
  private async validateHeroImage(fileId: string): Promise<void> {
    const asset = await this.client.fileAsset.findUnique({
      where: { id: fileId },
    });
    if (!asset) {
      throw new BadRequestException(`FileAsset with id "${fileId}" not found`);
    }
    if (asset.category !== "LANDING_HERO") {
      throw new BadRequestException(
        `FileAsset "${fileId}" must have category LANDING_HERO`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // Public API — LP-01: Admin Landing Settings
  // -----------------------------------------------------------------------

  /**
   * Reads the singleton landing settings row.
   *
   * Returns null when no settings row has been created yet — the admin
   * should upsert to create the initial row.
   */
  async getSettings(): Promise<LandingSettingsRow | null> {
    return this.client.landingSettings.findFirst();
  }

  /**
   * Upserts the singleton landing settings (LP-01).
   *
   * Uses id:1 as the sentinel key. Only provided DTO fields are applied;
   * omitted fields retain their current values (partial merge via upsert).
   */
  async updateSettings(
    dto: UpdateLandingSettingsDto,
  ): Promise<LandingSettingsRow> {
    if (dto.heroImageId !== undefined) {
      await this.validateHeroImage(dto.heroImageId);
    }

    // Build the update payload from only the fields that were actually provided.
    const data: Record<string, unknown> = {};
    if (dto.heroTitle !== undefined) data.heroTitle = dto.heroTitle;
    if (dto.heroSubtitle !== undefined) data.heroSubtitle = dto.heroSubtitle;
    if (dto.heroImageId !== undefined) data.heroImageId = dto.heroImageId;
    if (dto.featuredOutingId !== undefined)
      data.featuredOutingId = dto.featuredOutingId;
    if (dto.mission !== undefined) data.mission = dto.mission;
    if (dto.vision !== undefined) data.vision = dto.vision;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.featuredVideoUrl !== undefined)
      data.featuredVideoUrl = dto.featuredVideoUrl;
    if (dto.contactEmail !== undefined) data.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone;

    return this.client.landingSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });
  }

  // -----------------------------------------------------------------------
  // Public API — LP-02: Public Landing Payload
  // -----------------------------------------------------------------------

  /**
   * Assembles the public landing payload from multiple Prisma queries.
   *
   * Never throws — missing or null sections return null/empty arrays so the
   * web renderer degrades gracefully (LP-02, LP-03).
   *
   * DB-level filters enforce that only PUBLISHED content appears:
   *  - featuredPost query filters on post.status = "PUBLISHED"
   *  - verse query filters on status = "PUBLISHED"
   *  - outing is fetched directly and then guarded for status = "PUBLISHED"
   */
  async getPublicPayload(): Promise<LandingPublicPayload> {
    const settings = await this.client.landingSettings.findFirst();

    // Fetch featured posts filtered to PUBLISHED, ordered by featuredAt desc, capped at 3 (LP-02).
    const featuredPosts = await this.client.featuredPost.findMany({
      where: { post: { status: "PUBLISHED" } },
      include: { post: true },
      orderBy: { featuredAt: "desc" },
      take: 3,
    });

    // Fetch featured outing only if featuredOutingId is set.
    let outing: OutingRow | null = null;
    if (settings?.featuredOutingId) {
      outing = await this.client.outing.findUnique({
        where: { id: settings.featuredOutingId },
      });
    }

    // Fetch the most recent published verse by publishedAt (server UTC instant),
    // with id desc as deterministic tiebreaker.
    const verse = await this.client.verse.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    });

    return {
      heroTitle: settings?.heroTitle ?? null,
      heroSubtitle: settings?.heroSubtitle ?? null,
      heroImageUrl: this.fileUrl(settings?.heroImageId),
      mission: settings?.mission ?? null,
      vision: settings?.vision ?? null,
      description: settings?.description ?? null,
      featuredVideoUrl: settings?.featuredVideoUrl ?? null,
      contactEmail: settings?.contactEmail ?? null,
      contactPhone: settings?.contactPhone ?? null,

      featuredOuting:
        outing && outing.status === "PUBLISHED"
          ? {
              id: outing.id,
              slug: outing.slug,
              title: outing.title,
              location: outing.location,
              mainImageUrl: this.fileUrl(outing.mainImageId),
            }
          : null,

      featuredPosts: featuredPosts.map((fp) => ({
        id: fp.post.id,
        slug: fp.post.slug,
        title: fp.post.title,
        coverImageUrl: this.fileUrl(fp.post.coverImageId),
      })),

      currentVerse: verse
        ? {
            text: verse.text,
            reference: verse.reference,
            date: verse.date.toISOString(),
          }
        : null,
    };
  }
}
