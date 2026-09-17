/**
 * LandingService — singleton settings CRUD and public payload assembly.
 *
 * LP-01: getSettings() reads the singleton LandingSettings row.
 *        updateSettings(dto) upserts with id:1, applying only provided fields.
 * LP-02: getPublicPayload() assembles hero, landing verse, and the public
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
  missionsTitle: string | null;
  missionsDescription: string | null;
  publicationsTitle: string | null;
  publicationsDescription: string | null;
  aboutTitle: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoId: string | null;
  contactTitle: string | null;
  contactDescription: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  verseText: string | null;
  verseReference: string | null;
  visualBreakImageId: string | null;
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
}

// ---------------------------------------------------------------------------
// Public response shapes
// ---------------------------------------------------------------------------

export interface CurrentVersePayload {
  text: string;
  reference: string;
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
  missionsTitle: string | null;
  missionsDescription: string | null;
  publicationsTitle: string | null;
  publicationsDescription: string | null;
  aboutTitle: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null;
  contactTitle: string | null;
  contactDescription: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  visualBreakImageUrl: string | null;
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

  /** Resolves a file ID to a local public URL path, or null if no ID. */
  private fileUrl(fileId: string | null | undefined): string | null {
    if (!fileId || fileId.includes("/")) return null;
    return `/files/${fileId}`;
  }

  /** Validates that a landing asset exists and belongs to its category. */
  private async validateLandingImage(
    fileId: string,
    category: "LANDING_HERO" | "LANDING_VISUAL_BREAK",
  ): Promise<void> {
    await assertFileCategory(this.client, fileId, category);
  }

  /** Validates that a featured video asset exists and has the video category. */
  private async validateFeaturedVideo(fileId: string): Promise<void> {
    await assertFileCategory(this.client, fileId, "LANDING_FEATURED_VIDEO");
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
    if (dto.heroImageId !== undefined && dto.heroImageId !== null) {
      await this.validateLandingImage(dto.heroImageId, "LANDING_HERO");
    }
    if (
      dto.visualBreakImageId !== undefined &&
      dto.visualBreakImageId !== null
    ) {
      await this.validateLandingImage(
        dto.visualBreakImageId,
        "LANDING_VISUAL_BREAK",
      );
    }
    if (dto.featuredVideoId !== undefined && dto.featuredVideoId !== null) {
      await this.validateFeaturedVideo(dto.featuredVideoId);
    }

    // Build the update payload from only the fields that were actually provided.
    const data: Record<string, unknown> = {};
    if (dto.heroTitle !== undefined) data.heroTitle = dto.heroTitle;
    if (dto.heroSubtitle !== undefined) data.heroSubtitle = dto.heroSubtitle;
    if (dto.heroImageId !== undefined) data.heroImageId = dto.heroImageId;
    if (dto.missionsTitle !== undefined) data.missionsTitle = dto.missionsTitle;
    if (dto.missionsDescription !== undefined)
      data.missionsDescription = dto.missionsDescription;
    if (dto.publicationsTitle !== undefined)
      data.publicationsTitle = dto.publicationsTitle;
    if (dto.publicationsDescription !== undefined)
      data.publicationsDescription = dto.publicationsDescription;
    if (dto.aboutTitle !== undefined) data.aboutTitle = dto.aboutTitle;
    if (dto.mission !== undefined) data.mission = dto.mission;
    if (dto.vision !== undefined) data.vision = dto.vision;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.featuredVideoId !== undefined)
      data.featuredVideoId = dto.featuredVideoId;
    if (dto.contactTitle !== undefined) data.contactTitle = dto.contactTitle;
    if (dto.contactDescription !== undefined)
      data.contactDescription = dto.contactDescription;
    if (dto.contactEmail !== undefined) data.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone;
    if (dto.verseText !== undefined) data.verseText = dto.verseText;
    if (dto.verseReference !== undefined)
      data.verseReference = dto.verseReference;
    if (dto.visualBreakImageId !== undefined)
      data.visualBreakImageId = dto.visualBreakImageId;

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
   * Assembles the public landing payload from the singleton settings row.
   *
   * Never throws — missing or null sections return null/empty arrays so the
   * web renderer degrades gracefully (LP-02, LP-03).
   *
   * Featured outing/posts keys are intentionally absent after the
   * Mission/Publication domain reset.
   */
  async getPublicPayload(): Promise<LandingPublicPayload> {
    const settings = await this.client.landingSettings.findFirst();

    const verseText = settings?.verseText?.trim() ?? "";
    const verseReference = settings?.verseReference?.trim() ?? "";
    const normalizeCopy = (value: string | null | undefined): string | null => {
      const normalized = value?.trim() ?? "";
      return normalized || null;
    };

    return {
      heroTitle: normalizeCopy(settings?.heroTitle),
      heroSubtitle: normalizeCopy(settings?.heroSubtitle),
      heroImageUrl: this.fileUrl(settings?.heroImageId),
      missionsTitle: normalizeCopy(settings?.missionsTitle),
      missionsDescription: normalizeCopy(settings?.missionsDescription),
      publicationsTitle: normalizeCopy(settings?.publicationsTitle),
      publicationsDescription: normalizeCopy(settings?.publicationsDescription),
      aboutTitle: normalizeCopy(settings?.aboutTitle),
      mission: normalizeCopy(settings?.mission),
      vision: normalizeCopy(settings?.vision),
      description: normalizeCopy(settings?.description),
      featuredVideoUrl: this.fileUrl(settings?.featuredVideoId),
      contactTitle: normalizeCopy(settings?.contactTitle),
      contactDescription: normalizeCopy(settings?.contactDescription),
      contactEmail: normalizeCopy(settings?.contactEmail),
      contactPhone: normalizeCopy(settings?.contactPhone),
      visualBreakImageUrl: this.fileUrl(settings?.visualBreakImageId),
      currentVerse:
        verseText && verseReference
          ? { text: verseText, reference: verseReference }
          : null,
    };
  }
}
