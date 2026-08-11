/**
 * LandingService — singleton settings CRUD and public payload assembly.
 *
 * LP-01: getSettings() reads the singleton LandingSettings row.
 *        updateSettings(dto) upserts with id:1, applying only provided fields.
 * LP-02: getPublicPayload() assembles hero, current verse, and the public
 *        contract — no featured-outing/featured-posts keys (Slice 1 of the
 *        Mission/Publication domain reset removed those payloads).
 *
 * Follows the same pattern as ResponsiblesService: minimal Prisma interfaces
 * avoid static @prisma/client imports in apps/api/ (BF-02).
 */
import { Inject, Injectable } from "@nestjs/common";
import { DbService } from "../db/db.service.js";
import { assertFileCategory } from "../file-module/assert-file-category.js";
import type { UpdateLandingSettingsDto } from "./dto/update-landing-settings.dto.js";

// ---------------------------------------------------------------------------
// Minimal Prisma-model interfaces used by the landing service.
// ---------------------------------------------------------------------------

export interface LandingSettingsRow {
  id: number;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageId: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
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

export interface CurrentVersePayload {
  text: string;
  reference: string;
  date: string;
}

/**
 * LandingPublicPayload — public landing payload (LP-02).
 *
 * Featured outing/posts keys are intentionally absent after the
 * Mission/Publication domain reset. No replacement field is exposed in
 * Slice 1.
 */
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
    await assertFileCategory(this.client, fileId, "LANDING_HERO");
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
   * Featured outing/posts keys are intentionally absent after the
   * Mission/Publication domain reset.
   */
  async getPublicPayload(): Promise<LandingPublicPayload> {
    const settings = await this.client.landingSettings.findFirst();

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
