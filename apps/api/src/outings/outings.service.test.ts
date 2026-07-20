/**
 * OutingsService unit tests — Phase 2a (OUT-01, OUT-02, OUT-04).
 *
 * Covers CRUD operations, publish-readiness guard, and asset existence
 * validation. Phase 2b tests (findAllPublic, visitor hash, transactional
 * likes, featureOuting) are deferred to the next PR slice.
 *
 * Follows the pattern from landing.service.test.ts:
 * Test.createTestingModule with explicit provider overrides and per-test
 * fixture builders. Mocks respect Prisma query arguments so tests verify
 * that the service passes correct DB-level filters.
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { OutingsService } from "./outings.service.js";
import { normalizeIp, deriveVisitorHash } from "./outings.service.js";
import { DbService } from "../db/db.service.js";
import { ConfigService } from "@nestjs/config";
import { LandingService } from "../landing/landing.service.js";

// ---- minimal Prisma row types -----------------------------------------------

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

interface OutingLikeRow {
  id: string;
  outingId: string;
  visitorHash: string;
  fingerprintVersion: number;
  createdAt: Date;
}

// ---- test data --------------------------------------------------------------

const PUBLISHED_OUTING: OutingRow = {
  id: "out-001",
  slug: "camp-day",
  title: "Camp Day 2026",
  dateTime: new Date("2026-07-15T09:00:00.000Z"),
  location: "Parque Central",
  description: "Un día de camping en el parque.",
  status: "PUBLISHED",
  likesCount: 5,
  mainImageId: "img-001",
  croquisId: null,
  planId: null,
  createdById: null,
  publishedAt: new Date("2026-06-01"),
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-06-01"),
};

const DRAFT_OUTING: OutingRow = {
  id: "out-002",
  slug: "draft-outing",
  title: "Draft Outing",
  dateTime: new Date("2026-08-01T09:00:00.000Z"),
  location: "Centro",
  description: "Un draft.",
  status: "DRAFT",
  likesCount: 0,
  mainImageId: null,
  croquisId: null,
  planId: null,
  createdById: null,
  publishedAt: null,
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-06-01"),
};

const ARCHIVED_OUTING: OutingRow = {
  id: "out-003",
  slug: "archived-outing",
  title: "Archived Outing",
  dateTime: new Date("2026-05-01T09:00:00.000Z"),
  location: "Plaza",
  description: "Ya pasó.",
  status: "ARCHIVED",
  likesCount: 0,
  mainImageId: null,
  croquisId: null,
  planId: null,
  createdById: null,
  publishedAt: null,
  createdAt: new Date("2026-04-01"),
  updatedAt: new Date("2026-04-01"),
};

// ---- mock helpers ------------------------------------------------------------

interface MockDbOverrides {
  /** Array of outings the create mock initially knows about (for slug dup check). */
  existingOutings?: OutingRow[];
  /** Optional override for findUnique / findFirst results. */
  findUniqueReturn?: OutingRow | null;
  findFirstReturn?: OutingRow | null;
  /** FileAsset lookup results. */
  existingFiles?: FileAssetRow[];
  /** Existing likes for addLike dedupe (in-memory store). */
  existingLikes?: OutingLikeRow[];
  /** Simulate concurrent-like race: create throws P2002 even when findUnique returns null. */
  likeCreateThrowsP2002?: boolean;
}

/** Query shape for outing.findMany */
interface FindManyQuery {
  where?: {
    status?: string;
  };
  skip?: number;
  take?: number;
}

function makeDbValue(overrides: MockDbOverrides = {}) {
  const existingOutings = overrides.existingOutings ?? [];

  const create = vi
    .fn<(args: { data: Record<string, unknown> }) => Promise<OutingRow>>()
    .mockImplementation(async (args: { data: Record<string, unknown> }) => {
      const slug = args.data.slug as string;
      // Check for duplicate slug
      const dup = existingOutings.find((o) => o.slug === slug);
      if (dup) {
        const err = new Error(
          "Unique constraint failed on the fields: (slug)",
        ) as Error & { code?: string };
        err.code = "P2002";
        throw err;
      }
      const row: OutingRow = {
        id: `out-new-${String(existingOutings.length)}`,
        slug: slug,
        title: (args.data.title as string) || "",
        dateTime: (args.data.dateTime as Date) || new Date(),
        location: (args.data.location as string) || "",
        description: (args.data.description as string) || "",
        status: (args.data.status as OutingRow["status"]) || "DRAFT",
        likesCount: 0,
        mainImageId: (args.data.mainImageId as string) ?? null,
        croquisId: (args.data.croquisId as string) ?? null,
        planId: (args.data.planId as string) ?? null,
        createdById: (args.data.createdById as string) ?? null,
        publishedAt: args.data.status === "PUBLISHED" ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return row;
    });

  const findUnique = vi
    .fn<
      (args: { where: Record<string, unknown> }) => Promise<OutingRow | null>
    >()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const id = args.where?.id as string | undefined;
      const slugCond = args.where?.slug as string | undefined;
      if (
        id &&
        overrides.findUniqueReturn &&
        overrides.findUniqueReturn.id === id
      ) {
        return overrides.findUniqueReturn;
      }
      if (
        slugCond &&
        overrides.findUniqueReturn &&
        overrides.findUniqueReturn.slug === slugCond
      ) {
        return overrides.findUniqueReturn;
      }
      // Check against existing outings
      const found = existingOutings.find(
        (o) => (id && o.id === id) || (slugCond && o.slug === slugCond),
      );
      if (found) return found;
      return null;
    });

  const findFirst = vi
    .fn<
      (_args?: { where?: Record<string, unknown> }) => Promise<OutingRow | null>
    >()
    .mockImplementation(async (_args?: { where?: Record<string, unknown> }) => {
      if (overrides.findFirstReturn) return overrides.findFirstReturn;
      return null;
    });

  const findMany = vi
    .fn<(args?: FindManyQuery) => Promise<OutingRow[]>>()
    .mockImplementation(async (args?: FindManyQuery) => {
      let results = existingOutings;
      if (args?.where?.status) {
        results = results.filter((o) => o.status === args.where!.status);
      }
      const skip = args?.skip ?? 0;
      const take = args?.take ?? results.length;
      return results.slice(skip, skip + take);
    });

  const update = vi
    .fn<
      (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => Promise<OutingRow>
    >()
    .mockImplementation(
      async (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const id = args.where.id as string;
        const existing = existingOutings.find((o) => o.id === id);
        if (!existing) {
          const err = new Error("Record not found") as Error & {
            code?: string;
          };
          err.code = "P2025";
          throw err;
        }
        // Handle Prisma atomic update operators (increment)
        const resolved: Partial<OutingRow> = {};
        for (const [key, value] of Object.entries(args.data)) {
          if (value && typeof value === "object" && "increment" in value) {
            const current = (existing as unknown as Record<string, unknown>)[
              key
            ];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (resolved as any)[key] =
              Number(current) +
              Number((value as { increment: number }).increment);
          } else {
            (resolved as Record<string, unknown>)[key] = value;
          }
        }
        const merged: OutingRow = {
          ...existing,
          ...resolved,
          updatedAt: new Date(),
        };
        // Update the in-memory array so subsequent reads see the changes
        const idx = existingOutings.indexOf(existing);
        if (idx !== -1) {
          existingOutings[idx] = merged;
        }
        // Also update findUniqueReturn if it matches (prevents stale overrides)
        if (
          overrides.findUniqueReturn &&
          overrides.findUniqueReturn.id === id
        ) {
          overrides.findUniqueReturn = merged;
        }
        return merged;
      },
    );

  const findUniqueFile = vi
    .fn<
      (args: { where: Record<string, unknown> }) => Promise<FileAssetRow | null>
    >()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const id = args.where?.id as string | undefined;
      const files = overrides.existingFiles ?? [];
      if (id && files.some((f) => f.id === id)) return { id };
      return null;
    });

  // -- OutingLike mocks (Phase 2b: addLike) --

  const existingLikes: OutingLikeRow[] = [...(overrides.existingLikes ?? [])];

  const outingLikeUpsert = vi
    .fn<
      (args: {
        where: {
          outingId_visitorHash: { outingId: string; visitorHash: string };
        };
        create: {
          outingId: string;
          visitorHash: string;
          fingerprintVersion: number;
        };
        update: Record<string, unknown>;
      }) => Promise<OutingLikeRow>
    >()
    .mockImplementation(async (args) => {
      const { outingId, visitorHash } = args.where.outingId_visitorHash;
      const existing = existingLikes.find(
        (l) => l.outingId === outingId && l.visitorHash === visitorHash,
      );
      if (existing) {
        // Already exists — return existing (no mutation, upsert with empty update)
        return existing;
      }
      const created: OutingLikeRow = {
        id: `like-${String(existingLikes.length)}`,
        outingId,
        visitorHash,
        fingerprintVersion: args.create.fingerprintVersion ?? 1,
        createdAt: new Date(),
      };
      existingLikes.push(created);
      return created;
    });

  const outingLikeFindUnique = vi
    .fn<
      (args: {
        where: {
          outingId_visitorHash: { outingId: string; visitorHash: string };
        };
      }) => Promise<OutingLikeRow | null>
    >()
    .mockImplementation(async (args) => {
      const { outingId, visitorHash } = args.where.outingId_visitorHash;
      const found = existingLikes.find(
        (l) => l.outingId === outingId && l.visitorHash === visitorHash,
      );
      return found ?? null;
    });

  const outingLikeCreate = vi
    .fn<
      (args: {
        data: {
          outingId: string;
          visitorHash: string;
          fingerprintVersion: number;
        };
      }) => Promise<OutingLikeRow>
    >()
    .mockImplementation(async (args) => {
      const { outingId: oid, visitorHash: vh } = args.data;

      // Simulate a concurrent-like race: findUnique said "none" but create hits the unique constraint
      if (overrides.likeCreateThrowsP2002) {
        const err = new Error(
          "Unique constraint failed on the fields: (outingId_visitorHash)",
        ) as Error & { code?: string };
        err.code = "P2002";
        throw err;
      }

      // Realistic duplicate check — matches Prisma's @@unique behavior
      const dup = existingLikes.find(
        (l) => l.outingId === oid && l.visitorHash === vh,
      );
      if (dup) {
        const err = new Error(
          "Unique constraint failed on the fields: (outingId_visitorHash)",
        ) as Error & { code?: string };
        err.code = "P2002";
        throw err;
      }

      const created: OutingLikeRow = {
        id: `like-${String(existingLikes.length)}`,
        outingId: oid,
        visitorHash: vh,
        fingerprintVersion: args.data.fingerprintVersion ?? 1,
        createdAt: new Date(),
      };
      existingLikes.push(created);
      return created;
    });

  const outingLikeFindFirst = vi
    .fn<
      (args?: {
        where?: Record<string, unknown>;
      }) => Promise<OutingLikeRow | null>
    >()
    .mockImplementation(async (_args) => null);

  // $transaction — passes the mock client as the tx callback argument
  const $transaction = vi
    .fn()
    .mockImplementation(async <T>(cb: (tx: unknown) => Promise<T>) =>
      cb(client),
    );

  const client = {
    outing: {
      create,
      findUnique,
      findFirst,
      findMany,
      update,
    },
    outings: { findMany, findUnique, findFirst, create, update },
    fileAsset: {
      findUnique: findUniqueFile,
    },
    outingLike: {
      upsert: outingLikeUpsert,
      findUnique: outingLikeFindUnique,
      findFirst: outingLikeFindFirst,
      create: outingLikeCreate,
    },
    $transaction,
  };

  return {
    client,
    create,
    findUnique,
    findFirst,
    findMany,
    update,
    findUniqueFile,
    outingLikeUpsert,
    outingLikeFindUnique,
    outingLikeCreate,
    $transaction,
  };
}

interface ServiceFixture {
  service: OutingsService;
  mocks: ReturnType<typeof makeDbValue>;
  landingServiceMock: { persistFeaturedOutingId: ReturnType<typeof vi.fn> };
}

async function buildService(
  dbOverrides: MockDbOverrides = {},
): Promise<ServiceFixture> {
  const dbValue = makeDbValue(dbOverrides);

  const landingServiceMock = {
    persistFeaturedOutingId: vi.fn().mockResolvedValue(undefined),
  };

  const module = await Test.createTestingModule({
    providers: [
      OutingsService,
      { provide: DbService, useValue: dbValue },
      {
        provide: ConfigService,
        useValue: {
          get: vi.fn((key: string) =>
            key === "VISITOR_HASH_SECRET"
              ? "test-visitor-hash-secret"
              : undefined,
          ),
        },
      },
      { provide: LandingService, useValue: landingServiceMock },
    ],
  }).compile();

  return {
    service: module.get(OutingsService),
    mocks: dbValue,
    landingServiceMock,
  };
}

// ---- tests ------------------------------------------------------------------

describe("OutingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- 2.1: CRUD (create, update, archive, findAll, findBySlug) ---------------

  describe("create (2.1)", () => {
    it("creates an outing with status DRAFT by default", async () => {
      const { service, mocks } = await buildService();

      const result = await service.create({
        title: "Nueva Salida",
        slug: "nueva-salida",
        dateTime: "2026-07-15T09:00:00.000Z",
        location: "Parque Central",
        description: "Descripción de la salida.",
      });

      expect(mocks.create).toHaveBeenCalledTimes(1);
      const createArgs = mocks.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(createArgs.data.title).toBe("Nueva Salida");
      expect(createArgs.data.slug).toBe("nueva-salida");
      expect(createArgs.data.status).toBe("DRAFT"); // default
      expect(result.status).toBe("DRAFT");
      expect(result.likesCount).toBe(0);
    });

    it("creates an outing with explicit PUBLISHED status", async () => {
      const { service } = await buildService();

      const result = await service.create({
        title: "Publicada",
        slug: "publicada",
        dateTime: "2026-07-15T09:00:00.000Z",
        location: "Plaza",
        description: "Desc",
        status: "PUBLISHED",
      });

      expect(result.status).toBe("PUBLISHED");
    });

    it("rejects duplicate slug (OUT-03)", async () => {
      const { service } = await buildService({
        existingOutings: [PUBLISHED_OUTING],
      });

      await expect(
        service.create({
          title: "Clone",
          slug: "camp-day", // same slug as published
          dateTime: "2026-07-15T09:00:00.000Z",
          location: "Plaza",
          description: "Desc",
        }),
      ).rejects.toThrow();
    });
  });

  describe("update (2.1)", () => {
    it("partially updates an outing", async () => {
      const { service, mocks } = await buildService({
        existingOutings: [DRAFT_OUTING],
        findUniqueReturn: DRAFT_OUTING,
      });

      const result = await service.update("out-002", {
        title: "Updated Draft",
      });

      expect(mocks.update).toHaveBeenCalledTimes(1);
      const updateArgs = mocks.update.mock.calls[0]![0] as {
        where: { id: string };
        data: Record<string, unknown>;
      };
      expect(updateArgs.where.id).toBe("out-002");
      expect(updateArgs.data.title).toBe("Updated Draft");
      // slug should not be in data if not provided
      expect(updateArgs.data).not.toHaveProperty("slug");
      expect(result.title).toBe("Updated Draft");
    });

    it("updates all provided fields", async () => {
      const { service, mocks } = await buildService({
        existingOutings: [DRAFT_OUTING],
        findUniqueReturn: DRAFT_OUTING,
      });

      await service.update("out-002", {
        title: "New Title",
        location: "New Location",
        description: "New Desc",
      });

      const updateArgs = mocks.update.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(updateArgs.data.title).toBe("New Title");
      expect(updateArgs.data.location).toBe("New Location");
      expect(updateArgs.data.description).toBe("New Desc");
    });

    it("throws on non-existent outing", async () => {
      const { service } = await buildService({ existingOutings: [] });

      await expect(
        service.update("nonexistent", { title: "X" }),
      ).rejects.toThrow();
    });
  });

  describe("archive (2.1)", () => {
    it("sets status to ARCHIVED", async () => {
      const { service, mocks } = await buildService({
        existingOutings: [PUBLISHED_OUTING],
        findUniqueReturn: { ...PUBLISHED_OUTING },
      });

      await service.archive("out-001");

      expect(mocks.update).toHaveBeenCalledTimes(1);
      const updateArgs = mocks.update.mock.calls[0]![0] as {
        where: { id: string };
        data: { status: string };
      };
      expect(updateArgs.where.id).toBe("out-001");
      expect(updateArgs.data.status).toBe("ARCHIVED");
    });
  });

  describe("findAll (2.1)", () => {
    it("returns all outings with no status filter", async () => {
      const { service } = await buildService({
        existingOutings: [PUBLISHED_OUTING, DRAFT_OUTING, ARCHIVED_OUTING],
      });

      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it("filters by status when provided", async () => {
      const { service, mocks } = await buildService({
        existingOutings: [PUBLISHED_OUTING, DRAFT_OUTING],
      });

      await service.findAll({ status: "DRAFT" });

      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "DRAFT" },
        }),
      );
    });

    it("applies pagination (skip/take)", async () => {
      const { service, mocks } = await buildService({
        existingOutings: [PUBLISHED_OUTING, DRAFT_OUTING, ARCHIVED_OUTING],
      });

      await service.findAll({ skip: 1, take: 2 });

      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 2,
        }),
      );
    });
  });

  describe("findBySlug (2.1)", () => {
    it("returns outing by slug", async () => {
      const { service, mocks } = await buildService({
        existingOutings: [PUBLISHED_OUTING],
        findUniqueReturn: PUBLISHED_OUTING,
      });

      const result = await service.findBySlug("camp-day");

      expect(mocks.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: "camp-day" },
        }),
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe("out-001");
      expect(result?.slug).toBe("camp-day");
      expect(result?.status).toBe("PUBLISHED");
    });

    it("returns null when slug not found", async () => {
      const { service } = await buildService({ existingOutings: [] });

      const result = await service.findBySlug("nonexistent");
      expect(result).toBeNull();
    });
  });

  // -- 2.2: Publish-readiness guard -------------------------------------------

  describe("publish-readiness guard (2.2)", () => {
    it("rejects PUBLISHED when title is empty", async () => {
      const { service } = await buildService();

      await expect(
        service.create({
          title: "",
          slug: "bad-pub",
          dateTime: "2026-07-15T09:00:00.000Z",
          location: "Plaza",
          description: "Desc",
          status: "PUBLISHED",
        }),
      ).rejects.toThrow(/PUBLISHED/);
    });

    it("rejects PUBLISHED when slug is empty", async () => {
      const { service } = await buildService();

      await expect(
        service.create({
          title: "Good Title",
          slug: "",
          dateTime: "2026-07-15T09:00:00.000Z",
          location: "Plaza",
          description: "Desc",
          status: "PUBLISHED",
        }),
      ).rejects.toThrow(/PUBLISHED/);
    });

    it("rejects PUBLISHED when dateTime is empty", async () => {
      const { service } = await buildService();

      await expect(
        service.create({
          title: "Good",
          slug: "good-slug",
          dateTime: "",
          location: "Plaza",
          description: "Desc",
          status: "PUBLISHED",
        }),
      ).rejects.toThrow(/PUBLISHED/);
    });

    it("rejects PUBLISHED when location is empty", async () => {
      const { service } = await buildService();

      await expect(
        service.create({
          title: "Good",
          slug: "good-slug",
          dateTime: "2026-07-15T09:00:00.000Z",
          location: "",
          description: "Desc",
          status: "PUBLISHED",
        }),
      ).rejects.toThrow(/PUBLISHED/);
    });

    it("rejects PUBLISHED when description is empty", async () => {
      const { service } = await buildService();

      await expect(
        service.create({
          title: "Good",
          slug: "good-slug",
          dateTime: "2026-07-15T09:00:00.000Z",
          location: "Plaza",
          description: "",
          status: "PUBLISHED",
        }),
      ).rejects.toThrow(/PUBLISHED/);
    });

    it("rejects PUBLISHED on update when clearing public fields", async () => {
      // Update that sets a public field to empty while status is PUBLISHED
      const { service } = await buildService({
        existingOutings: [PUBLISHED_OUTING],
        findUniqueReturn: PUBLISHED_OUTING,
      });

      await expect(
        service.update("out-001", { title: "", status: "PUBLISHED" }),
      ).rejects.toThrow(/PUBLISHED/);
    });

    it("allows DRAFT with empty fields", async () => {
      const { service } = await buildService();

      // DRAFT should be allowed even with empty fields
      const result = await service.create({
        title: "",
        slug: "draft-empty",
        dateTime: "",
        location: "",
        description: "",
      });

      expect(result.status).toBe("DRAFT");
    });

    it("allows DRAFT to PUBLISHED transition when all fields present", async () => {
      const { service } = await buildService({
        existingOutings: [DRAFT_OUTING],
        findUniqueReturn: DRAFT_OUTING,
      });

      const result = await service.update("out-002", { status: "PUBLISHED" });
      // DRAFT_OUTING has all fields, so transition to PUBLISHED is allowed
      expect(result.status).toBe("PUBLISHED");
    });
  });

  // -- Asset existence validation (OUT-04, deferred from Phase 1) -------------

  describe("asset existence validation (OUT-04)", () => {
    it("rejects create with non-existent mainImageId", async () => {
      const { service } = await buildService({
        existingFiles: [], // no files exist
      });

      await expect(
        service.create({
          title: "With Image",
          slug: "with-image",
          dateTime: "2026-07-15T09:00:00.000Z",
          location: "Plaza",
          description: "Desc",
          mainImageId: "nonexistent-file",
        }),
      ).rejects.toThrow();
    });

    it("accepts create with valid mainImageId", async () => {
      const { service } = await buildService({
        existingFiles: [{ id: "img-valid" }],
      });

      const result = await service.create({
        title: "With Image",
        slug: "with-image-valid",
        dateTime: "2026-07-15T09:00:00.000Z",
        location: "Plaza",
        description: "Desc",
        mainImageId: "img-valid",
      });

      expect(result.mainImageId).toBe("img-valid");
    });

    it("rejects create with non-existent croquisId", async () => {
      const { service } = await buildService({
        existingFiles: [{ id: "img-valid" }],
      });

      await expect(
        service.create({
          title: "With Croquis",
          slug: "with-croquis",
          dateTime: "2026-07-15T09:00:00.000Z",
          location: "Plaza",
          description: "Desc",
          croquisId: "nonexistent-croquis",
        }),
      ).rejects.toThrow();
    });

    it("accepts null/undefined for optional asset IDs", async () => {
      const { service } = await buildService();

      // No asset IDs — should be fine
      const result = await service.create({
        title: "No Assets",
        slug: "no-assets",
        dateTime: "2026-07-15T09:00:00.000Z",
        location: "Plaza",
        description: "Desc",
      });

      expect(result.slug).toBe("no-assets");
      expect(result.status).toBe("DRAFT");
      expect(result.mainImageId).toBeNull();
      expect(result.croquisId).toBeNull();
      expect(result.planId).toBeNull();
    });
  });

  // -- Phase 2b: findAllPublic (2.4) ------------------------------------------

  describe("findAllPublic (2.4)", () => {
    it("returns only PUBLISHED outings mapped to OutingResponse", async () => {
      const { service } = await buildService({
        existingOutings: [PUBLISHED_OUTING, DRAFT_OUTING, ARCHIVED_OUTING],
      });

      const result = await service.findAllPublic();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("out-001");
      expect(result[0]!.slug).toBe("camp-day");
      expect(result[0]!.status).toBe("PUBLISHED");
      // OutingResponse shape: no DB-internal fields
      expect(result[0]!).not.toHaveProperty("createdById");
      expect(result[0]!).not.toHaveProperty("publishedAt");
      expect(result[0]!).not.toHaveProperty("createdAt");
      expect(result[0]!).not.toHaveProperty("updatedAt");
      // Asset IDs become URL paths
      expect(result[0]!.mainImageUrl).toBe("/files/img-001");
      expect(result[0]!.croquisUrl).toBeNull();
      expect(result[0]!.planUrl).toBeNull();
    });

    it("returns empty array when no PUBLISHED outings exist", async () => {
      const { service } = await buildService({
        existingOutings: [DRAFT_OUTING, ARCHIVED_OUTING],
      });

      const result = await service.findAllPublic();

      expect(result).toHaveLength(0);
    });

    it("includes likesCount and dateTime in response", async () => {
      const { service } = await buildService({
        existingOutings: [PUBLISHED_OUTING],
      });

      const result = await service.findAllPublic();

      expect(result[0]!.likesCount).toBe(5);
      expect(result[0]!.dateTime).toBe("2026-07-15T09:00:00.000Z");
    });
  });

  // -- Phase 2b: addLike — transactional dedupe (2.5, 2.6) -------------------

  describe("addLike (2.6)", () => {
    const IP = "192.168.1.100";
    const UA = "TestAgent/1.0";

    it("increments likesCount on first like", async () => {
      const { service, mocks } = await buildService({
        existingOutings: [{ ...PUBLISHED_OUTING, likesCount: 5 }],
        findUniqueReturn: { ...PUBLISHED_OUTING, likesCount: 5 },
      });

      // findUnique for outing + findUnique for like = not found + update
      const result = await service.addLike("out-001", IP, UA);

      expect(result.likesCount).toBe(6);
      const updateCalls = mocks.update.mock.calls;
      const lastCall = updateCalls[updateCalls.length - 1]![0] as unknown as {
        data: { likesCount: { increment: number } };
      };
      expect(lastCall.data.likesCount.increment).toBe(1);
    });

    it("is idempotent: same visitor hash does not increment twice", async () => {
      // Pre-create a like for the same outing+hash combo
      // The hash derivation is deterministic, so same IP+UA produces same hash
      const { service } = await buildService({
        existingOutings: [{ ...PUBLISHED_OUTING, likesCount: 5 }],
        findUniqueReturn: { ...PUBLISHED_OUTING, likesCount: 5 },
      });

      // First like
      await service.addLike("out-001", IP, UA);

      // Reset the findUnique return so the outing is found correctly for second call
      // Second like with same IP/UA
      const result = await service.addLike("out-001", IP, UA);

      // likesCount should still be 6 (only incremented once)
      expect(result.likesCount).toBe(6);
    });

    it("different IP produces different hash (separate like)", async () => {
      const { service } = await buildService({
        existingOutings: [{ ...PUBLISHED_OUTING, likesCount: 5 }],
        findUniqueReturn: { ...PUBLISHED_OUTING, likesCount: 5 },
      });

      // First like from IP 1
      await service.addLike("out-001", "192.168.1.100", UA);

      // Reset outing mock for second call
      // Second like from different IP
      const result = await service.addLike("out-001", "192.168.1.200", UA);

      // Different hash → separate like → count = 7
      expect(result.likesCount).toBe(7);
    });

    it("does not increment when unique constraint is violated (concurrent race)", async () => {
      // Simulate two concurrent requests: findUnique returns null for both,
      // but create throws P2002 (the @@unique constraint already committed).
      const { service } = await buildService({
        existingOutings: [{ ...PUBLISHED_OUTING, likesCount: 5 }],
        findUniqueReturn: { ...PUBLISHED_OUTING, likesCount: 5 },
        existingLikes: [],
        likeCreateThrowsP2002: true,
      });

      const result = await service.addLike("out-001", IP, UA);

      // P2002 caught → no increment → count stays at 5
      expect(result.likesCount).toBe(5);
    });

    it("rejects non-PUBLISHED outing", async () => {
      const { service } = await buildService({
        existingOutings: [DRAFT_OUTING],
        findUniqueReturn: DRAFT_OUTING,
      });

      await expect(service.addLike("out-002", IP, UA)).rejects.toThrow(
        /PUBLISHED/,
      );
    });

    it("rejects non-existent outing", async () => {
      const { service } = await buildService({
        existingOutings: [],
      });

      await expect(service.addLike("nonexistent", IP, UA)).rejects.toThrow();
    });
  });

  // -- Phase 2b: hash derivation pure functions (2.5) ------------------------

  describe("hash derivation (2.5)", () => {
    const SECRET = "test-secret";
    const VERSION = "1";
    const IP = "192.168.1.100";
    const UA = "TestAgent/1.0";

    describe("normalizeIp", () => {
      it("returns IPv4 addresses unchanged", () => {
        expect(normalizeIp("192.168.1.100")).toBe("192.168.1.100");
        expect(normalizeIp("10.0.0.1")).toBe("10.0.0.1");
      });

      it("strips IPv4-mapped IPv6 prefix", () => {
        expect(normalizeIp("::ffff:192.168.1.100")).toBe("192.168.1.100");
        expect(normalizeIp("::ffff:10.0.0.1")).toBe("10.0.0.1");
        expect(normalizeIp("::FFFF:172.16.0.1")).toBe("172.16.0.1");
      });

      it("returns non-mapped IPv6 addresses unchanged", () => {
        expect(normalizeIp("2001:db8::1")).toBe("2001:db8::1");
        expect(normalizeIp("fe80::1")).toBe("fe80::1");
      });
    });

    describe("deriveVisitorHash", () => {
      it("produces a deterministic hex hash", () => {
        const hash1 = deriveVisitorHash(SECRET, VERSION, IP, UA);
        const hash2 = deriveVisitorHash(SECRET, VERSION, IP, UA);

        // Same inputs → same hash
        expect(hash1).toBe(hash2);
        // Should be a 64-char hex string (SHA-256)
        expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      });

      it("different inputs produce different hashes", () => {
        const hash1 = deriveVisitorHash(SECRET, VERSION, "192.168.1.100", UA);
        const hash2 = deriveVisitorHash(SECRET, VERSION, "192.168.1.200", UA);
        const hash3 = deriveVisitorHash(SECRET, VERSION, IP, "OtherAgent/2.0");
        const hash4 = deriveVisitorHash("other-secret", VERSION, IP, UA);

        expect(hash1).not.toBe(hash2); // different IP
        expect(hash1).not.toBe(hash3); // different UA
        expect(hash1).not.toBe(hash4); // different secret
      });

      it("version affects the hash", () => {
        const hashV1 = deriveVisitorHash(SECRET, "1", IP, UA);
        const hashV2 = deriveVisitorHash(SECRET, "2", IP, UA);

        expect(hashV1).not.toBe(hashV2);
      });
    });
  });

  // -- Phase 2b: featureOuting delegation (2.7) -------------------------------

  describe("featureOuting (2.7)", () => {
    it("delegates to LandingService for PUBLISHED outing", async () => {
      const { service, landingServiceMock } = await buildService({
        existingOutings: [PUBLISHED_OUTING],
        findUniqueReturn: PUBLISHED_OUTING,
      });

      await service.featureOuting("out-001");

      expect(await service.featureOuting("out-001")).toEqual({
        featuredOutingId: "out-001",
      });
      expect(landingServiceMock.persistFeaturedOutingId).toHaveBeenCalledWith(
        "out-001",
      );
    });

    it("rejects DRAFT outing", async () => {
      const { service, landingServiceMock } = await buildService({
        existingOutings: [DRAFT_OUTING],
        findUniqueReturn: DRAFT_OUTING,
      });

      await expect(service.featureOuting("out-002")).rejects.toThrow(
        /PUBLISHED/,
      );

      expect(landingServiceMock.persistFeaturedOutingId).not.toHaveBeenCalled();
    });

    it("rejects ARCHIVED outing", async () => {
      const { service, landingServiceMock } = await buildService({
        existingOutings: [ARCHIVED_OUTING],
        findUniqueReturn: ARCHIVED_OUTING,
      });

      await expect(service.featureOuting("out-003")).rejects.toThrow(
        /PUBLISHED/,
      );

      expect(landingServiceMock.persistFeaturedOutingId).not.toHaveBeenCalled();
    });

    it("rejects non-existent outing", async () => {
      const { service, landingServiceMock } = await buildService({
        existingOutings: [],
      });

      await expect(service.featureOuting("nonexistent")).rejects.toThrow();

      expect(landingServiceMock.persistFeaturedOutingId).not.toHaveBeenCalled();
    });

    it("clears the featured pointer idempotently", async () => {
      const { service, landingServiceMock } = await buildService();

      await expect(service.clearFeaturedOuting()).resolves.toEqual({
        featuredOutingId: null,
      });
      await expect(service.clearFeaturedOuting()).resolves.toEqual({
        featuredOutingId: null,
      });

      expect(landingServiceMock.persistFeaturedOutingId).toHaveBeenCalledTimes(
        2,
      );
      expect(
        landingServiceMock.persistFeaturedOutingId,
      ).toHaveBeenLastCalledWith(null);
    });
  });
});
