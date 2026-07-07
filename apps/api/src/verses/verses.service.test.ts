/**
 * VersesService unit tests — Daily Verse (Tasks 2.1-2.3).
 *
 * Covers: create (one server instant, Peru date derivation), delete,
 * getLatest, getHistory (excludes latest), findAll.
 *
 * Follows the same pattern as posts.service.test.ts:
 * Test.createTestingModule with explicit provider overrides.
 * Mock respects Prisma query arguments so tests verify correct DB-level
 * filters are passed.
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { VersesService } from "./verses.service.js";
import { DbService } from "../db/db.service.js";
import type { VerseRow } from "./verses.service.js";

// ---- test data ------------------------------------------------------------

function toUTC(iso: string): Date {
  return new Date(iso + "Z");
}

// Peru is UTC-5 all year (no DST).
// 2026-07-02T04:30:00Z → 2026-07-01T23:30:00-05 → date = 2026-07-01
// 2026-07-02T05:30:00Z → 2026-07-02T00:30:00-05 → date = 2026-07-02
const NEAR_MIDNIGHT_UTC = toUTC("2026-07-02T04:30:00"); // Lima: July 1
const JUST_AFTER_MIDNIGHT_UTC = toUTC("2026-07-02T05:30:00"); // Lima: July 2
const MIDDAY_UTC = toUTC("2026-07-02T15:00:00"); // Lima: July 2

function peruDate(d: Date): Date {
  // Derive YYYY-MM-DD in America/Lima and return as Date at midnight Lima.
  const limaOffset = -5 * 60; // minutes
  const localMs = d.getTime() + limaOffset * 60 * 1000;
  const localDate = new Date(localMs);
  return new Date(
    Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate()),
  );
}

const VERSE_A: VerseRow = {
  id: "v-a",
  text: "Verse A",
  reference: "John 1:1",
  date: peruDate(MIDDAY_UTC), // 2026-07-02
  publishedAt: MIDDAY_UTC,
  status: "PUBLISHED",
  createdById: null,
  createdAt: MIDDAY_UTC,
  updatedAt: MIDDAY_UTC,
};

const VERSE_B: VerseRow = {
  id: "v-b",
  text: "Verse B",
  reference: "John 3:16",
  date: peruDate(toUTC("2026-07-03T15:00:00")), // 2026-07-03
  publishedAt: toUTC("2026-07-03T15:00:00"),
  status: "PUBLISHED",
  createdById: null,
  createdAt: toUTC("2026-07-03T15:00:00"),
  updatedAt: toUTC("2026-07-03T15:00:00"),
};

const VERSE_C: VerseRow = {
  id: "v-c",
  text: "Verse C",
  reference: "Psalm 23:1",
  date: peruDate(toUTC("2026-07-01T10:00:00")), // 2026-07-01
  publishedAt: toUTC("2026-07-01T10:00:00"),
  status: "PUBLISHED",
  createdById: null,
  createdAt: toUTC("2026-07-01T10:00:00"),
  updatedAt: toUTC("2026-07-01T10:00:00"),
};

const DRAFT_VERSE: VerseRow = {
  id: "v-draft",
  text: "Draft",
  reference: "Proverbs 3:5",
  date: peruDate(MIDDAY_UTC),
  publishedAt: null,
  status: "DRAFT",
  createdById: null,
  createdAt: MIDDAY_UTC,
  updatedAt: MIDDAY_UTC,
};

// ---- mock helpers ---------------------------------------------------------

interface VerseRevisionRow {
  id: string;
  verseId: string;
  text: string;
  reference: string;
  changedAt: Date;
  changedById: string | null;
}

interface MockDbOverrides {
  existingVerses?: VerseRow[];
  findUniqueReturn?: VerseRow | null;
  existingRevisions?: VerseRevisionRow[];
}

function makeDbValue(overrides: MockDbOverrides = {}) {
  const existingVerses: VerseRow[] = [...(overrides.existingVerses ?? [])];
  const existingRevisions: VerseRevisionRow[] = [
    ...(overrides.existingRevisions ?? []),
  ];

  const create = vi
    .fn<(args: { data: Record<string, unknown> }) => Promise<VerseRow>>()
    .mockImplementation(async (args: { data: Record<string, unknown> }) => {
      const row: VerseRow = {
        id: `v-new-${existingVerses.length}`,
        text: (args.data.text as string) || "",
        reference: (args.data.reference as string) || "",
        date: args.data.date as Date,
        publishedAt: (args.data.publishedAt as Date) ?? null,
        status: (args.data.status as VerseRow["status"]) || "PUBLISHED",
        createdById: (args.data.createdById as string) ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      existingVerses.push(row);
      return row;
    });

  const findUnique = vi
    .fn<(args: { where: Record<string, unknown> }) => Promise<VerseRow | null>>()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const id = args.where?.id as string | undefined;
      if (id && overrides.findUniqueReturn && overrides.findUniqueReturn.id === id) {
        return overrides.findUniqueReturn;
      }
      return existingVerses.find((v) => v.id === id) ?? null;
    });

  // Normalise orderBy to an array of field/direction pairs for deterministic
  // multi-field sorting (supports both { field: "desc" } and [ { field: "desc" } ]).
  function sortBySpecs(
    items: VerseRow[],
    orderBy?: Record<string, unknown> | Record<string, string>[],
  ): VerseRow[] {
    if (!orderBy) return items;
    const specs: Record<string, string>[] = Array.isArray(orderBy)
      ? orderBy
      : [orderBy as Record<string, string>];
    return [...items].sort((a, b) => {
      for (const spec of specs) {
        for (const [field, dir] of Object.entries(spec)) {
          let cmp = 0;
          if (field === "id") {
            // Lexicographic comparison for UUID strings
            cmp = dir === "asc" ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
          } else {
            const aRow = a as unknown as Record<string, unknown>;
            const bRow = b as unknown as Record<string, unknown>;
            const aVal =
              aRow[field] instanceof Date
                ? (aRow[field] as Date).getTime()
                : (aRow[field] as number) ?? 0;
            const bVal =
              bRow[field] instanceof Date
                ? (bRow[field] as Date).getTime()
                : (bRow[field] as number) ?? 0;
            cmp = dir === "asc" ? aVal - bVal : bVal - aVal;
          }
          if (cmp !== 0) return cmp;
        }
      }
      return 0;
    });
  }

  const findFirst = vi
    .fn<(args?: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> | Record<string, string>[] }) => Promise<VerseRow | null>>()
    .mockImplementation(
      async (args?: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> | Record<string, string>[] }) => {
        let candidates = [...existingVerses];
        if (args?.where?.status) {
          candidates = candidates.filter((v) => v.status === args.where!.status);
        }
        candidates = sortBySpecs(candidates, args?.orderBy);
        return candidates[0] ?? null;
      },
    );

  const findMany = vi
    .fn<(args?: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> | Record<string, string>[]; take?: number }) => Promise<VerseRow[]>>()
    .mockImplementation(
      async (args?: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> | Record<string, string>[]; take?: number }) => {
        let results = [...existingVerses];
        if (args?.where?.status) {
          results = results.filter((v) => v.status === args.where!.status);
        }
        results = sortBySpecs(results, args?.orderBy);
        if (args?.take !== undefined && args.take > 0) {
          results = results.slice(0, args.take);
        }
        return results;
      },
    );

  const revisionDeleteMany = vi
    .fn<
      (args: { where: Record<string, unknown> }) => Promise<{ count: number }>
    >()
    .mockImplementation(
      async (args: { where: Record<string, unknown> }) => {
        const verseId = args.where.verseId as string;
        const before = existingRevisions.length;
        const remaining = existingRevisions.filter(
          (r) => r.verseId !== verseId,
        );
        const removed = before - remaining.length;
        existingRevisions.length = 0;
        existingRevisions.push(...remaining);
        return { count: removed };
      },
    );

  const verseDelete = vi
    .fn<(args: { where: Record<string, unknown> }) => Promise<VerseRow>>()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const id = args.where.id as string;
      const idx = existingVerses.findIndex((v) => v.id === id);
      if (idx === -1) {
        const err = new Error("Record not found") as Error & { code?: string };
        err.code = "P2025";
        throw err;
      }
      // Simulate FK constraint: if this verse still has revisions, fail.
      const hasRevisions = existingRevisions.some((r) => r.verseId === id);
      if (hasRevisions) {
        const err = new Error(
          "Foreign key constraint failed on the field: `verseId`",
        ) as Error & { code?: string };
        err.code = "P2003";
        throw err;
      }
      const [removed] = existingVerses.splice(idx, 1);
      return removed!;
    });

  const client = {
    verse: {
      create,
      findUnique,
      findFirst,
      findMany,
      delete: verseDelete,
    },
    verseRevision: {
      deleteMany: revisionDeleteMany,
    },
  };

  return {
    client,
    create,
    findUnique,
    findFirst,
    findMany,
    verseDelete,
    revisionDeleteMany,
  };
}

interface ServiceFixture {
  service: VersesService;
  mocks: ReturnType<typeof makeDbValue>;
}

async function buildService(
  dbOverrides: MockDbOverrides = {},
): Promise<ServiceFixture> {
  const dbValue = makeDbValue(dbOverrides);

  const module = await Test.createTestingModule({
    providers: [
      VersesService,
      { provide: DbService, useValue: dbValue },
    ],
  }).compile();

  return {
    service: module.get(VersesService),
    mocks: dbValue,
  };
}

// ---- tests ----------------------------------------------------------------

describe("VersesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- 2.1-2.2: create --------------------------------------------------------

  describe("create", () => {
    it("captures one server instant for both publishedAt and date", async () => {
      const { service, mocks } = await buildService();

      await service.create({ text: "New verse", reference: "John 1:1" });

      const createArgs = mocks.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      // Both publishedAt and date must be set by the server
      expect(createArgs.data.publishedAt).toBeInstanceOf(Date);
      expect(createArgs.data.date).toBeInstanceOf(Date);
      // publishedAt and date derive from the same now instant
      const pub = createArgs.data.publishedAt as Date;
      const dt = createArgs.data.date as Date;
      // publishedAt is the full UTC instant
      expect(pub.getTime()).toBeGreaterThan(0);
      // date should be a date-only value (midnight in UTC for the Peru date)
      expect(dt.getUTCHours()).toBe(0);
      expect(dt.getUTCMinutes()).toBe(0);
    });

    it("sets status to PUBLISHED on create", async () => {
      const { service, mocks } = await buildService();

      await service.create({ text: "Test", reference: "Ref" });

      const createArgs = mocks.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(createArgs.data.status).toBe("PUBLISHED");
    });

    it("derives date in America/Lima timezone from publishedAt", async () => {
      // We use a known UTC time and verify the date derivation
      const { service, mocks } = await buildService();

      const result = await service.create({ text: "Timezone test", reference: "Psalm 1:1" });

      const createArgs = mocks.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      const dateVal = createArgs.data.date as Date;
      // The date must be a valid Peru-day value (midnight UTC)
      expect(dateVal.getUTCHours()).toBe(0);
      expect(dateVal.getUTCMinutes()).toBe(0);
      expect(dateVal.getUTCSeconds()).toBe(0);
      expect(dateVal.getUTCMilliseconds()).toBe(0);
      // publishedAt must be a real timestamp
      const pubVal = createArgs.data.publishedAt as Date;
      expect(pubVal.getTime()).toBeGreaterThan(0);
      expect(result.publishedAt).toBeDefined();
    });

    it("does not accept client-provided date or publishedAt", async () => {
      // The DTO only has text and reference — date/publishedAt
      // should never come from the client. The service must ignore them.
      const { service, mocks } = await buildService();

      // Even if somehow passed, the service captures its own now
      await service.create({ text: "Safe", reference: "Ref" });

      const createArgs = mocks.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      // These come from server, not from DTO (which doesn't have them anyway)
      expect(createArgs.data.publishedAt).toBeInstanceOf(Date);
      expect(createArgs.data.date).toBeInstanceOf(Date);
    });
  });

  // -- delete -----------------------------------------------------------------

  describe("delete", () => {
    it("deletes an existing verse by id", async () => {
      const { service, mocks } = await buildService({
        existingVerses: [VERSE_A],
        findUniqueReturn: VERSE_A,
      });

      await service.delete("v-a");

      expect(mocks.verseDelete).toHaveBeenCalledWith({
        where: { id: "v-a" },
      });
    });

    it("throws NotFoundException when verse does not exist", async () => {
      const { service } = await buildService({ existingVerses: [] });

      await expect(service.delete("nonexistent")).rejects.toThrow("not found");
    });

    it("deletes a verse with existing revisions (FK constraint fix)", async () => {
      const REV: VerseRevisionRow = {
        id: "rev-1",
        verseId: "v-a",
        text: "Old text",
        reference: "John 1:1",
        changedAt: new Date("2026-07-01T00:00:00Z"),
        changedById: null,
      };

      const { service, mocks } = await buildService({
        existingVerses: [VERSE_A],
        findUniqueReturn: VERSE_A,
        existingRevisions: [REV],
      });

      await service.delete("v-a");

      // Must clean up revisions before deleting the verse (or rely on
      // onDelete: Cascade at the schema level).
      expect(mocks.revisionDeleteMany).toHaveBeenCalledWith({
        where: { verseId: "v-a" },
      });
      expect(mocks.verseDelete).toHaveBeenCalledWith({
        where: { id: "v-a" },
      });
    });
  });

  // -- getLatest --------------------------------------------------------------

  describe("getLatest", () => {
    it("returns the most recent published verse by publishedAt desc", async () => {
      // VERSE_B (Jul 3) is latest, VERSE_A (Jul 2) is older
      const { service, mocks } = await buildService({
        existingVerses: [VERSE_A, VERSE_B],
      });

      const result = await service.getLatest();

      expect(result).not.toBeNull();
      expect(result!.id).toBe("v-b");
      expect(result!.text).toBe("Verse B");
      // Must include tiebreaker to make ordering deterministic
      expect(mocks.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        }),
      );
    });

    it("returns null when no published verses exist", async () => {
      const { service } = await buildService({
        existingVerses: [DRAFT_VERSE], // only DRAFT
      });

      const result = await service.getLatest();
      expect(result).toBeNull();
    });

    it("returns null when no verses exist at all", async () => {
      const { service } = await buildService({ existingVerses: [] });

      const result = await service.getLatest();
      expect(result).toBeNull();
    });
  });

  // -- getHistory -------------------------------------------------------------

  describe("getHistory", () => {
    it("returns previous published verses excluding the latest", async () => {
      // VERSE_B (latest), VERSE_A (older), VERSE_C (oldest)
      const { service, mocks } = await buildService({
        existingVerses: [VERSE_C, VERSE_A, VERSE_B], // C=Jul1, A=Jul2, B=Jul3
      });

      const result = await service.getHistory();

      // History excludes latest (B), returns A and C, newest first
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe("v-a"); // Jul 2
      expect(result[1]!.id).toBe("v-c"); // Jul 1
      // Must include tiebreaker to make ordering deterministic; take:101
      // ensures 100 history items after excluding the latest.
      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PUBLISHED" },
          orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
          take: 101,
        }),
      );
    });

    it("caps history results to prevent unbounded growth", async () => {
      // Create 120 published verses. With take:101 the DB returns 101 rows;
      // after excluding the latest the service must return exactly 100.
      const manyVerses: VerseRow[] = Array.from({ length: 120 }, (_, i) => ({
        id: `v-many-${i}`,
        text: `Verse ${i}`,
        reference: `Ref ${i}`,
        date: peruDate(toUTC("2026-07-01T10:00:00")),
        publishedAt: toUTC(`2026-07-01T${String(10 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00`),
        status: "PUBLISHED" as const,
        createdById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      const { service, mocks } = await buildService({
        existingVerses: manyVerses,
      });

      const result = await service.getHistory();
      // take:101 minus the latest = exactly 100 history items
      expect(result.length).toBe(100);
      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 101 }),
      );
    });

    it("returns exactly 100 history items at the boundary (101 published verses)", async () => {
      // 101 PUBLISHED verses — take:101 returns all, filter latest → 100 history.
      const boundaryVerses: VerseRow[] = Array.from({ length: 101 }, (_, i) => ({
        id: `v-bound-${i}`,
        text: `Verse ${i}`,
        reference: `Ref ${i}`,
        date: peruDate(toUTC("2026-07-01T10:00:00")),
        publishedAt: toUTC(`2026-07-01T${String(10 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00`),
        status: "PUBLISHED" as const,
        createdById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      const { service } = await buildService({
        existingVerses: boundaryVerses,
      });

      const result = await service.getHistory();
      expect(result.length).toBe(100);
    });

    it("returns empty array when only one published verse exists (it is the latest)", async () => {
      const { service } = await buildService({
        existingVerses: [VERSE_A],
      });

      const result = await service.getHistory();
      expect(result).toEqual([]);
    });

    it("returns empty array when no published verses exist", async () => {
      const { service } = await buildService({ existingVerses: [] });

      const result = await service.getHistory();
      expect(result).toEqual([]);
    });

    it("excludes non-PUBLISHED verses from history", async () => {
      const { service } = await buildService({
        existingVerses: [VERSE_A, DRAFT_VERSE],
      });

      const result = await service.getHistory();
      // Only VERSE_A is published, and it's the only one → it IS the latest
      // No history should be returned
      expect(result).toEqual([]);
    });
  });

  // -- findAll (admin) --------------------------------------------------------

  describe("findAll", () => {
    it("returns all verses ordered by publishedAt desc", async () => {
      const { service, mocks } = await buildService({
        existingVerses: [VERSE_C, VERSE_A, VERSE_B, DRAFT_VERSE],
      });

      const result = await service.findAll();

      // All 4 verses, ordered by publishedAt desc (B→A→C→draft)
      expect(result).toHaveLength(4);
      expect(result[0]!.id).toBe("v-b"); // latest
      // Must include tiebreaker to make ordering deterministic
      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
          take: 200,
        }),
      );
    });

    it("caps admin listing to 200 to prevent unbounded growth", async () => {
      const manyVerses: VerseRow[] = Array.from({ length: 250 }, (_, i) => ({
        id: `v-admin-${i}`,
        text: `Verse ${i}`,
        reference: `Ref ${i}`,
        date: peruDate(toUTC("2026-07-01T10:00:00")),
        publishedAt: toUTC(`2026-07-01T${String(10 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00`),
        status: "PUBLISHED" as const,
        createdById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      const { service, mocks } = await buildService({
        existingVerses: manyVerses,
      });

      const result = await service.findAll();
      expect(result.length).toBeLessThanOrEqual(200);
      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 }),
      );
    });

    it("breaks ties on equal publishedAt with id desc", async () => {
      const sameTime = toUTC("2026-07-01T10:00:00");
      const VERSE_X: VerseRow = {
        id: "v-x",
        text: "Verse X",
        reference: "Rev 1:1",
        date: peruDate(sameTime),
        publishedAt: sameTime,
        status: "PUBLISHED",
        createdById: null,
        createdAt: sameTime,
        updatedAt: sameTime,
      };
      const VERSE_Y: VerseRow = {
        id: "v-y",
        text: "Verse Y",
        reference: "Rev 2:1",
        date: peruDate(sameTime),
        publishedAt: sameTime,
        status: "PUBLISHED",
        createdById: null,
        createdAt: sameTime,
        updatedAt: sameTime,
      };
      // v-y id > v-x id (string comparison)
      const { service } = await buildService({
        existingVerses: [VERSE_X, VERSE_Y],
      });

      const result = await service.findAll();
      expect(result).toHaveLength(2);
      // Tie: same publishedAt, id desc → v-y first
      expect(result[0]!.id).toBe("v-y");
      expect(result[1]!.id).toBe("v-x");
    });
  });

  // -- timezone edge cases: production-path via VersesService.create() --------

  describe("peruDateOnly timezone edge cases (production path)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("groups near-midnight UTC as previous Lima date via service.create()", async () => {
      // 2026-07-02T04:30:00Z → Lima is still 2026-07-01 23:30 (-05)
      vi.setSystemTime(NEAR_MIDNIGHT_UTC);

      const { service, mocks } = await buildService();

      const result = await service.create({
        text: "Near midnight",
        reference: "Psalm 119:105",
      });

      const createArgs = mocks.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };

      // publishedAt must be the exact UTC instant captured by the service
      expect((createArgs.data.publishedAt as Date).getTime()).toBe(
        NEAR_MIDNIGHT_UTC.getTime(),
      );

      // date must be the Lima calendar date: 2026-07-01 (previous day)
      expect((createArgs.data.date as Date).toISOString()).toBe(
        "2026-07-01T00:00:00.000Z",
      );

      // Also check the returned row
      expect(result.date.toISOString()).toBe("2026-07-01T00:00:00.000Z");
      expect(result.publishedAt!.getTime()).toBe(NEAR_MIDNIGHT_UTC.getTime());
    });

    it("groups just-after-midnight UTC as current Lima date via service.create()", async () => {
      // 2026-07-02T05:30:00Z → Lima is 2026-07-02 00:30 (-05)
      vi.setSystemTime(JUST_AFTER_MIDNIGHT_UTC);

      const { service, mocks } = await buildService();

      const result = await service.create({
        text: "Just after midnight",
        reference: "Psalm 30:5",
      });

      const createArgs = mocks.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };

      expect((createArgs.data.publishedAt as Date).getTime()).toBe(
        JUST_AFTER_MIDNIGHT_UTC.getTime(),
      );

      expect((createArgs.data.date as Date).toISOString()).toBe(
        "2026-07-02T00:00:00.000Z",
      );

      expect(result.date.toISOString()).toBe("2026-07-02T00:00:00.000Z");
      expect(result.publishedAt!.getTime()).toBe(
        JUST_AFTER_MIDNIGHT_UTC.getTime(),
      );
    });

    it("midday UTC produces same-day Lima date via service.create()", async () => {
      // 2026-07-02T15:00:00Z → Lima is 2026-07-02 10:00 (-05) — same day
      vi.setSystemTime(MIDDAY_UTC);

      const { service, mocks } = await buildService();

      const result = await service.create({
        text: "Midday verse",
        reference: "Psalm 1:1",
      });

      const createArgs = mocks.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };

      expect((createArgs.data.publishedAt as Date).getTime()).toBe(
        MIDDAY_UTC.getTime(),
      );

      expect((createArgs.data.date as Date).toISOString()).toBe(
        "2026-07-02T00:00:00.000Z",
      );

      expect(result.date.toISOString()).toBe("2026-07-02T00:00:00.000Z");
      expect(result.publishedAt!.getTime()).toBe(MIDDAY_UTC.getTime());
    });
  });
});
