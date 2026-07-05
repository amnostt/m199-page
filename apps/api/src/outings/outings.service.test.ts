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
import { DbService } from "../db/db.service.js";

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
        const err = new Error("Unique constraint failed on the fields: (slug)") as Error & { code?: string };
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
    .fn<(args: { where: Record<string, unknown> }) => Promise<OutingRow | null>>()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const id = args.where?.id as string | undefined;
      const slugCond = args.where?.slug as string | undefined;
      if (id && overrides.findUniqueReturn && overrides.findUniqueReturn.id === id) {
        return overrides.findUniqueReturn;
      }
      if (slugCond && overrides.findUniqueReturn && overrides.findUniqueReturn.slug === slugCond) {
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
    .fn<(_args?: { where?: Record<string, unknown> }) => Promise<OutingRow | null>>()
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
    .fn<(args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<OutingRow>>()
    .mockImplementation(async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const id = args.where.id as string;
      const existing = existingOutings.find((o) => o.id === id);
      if (!existing) {
        const err = new Error("Record not found") as Error & { code?: string };
        err.code = "P2025";
        throw err;
      }
      const merged: OutingRow = {
        ...existing,
        ...(args.data as Partial<OutingRow>),
        updatedAt: new Date(),
      };
      return merged;
    });

  const findUniqueFile = vi
    .fn<(args: { where: Record<string, unknown> }) => Promise<FileAssetRow | null>>()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const id = args.where?.id as string | undefined;
      const files = overrides.existingFiles ?? [];
      if (id && files.some((f) => f.id === id)) return { id };
      return null;
    });

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
  };

  return {
    client,
    create,
    findUnique,
    findFirst,
    findMany,
    update,
    findUniqueFile,
  };
}

interface ServiceFixture {
  service: OutingsService;
  mocks: ReturnType<typeof makeDbValue>;
}

async function buildService(
  dbOverrides: MockDbOverrides = {},
): Promise<ServiceFixture> {
  const dbValue = makeDbValue(dbOverrides);

  const module = await Test.createTestingModule({
    providers: [
      OutingsService,
      { provide: DbService, useValue: dbValue },
    ],
  }).compile();

  return {
    service: module.get(OutingsService),
    mocks: dbValue,
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
      const createArgs = mocks.create.mock.calls[0]![0] as { data: Record<string, unknown> };
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

      await expect(service.update("nonexistent", { title: "X" })).rejects.toThrow();
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
});
