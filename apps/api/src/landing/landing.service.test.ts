/**
 * LandingService unit tests (LP-01, LP-02).
 *
 * Proves settings CRUD and public payload assembly using a mocked DbService.
 * Follows the pattern from responsibles.service.test.ts:
 * Test.createTestingModule with explicit provider overrides and per-test
 * fixture builders.
 *
 * Mocks respect Prisma query arguments (where, orderBy) so tests verify
 * that the service passes correct DB-level filters — not just in-memory
 * post-processing.
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
  post: PostRow;
}

interface VerseRow {
  id: string;
  text: string;
  reference: string;
  date: Date;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

const FULL_SETTINGS: LandingSettingsRow = {
  id: 1,
  heroTitle: "Misión 1-99",
  heroSubtitle: "Transformando vidas",
  heroImageId: "img-001",
  featuredOutingId: "out-001",
  mission: "Nuestra misión es servir",
  vision: "Ser referencia en la comunidad",
  description: "Somos una organización dedicada a...",
  featuredVideoUrl: "https://youtube.com/watch?v=abc",
  contactEmail: "info@m199.org",
  contactPhone: "+54 11 1234-5678",
};

const PUBLISHED_OUTING: OutingRow = {
  id: "out-001",
  slug: "salida-mensual",
  title: "Salida Mensual",
  location: "Barrio Norte",
  status: "PUBLISHED",
  mainImageId: "img-out-001",
};

const DRAFT_OUTING: OutingRow = {
  id: "out-002",
  slug: "salida-draft",
  title: "Salida Draft",
  location: "Centro",
  status: "DRAFT",
  mainImageId: null,
};

const ARCHIVED_OUTING: OutingRow = {
  id: "out-003",
  slug: "salida-archived",
  title: "Salida Archivada",
  location: "Palermo",
  status: "ARCHIVED",
  mainImageId: "img-out-003",
};

const PUBLISHED_POST: PostRow = {
  id: "post-001",
  slug: "primer-post",
  title: "Primer Post",
  status: "PUBLISHED",
  coverImageId: "img-post-001",
};

const DRAFT_POST: PostRow = {
  id: "post-002",
  slug: "post-draft",
  title: "Post Draft",
  status: "DRAFT",
  coverImageId: null,
};

const FEATURED_PUBLISHED: FeaturedPostRow = {
  id: "fp-1",
  slot: "SLOT_1",
  postId: "post-001",
  post: PUBLISHED_POST,
};

const FEATURED_DRAFT: FeaturedPostRow = {
  id: "fp-2",
  slot: "SLOT_2",
  postId: "post-002",
  post: DRAFT_POST,
};

const CURRENT_VERSE: VerseRow = {
  id: "v-001",
  text: "Todo lo puedo en Cristo que me fortalece",
  reference: "Filipenses 4:13",
  date: new Date("2026-07-01"),
  status: "PUBLISHED",
};

const DRAFT_VERSE: VerseRow = {
  id: "v-002",
  text: "Draft verse",
  reference: "Juan 3:16",
  date: new Date("2026-06-30"),
  status: "DRAFT",
};

// ---- mock helpers ----------------------------------------------------------

interface MockDbOverrides {
  settingsReturn?: LandingSettingsRow | null;
  featuredPostsReturns?: FeaturedPostRow[];
  outingReturn?: OutingRow | null;
  verseReturn?: VerseRow | null;
}

/** Query shape the service passes to featuredPost.findMany */
interface FeaturedPostQuery {
  where?: { post?: { status?: string } };
  include?: { post?: boolean };
}

/** Query shape the service passes to verse.findFirst */
interface VerseQuery {
  where?: { status?: string };
  orderBy?: { date?: string };
}

function makeDbValue(overrides: MockDbOverrides = {}) {
  const findFirst = vi
    .fn<(args?: Record<string, unknown>) => Promise<LandingSettingsRow | null>>()
    .mockResolvedValue(overrides.settingsReturn ?? null);

  const upsert = vi
    .fn<(args: {
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<LandingSettingsRow>>()
    .mockImplementation(
      async (args: {
        where: Record<string, unknown>;
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        // Simulate upsert: merge update over base settings
        const base = overrides.settingsReturn ?? FULL_SETTINGS;
        const merged = { ...base, ...(args.update as Partial<LandingSettingsRow>) };
        return merged;
      },
    );

  // featuredPost.findMany — respects where.post.status filter like real Prisma
  const findMany = vi
    .fn<(args?: FeaturedPostQuery) => Promise<FeaturedPostRow[]>>()
    .mockImplementation(async (args?: FeaturedPostQuery) => {
      let results = overrides.featuredPostsReturns ?? [];
      if (args?.where?.post?.status) {
        results = results.filter(
          (fp) => fp.post.status === args.where!.post!.status,
        );
      }
      return results;
    });

  // outing.findUnique — returns the override or null
  const findUnique = vi
    .fn<(args: { where: Record<string, unknown> }) => Promise<OutingRow | null>>()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const id = args.where?.id as string | undefined;
      // Only return if the id matches the override
      if (id && overrides.outingReturn && overrides.outingReturn.id === id) {
        return overrides.outingReturn;
      }
      return null;
    });

  // verse.findFirst — respects where.status and orderBy.date
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

  const client = {
    landingSettings: { findFirst, upsert },
    featuredPost: { findMany },
    outing: { findUnique },
    verse: { findFirst: verseFindFirst },
  };

  return { client, findFirst, upsert, findMany, findUnique, verseFindFirst };
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
    providers: [
      LandingService,
      { provide: DbService, useValue: dbValue },
    ],
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
  });

  // ---- getPublicPayload (LP-02) -------------------------------------------

  describe("getPublicPayload (LP-02)", () => {
    it("assembles full payload when all data is available", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
        featuredPostsReturns: [FEATURED_PUBLISHED],
        outingReturn: PUBLISHED_OUTING,
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

      // Featured outing
      expect(result.featuredOuting).not.toBeNull();
      expect(result.featuredOuting?.id).toBe("out-001");
      expect(result.featuredOuting?.title).toBe("Salida Mensual");
      expect(result.featuredOuting?.slug).toBe("salida-mensual");
      expect(result.featuredOuting?.location).toBe("Barrio Norte");
      expect(result.featuredOuting?.mainImageUrl).toBe("/files/img-out-001");

      // Featured posts
      expect(result.featuredPosts).toHaveLength(1);
      expect(result.featuredPosts[0]!.id).toBe("post-001");
      expect(result.featuredPosts[0]!.title).toBe("Primer Post");
      expect(result.featuredPosts[0]!.slug).toBe("primer-post");
      expect(result.featuredPosts[0]!.coverImageUrl).toBe("/files/img-post-001");

      // Current verse
      expect(result.currentVerse).not.toBeNull();
      expect(result.currentVerse?.text).toContain("Todo lo puedo");
      expect(result.currentVerse?.reference).toBe("Filipenses 4:13");

      // Verify featuredPosts query filters by PUBLISHED at DB level
      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { post: { status: "PUBLISHED" } },
        }),
      );

      // Verify verse query filters by PUBLISHED and orders by date desc
      expect(mocks.verseFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PUBLISHED" },
          orderBy: { date: "desc" },
        }),
      );

      // Verify outing query uses the correct featuredOutingId
      expect(mocks.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "out-001" } }),
      );
    });

    it("returns null for featuredOuting when featuredOutingId is null", async () => {
      const { service } = await buildService({
        settingsReturn: { ...FULL_SETTINGS, featuredOutingId: null },
        featuredPostsReturns: [FEATURED_PUBLISHED],
        outingReturn: null,
        verseReturn: CURRENT_VERSE,
      });

      const result = await service.getPublicPayload();

      expect(result.featuredOuting).toBeNull();
      // Rest of payload intact
      expect(result.heroTitle).toBe("Misión 1-99");
      expect(result.featuredPosts).toHaveLength(1);
      expect(result.currentVerse).not.toBeNull();
    });

    it("filters out draft featured posts at DB level (only PUBLISHED posts appear)", async () => {
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        // Mock returns all posts; the DB-level filter in the mock
        // removes non-PUBLISHED ones based on the where clause
        featuredPostsReturns: [FEATURED_PUBLISHED, FEATURED_DRAFT],
        outingReturn: PUBLISHED_OUTING,
        verseReturn: CURRENT_VERSE,
      });

      const result = await service.getPublicPayload();

      // Only the published post should survive the filter
      expect(result.featuredPosts).toHaveLength(1);
      expect(result.featuredPosts[0]!.id).toBe("post-001");
    });

    it("returns outing as null when findUnique returns a DRAFT outing", async () => {
      // The service passes featuredOutingId to findUnique; the mock returns
      // the DRAFT outing. The service guards on status !== "PUBLISHED".
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        featuredPostsReturns: [FEATURED_PUBLISHED],
        outingReturn: DRAFT_OUTING, // status is DRAFT
        verseReturn: CURRENT_VERSE,
      });

      const result = await service.getPublicPayload();

      // Service should guard against non-PUBLISHED outings
      expect(result.featuredOuting).toBeNull();
    });

    it("returns featuredOuting null when findUnique returns an ARCHIVED outing", async () => {
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        featuredPostsReturns: [FEATURED_PUBLISHED],
        outingReturn: ARCHIVED_OUTING,
        verseReturn: CURRENT_VERSE,
      });

      const result = await service.getPublicPayload();

      expect(result.featuredOuting).toBeNull();
      // Rest of payload intact — DB-level non-PUBLISHED guard
      expect(result.heroTitle).toBe("Misión 1-99");
      expect(result.featuredPosts).toHaveLength(1);
      expect(result.currentVerse).not.toBeNull();
    });

    it("returns featuredOuting null when featuredOutingId points to non-existent outing", async () => {
      // featuredOutingId is set to an ID that doesn't match any outing.
      // The mock findUnique returns null for unknown IDs.
      const { service, mocks } = await buildService({
        settingsReturn: { ...FULL_SETTINGS, featuredOutingId: "out-nonexistent" },
        featuredPostsReturns: [FEATURED_PUBLISHED],
        outingReturn: null,
        verseReturn: CURRENT_VERSE,
      });

      const result = await service.getPublicPayload();

      expect(result.featuredOuting).toBeNull();
      // findUnique was called with the non-existent ID
      expect(mocks.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "out-nonexistent" } }),
      );
      // Rest of payload intact
      expect(result.heroTitle).toBe("Misión 1-99");
      expect(result.featuredPosts).toHaveLength(1);
      expect(result.currentVerse).not.toBeNull();
    });

    it("returns empty array for featuredPosts when none exist", async () => {
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        featuredPostsReturns: [],
        outingReturn: null,
        verseReturn: CURRENT_VERSE,
      });

      const result = await service.getPublicPayload();

      expect(result.featuredPosts).toEqual([]);
    });

    it("returns null for currentVerse when no published verse exists", async () => {
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        featuredPostsReturns: [],
        outingReturn: null,
        verseReturn: null,
      });

      const result = await service.getPublicPayload();

      expect(result.currentVerse).toBeNull();
    });

    it("returns null for currentVerse when verse is DRAFT (status filter)", async () => {
      // Mock has a DRAFT verse, findFirst filter removes it
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        featuredPostsReturns: [],
        outingReturn: null,
        verseReturn: DRAFT_VERSE,
      });

      const result = await service.getPublicPayload();

      expect(result.currentVerse).toBeNull();
    });

    it("never throws — returns null sections for completely missing data", async () => {
      const { service } = await buildService({
        settingsReturn: null,
        featuredPostsReturns: [],
        outingReturn: null,
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
      expect(result.featuredOuting).toBeNull();
      expect(result.featuredPosts).toEqual([]);
      expect(result.currentVerse).toBeNull();
    });

    it("returns null heroImageUrl when heroImageId is null", async () => {
      const { service } = await buildService({
        settingsReturn: { ...FULL_SETTINGS, heroImageId: null },
        featuredPostsReturns: [],
        outingReturn: null,
        verseReturn: null,
      });

      const result = await service.getPublicPayload();

      expect(result.heroImageUrl).toBeNull();
    });

    it("skips outing query when featuredOutingId is null", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: { ...FULL_SETTINGS, featuredOutingId: null },
        featuredPostsReturns: [],
        outingReturn: null,
        verseReturn: null,
      });

      await service.getPublicPayload();

      // findUnique should not be called when featuredOutingId is null
      // (the outing mock returns null for any id, but we assert it wasn't called)
      expect(mocks.findUnique).not.toHaveBeenCalled();
    });

    it("mainImageUrl is null when outing mainImageId is null", async () => {
      const outingWithoutImage: OutingRow = {
        ...PUBLISHED_OUTING,
        mainImageId: null,
      };
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        featuredPostsReturns: [],
        outingReturn: outingWithoutImage,
        verseReturn: null,
      });

      const result = await service.getPublicPayload();

      expect(result.featuredOuting).not.toBeNull();
      expect(result.featuredOuting?.mainImageUrl).toBeNull();
    });

    it("coverImageUrl is null when post coverImageId is null", async () => {
      const postWithoutCover: PostRow = {
        ...PUBLISHED_POST,
        coverImageId: null,
      };
      const fpWithoutCover: FeaturedPostRow = {
        ...FEATURED_PUBLISHED,
        post: postWithoutCover,
      };
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
        featuredPostsReturns: [fpWithoutCover],
        outingReturn: null,
        verseReturn: null,
      });

      const result = await service.getPublicPayload();

      expect(result.featuredPosts).toHaveLength(1);
      expect(result.featuredPosts[0]!.coverImageUrl).toBeNull();
    });
  });
});
