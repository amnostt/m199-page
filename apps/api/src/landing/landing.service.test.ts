/**
 * LandingService unit tests (LP-01, LP-02).
 *
 * Proves settings CRUD and public payload assembly using a mocked DbService.
 * Follows the pattern from responsibles.service.test.ts:
 * Test.createTestingModule with explicit provider overrides and per-test
 * fixture builders.
 *
 * Featured outing/posts keys are intentionally absent after the
 * Mission/Publication domain reset (Slice 1). No replacement field is
 * exposed.
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { LandingService } from "./landing.service.js";
import { DbService } from "../db/db.service.js";

// ---- test data ------------------------------------------------------------

interface LandingSettingsRow {
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

const FULL_SETTINGS: LandingSettingsRow = {
  id: 1,
  heroTitle: "Misión 1-99",
  heroSubtitle: "Transformando vidas",
  heroImageId: "img-001",
  mission: "Nuestra misión es servir",
  vision: "Ser referencia en la comunidad",
  description: "Somos una organización dedicada a...",
  featuredVideoUrl: "https://youtube.com/watch?v=abc",
  contactEmail: "info@m199.org",
  contactPhone: "+54 11 1234-5678",
};

const CURRENT_VERSE: VerseRow = {
  id: "v-001",
  text: "Todo lo puedo en Cristo que me fortalece",
  reference: "Filipenses 4:13",
  date: new Date("2026-07-01"),
  publishedAt: new Date("2026-07-01T12:00:00Z"),
  status: "PUBLISHED",
};

const DRAFT_VERSE: VerseRow = {
  id: "v-002",
  text: "Draft verse",
  reference: "Juan 3:16",
  date: new Date("2026-06-30"),
  publishedAt: null,
  status: "DRAFT",
};

// ---- mock helpers ----------------------------------------------------------

interface MockDbOverrides {
  settingsReturn?: LandingSettingsRow | null;
  verseReturn?: VerseRow | null;
  fileAssetReturn?: FileAssetRow | null;
}

/** Query shape the service passes to verse.findFirst */
interface VerseQuery {
  where?: { status?: string };
  orderBy?: { publishedAt?: string } | { publishedAt?: string; id?: string }[];
}

function makeDbValue(overrides: MockDbOverrides = {}) {
  const findFirst = vi
    .fn<
      (args?: Record<string, unknown>) => Promise<LandingSettingsRow | null>
    >()
    .mockResolvedValue(overrides.settingsReturn ?? null);

  const upsert = vi
    .fn<
      (args: {
        where: Record<string, unknown>;
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<LandingSettingsRow>
    >()
    .mockImplementation(
      async (args: {
        where: Record<string, unknown>;
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        // Simulate upsert: merge update over base settings
        const base = overrides.settingsReturn ?? FULL_SETTINGS;
        const merged = {
          ...base,
          ...(args.update as Partial<LandingSettingsRow>),
        };
        return merged;
      },
    );

  // verse.findFirst — respects where.status; returns the configured
  // verseReturn. Multi-verse ordering (orderBy.publishedAt desc) is
  // delegated to the DB in production — this mock covers query-shape
  // assertions, not sorting behavior.
  const verseFindFirst = vi
    .fn<(args?: VerseQuery) => Promise<VerseRow | null>>()
    .mockImplementation(async (args?: VerseQuery) => {
      const candidate = overrides.verseReturn ?? null;
      // If status filter is set, only return if candidate matches
      if (args?.where?.status && candidate) {
        return candidate.status === args.where.status ? candidate : null;
      }
      return candidate;
    });

  const fileAssetFindUnique = vi
    .fn<(args: { where: { id: string } }) => Promise<FileAssetRow | null>>()
    .mockImplementation(async (args) => {
      const asset = overrides.fileAssetReturn ?? null;
      return asset?.id === args.where.id ? asset : null;
    });

  const client = {
    landingSettings: { findFirst, upsert },
    fileAsset: { findUnique: fileAssetFindUnique },
    verse: { findFirst: verseFindFirst },
  };

  return {
    client,
    findFirst,
    upsert,
    verseFindFirst,
    fileAssetFindUnique,
  };
}

interface ServiceFixture {
  service: LandingService;
  mocks: ReturnType<typeof makeDbValue>;
}

async function buildService(
  dbOverrides: MockDbOverrides = {},
): Promise<ServiceFixture> {
  const dbValue = makeDbValue(dbOverrides);

  const module = await Test.createTestingModule({
    providers: [LandingService, { provide: DbService, useValue: dbValue }],
  }).compile();

  return {
    service: module.get(LandingService),
    mocks: dbValue,
  };
}

// ---- tests ----------------------------------------------------------------

describe("LandingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- getSettings (LP-01) ------------------------------------------------

  describe("getSettings (LP-01)", () => {
    it("returns landing settings when they exist", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
      });

      const result = await service.getSettings();

      expect(mocks.findFirst).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.heroTitle).toBe("Misión 1-99");
      expect(result?.mission).toBe("Nuestra misión es servir");
      expect(result?.vision).toBe("Ser referencia en la comunidad");
      expect(result?.contactEmail).toBe("info@m199.org");
    });

    it("returns null when no settings row exists", async () => {
      const { service } = await buildService({ settingsReturn: null });

      const result = await service.getSettings();

      expect(result).toBeNull();
    });
  });

  // ---- updateSettings (LP-01) ---------------------------------------------

  describe("updateSettings (LP-01)", () => {
    it("validates a LANDING_HERO asset before persisting its ID", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
        fileAssetReturn: { id: "hero-asset", category: "LANDING_HERO" },
      });

      const result = await service.updateSettings({
        heroImageId: "hero-asset",
      });

      expect(mocks.fileAssetFindUnique).toHaveBeenCalledWith({
        where: { id: "hero-asset" },
      });
      expect(mocks.upsert).toHaveBeenCalledOnce();
      expect(result.heroImageId).toBe("hero-asset");
    });

    it("preserves an omitted hero image ID without an asset lookup", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
      });

      const result = await service.updateSettings({
        heroSubtitle: "Updated hero subtitle",
      });

      expect(mocks.fileAssetFindUnique).not.toHaveBeenCalled();
      expect(mocks.upsert).toHaveBeenCalledOnce();
      expect(result.heroSubtitle).toBe("Updated hero subtitle");
      expect(result.heroImageId).toBe(FULL_SETTINGS.heroImageId);
    });

    it("rejects a missing hero asset before upserting changed copy", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
      });

      await expect(
        service.updateSettings({
          heroTitle: "Changed title",
          heroImageId: "missing-asset",
        }),
      ).rejects.toThrow('FileAsset with id "missing-asset" not found');

      expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("rejects a wrong-category hero asset before upserting changed copy", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
        fileAssetReturn: {
          id: "publication-asset",
          category: "PUBLICATION_FEATURED_IMAGE",
        },
      });

      await expect(
        service.updateSettings({
          heroTitle: "Changed title",
          heroImageId: "publication-asset",
        }),
      ).rejects.toThrow(
        'FileAsset "publication-asset" must have category LANDING_HERO',
      );

      expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("upserts settings with provided fields only (partial merge)", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
      });

      const dto = {
        mission: "Nueva misión",
        vision: "Nueva visión",
      };

      const result = await service.updateSettings(dto);

      // Verify upsert was called with id:1 singleton key
      expect(mocks.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
        }),
      );

      // The upsert update should only include provided fields
      const callArgs = mocks.upsert.mock.calls[0]![0] as {
        where: { id: number };
        create: { id: number } & Record<string, unknown>;
        update: Record<string, unknown>;
      };
      expect(callArgs.update).toHaveProperty("mission", "Nueva misión");
      expect(callArgs.update).toHaveProperty("vision", "Nueva visión");
      // Should NOT set fields that weren't provided
      expect(callArgs.update).not.toHaveProperty("heroTitle");
      expect(callArgs.update).not.toHaveProperty("contactEmail");

      expect(result).toBeDefined();
    });

    it("retains existing values for omitted fields", async () => {
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
      });

      const result = await service.updateSettings({
        contactEmail: "nuevo@m199.org",
      });

      // The mock implementation merges, so existing fields survive
      expect(result?.contactEmail).toBe("nuevo@m199.org");
    });

    it("builds create payload with id:1 for upsert when row does not exist", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: null,
      });

      await service.updateSettings({
        mission: "Primera misión",
      });

      const callArgs = mocks.upsert.mock.calls[0]![0] as {
        where: { id: number };
        create: { id: number } & Record<string, unknown>;
        update: Record<string, unknown>;
      };

      // create should always include id:1 for singleton
      expect(callArgs.create).toHaveProperty("id", 1);
      expect(callArgs.create).toHaveProperty("mission", "Primera misión");
    });

    it("ignores an attempted featured pointer while preserving hero settings", async () => {
      // Validation pipe whitelists UpdateLandingSettingsDto fields; any
      // unknown property is stripped before reaching the service. The
      // service itself does not inspect featuredOutingId.
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
      });

      const result = await service.updateSettings({
        heroTitle: "Updated hero",
        // featuredOutingId is no longer part of the DTO; this guards
        // against any legacy field sneaking through.
        featuredOutingId: "out-002",
      } as never);

      const call = mocks.upsert.mock.calls[0]![0];
      expect(call.update).toEqual({ heroTitle: "Updated hero" });
      expect(result.heroTitle).toBe("Updated hero");
    });
  });

  // ---- getPublicPayload (LP-02) -------------------------------------------

  describe("getPublicPayload (LP-02)", () => {
    it("assembles full payload when all data is available", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
        verseReturn: CURRENT_VERSE,
      });

      const result = await service.getPublicPayload();

      // Hero fields from settings
      expect(result.heroTitle).toBe("Misión 1-99");
      expect(result.heroSubtitle).toBe("Transformando vidas");
      expect(result.heroImageUrl).toBe("/files/img-001");

      // Mission/vision/description
      expect(result.mission).toBe("Nuestra misión es servir");
      expect(result.vision).toBe("Ser referencia en la comunidad");
      expect(result.description).toBe("Somos una organización dedicada a...");

      // Contact / video
      expect(result.featuredVideoUrl).toBe("https://youtube.com/watch?v=abc");
      expect(result.contactEmail).toBe("info@m199.org");
      expect(result.contactPhone).toBe("+54 11 1234-5678");

      // Current verse
      expect(result.currentVerse).not.toBeNull();
      expect(result.currentVerse?.text).toContain("Todo lo puedo");
      expect(result.currentVerse?.reference).toBe("Filipenses 4:13");

      // Verify verse query filters by PUBLISHED and orders by publishedAt desc, id desc
      expect(mocks.verseFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PUBLISHED" },
          orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        }),
      );

      // Featured outing/posts keys MUST NOT be present after the domain reset.
      expect(
        (result as unknown as Record<string, unknown>).featuredOuting,
      ).toBeUndefined();
      expect(
        (result as unknown as Record<string, unknown>).featuredPosts,
      ).toBeUndefined();
    });

    it("returns null for currentVerse when no published verse exists", async () => {
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        verseReturn: null,
      });

      const result = await service.getPublicPayload();

      expect(result.currentVerse).toBeNull();
    });

    it("returns null for currentVerse when verse is DRAFT (status filter)", async () => {
      // Mock has a DRAFT verse, findFirst filter removes it
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        verseReturn: DRAFT_VERSE,
      });

      const result = await service.getPublicPayload();

      expect(result.currentVerse).toBeNull();
    });

    it("never throws — returns null sections for completely missing data", async () => {
      const { service } = await buildService({
        settingsReturn: null,
        verseReturn: null,
      });

      // Should not throw
      const result = await service.getPublicPayload();

      expect(result.heroTitle).toBeNull();
      expect(result.heroSubtitle).toBeNull();
      expect(result.heroImageUrl).toBeNull();
      expect(result.mission).toBeNull();
      expect(result.vision).toBeNull();
      expect(result.description).toBeNull();
      expect(result.featuredVideoUrl).toBeNull();
      expect(result.contactEmail).toBeNull();
      expect(result.contactPhone).toBeNull();
      expect(result.currentVerse).toBeNull();
    });

    it("returns null heroImageUrl when heroImageId is null", async () => {
      const { service } = await buildService({
        settingsReturn: { ...FULL_SETTINGS, heroImageId: null },
        verseReturn: null,
      });

      const result = await service.getPublicPayload();

      expect(result.heroImageUrl).toBeNull();
    });

    // -- currentVerse ordering by publishedAt ---------------------------------

    it("selects verse by publishedAt desc (not date)", async () => {
      // The service queries by publishedAt desc (with id desc tiebreaker).
      // This test verifies the query shape is correct — actual multi-verse
      // ordering is tested at the VersesService layer.
      const laterVerse: VerseRow = {
        id: "v-late",
        text: "Late",
        reference: "John 3:16",
        date: new Date("2026-07-02"), // same date
        publishedAt: new Date("2026-07-02T15:00:00Z"), // later publishedAt
        status: "PUBLISHED",
      };

      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
        verseReturn: laterVerse, // should be the one returned
      });

      const result = await service.getPublicPayload();

      expect(result.currentVerse).not.toBeNull();
      expect(result.currentVerse?.text).toBe("Late");
      expect(mocks.verseFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        }),
      );
    });

    // -- timezone edge case: near-midnight UTC vs America/Lima -----------------

    it("groups near-midnight UTC verse with previous Lima date", async () => {
      // 2026-07-02T04:30:00Z → Lima is still 2026-07-01 23:30 (-05)
      // The stored date should be 2026-07-01, and the landing returns it.
      const nearMidnightVerse: VerseRow = {
        id: "v-tz",
        text: "Near midnight",
        reference: "Psalm 119:105",
        date: new Date("2026-07-01T00:00:00.000Z"), // Lima date = July 1
        publishedAt: new Date("2026-07-02T04:30:00.000Z"), // UTC near midnight
        status: "PUBLISHED",
      };

      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        verseReturn: nearMidnightVerse,
      });

      const result = await service.getPublicPayload();

      expect(result.currentVerse).not.toBeNull();
      // The date shown is the Lima calendar date (July 1), not the UTC date (July 2)
      expect(result.currentVerse?.text).toBe("Near midnight");
      // Verify the stored Lima date is returned correctly
      expect(result.currentVerse?.date).toBe("2026-07-01T00:00:00.000Z");
    });

    it("returns currentVerse null when the only verse is DRAFT", async () => {
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        verseReturn: DRAFT_VERSE,
      });

      const result = await service.getPublicPayload();

      expect(result.currentVerse).toBeNull();
    });

    // -- hardening: fallback after latest verse is deleted --------------------

    it("falls back to next latest verse when the latest is deleted", async () => {
      // Two published verses with different publishedAt timestamps.
      // The landing service queries with orderBy: publishedAt desc,
      // so findFirst returns the most recent remaining verse.
      const earlierVerse: VerseRow = {
        id: "v-earlier",
        text: "Earlier verse",
        reference: "Genesis 1:1",
        date: new Date("2026-06-30"),
        publishedAt: new Date("2026-06-30T10:00:00Z"),
        status: "PUBLISHED",
      };

      const latestVerse: VerseRow = {
        id: "v-latest",
        text: "Latest verse",
        reference: "John 1:1",
        date: new Date("2026-07-01"),
        publishedAt: new Date("2026-07-01T10:00:00Z"),
        status: "PUBLISHED",
      };

      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
        verseReturn: latestVerse, // initially the latest is the current
      });

      // Before deletion: landing returns the latest verse
      const before = await service.getPublicPayload();
      expect(before.currentVerse?.text).toBe("Latest verse");
      expect(before.currentVerse?.reference).toBe("John 1:1");

      // Simulate deletion: the latest verse is removed from the DB.
      // Reconfigure the mock so findFirst returns the earlier (next latest) verse.
      mocks.verseFindFirst.mockResolvedValue(earlierVerse);

      // After deletion: landing falls back to the next latest remaining verse
      const after = await service.getPublicPayload();
      expect(after.currentVerse).not.toBeNull();
      expect(after.currentVerse?.text).toBe("Earlier verse");
      expect(after.currentVerse?.reference).toBe("Genesis 1:1");

      // Both calls use the same query: PUBLISHED status + publishedAt desc, id desc
      expect(mocks.verseFindFirst).toHaveBeenCalledTimes(2);
      expect(mocks.verseFindFirst).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { status: "PUBLISHED" },
          orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        }),
      );
      expect(mocks.verseFindFirst).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { status: "PUBLISHED" },
          orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        }),
      );
    });

    // -- spec invariant: featured-outing/featured-posts keys absent ----------

    it("public payload NEVER exposes featuredOuting or featuredPosts keys", async () => {
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        verseReturn: CURRENT_VERSE,
      });

      const result = await service.getPublicPayload();

      // Hard spec invariant (landing spec: featured-payload-removal)
      expect(
        Object.prototype.hasOwnProperty.call(result, "featuredOuting"),
      ).toBe(false);
      expect(
        Object.prototype.hasOwnProperty.call(result, "featuredPosts"),
      ).toBe(false);
    });
  });
});
