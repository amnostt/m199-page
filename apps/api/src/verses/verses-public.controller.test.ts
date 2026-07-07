/**
 * VersesPublicController tests — Daily Verse (Task 3.3).
 *
 * Proves public history route delegates correctly and handles
 * empty/error conditions.
 *
 * Follows posts-public.controller.test.ts pattern: Test.createTestingModule
 * with mocked VersesService (no AuthGuard on public routes).
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { VersesPublicController } from "./verses-public.controller.js";
import { VersesService } from "./verses.service.js";
import type { VerseRow } from "./verses.service.js";

// ---- test data ------------------------------------------------------------

const NOW = new Date("2026-07-06T12:00:00.000Z");

function makeVerse(overrides: Partial<VerseRow> = {}): VerseRow {
  return {
    id: "v-001",
    text: "Test verse",
    reference: "John 1:1",
    date: new Date("2026-07-06T00:00:00.000Z"),
    publishedAt: NOW,
    status: "PUBLISHED",
    createdById: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const VERSE_A = makeVerse({ id: "v-a", text: "Verse A" });
const VERSE_B = makeVerse({
  id: "v-b",
  text: "Verse B",
  publishedAt: new Date("2026-07-05T10:00:00.000Z"),
});

// ---- helpers --------------------------------------------------------------

function mockVersesService(overrides: {
  historyReturn?: VerseRow[];
} = {}) {
  return {
    create: vi.fn(),
    delete: vi.fn(),
    findAll: vi.fn(),
    getLatest: vi.fn().mockResolvedValue(VERSE_A),
    getHistory: vi.fn().mockResolvedValue(overrides.historyReturn ?? [VERSE_B]),
  } as unknown as VersesService;
}

// ---- tests ----------------------------------------------------------------

describe("VersesPublicController", () => {
  // -- Unit: controller method calls ---------------------------------------

  describe("GET /verses/history", () => {
    it("returns previous verses excluding the current latest", async () => {
      const module = await Test.createTestingModule({
        controllers: [VersesPublicController],
        providers: [
          {
            provide: VersesService,
            useValue: mockVersesService({ historyReturn: [VERSE_B] }),
          },
        ],
      }).compile();

      const controller = module.get(VersesPublicController);
      const result = await controller.getHistory();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("v-b");
      expect(result[0]!.text).toBe("Verse B");
      // Public response shape
      expect(result[0]!).toHaveProperty("id");
      expect(result[0]!).toHaveProperty("text");
      expect(result[0]!).toHaveProperty("reference");
      expect(result[0]!).toHaveProperty("date");
      expect(result[0]!).toHaveProperty("publishedAt");
      // No internal fields
      expect(result[0]!).not.toHaveProperty("createdById");
      expect(result[0]!).not.toHaveProperty("status");
    });

    it("returns empty array when no history exists", async () => {
      const module = await Test.createTestingModule({
        controllers: [VersesPublicController],
        providers: [
          {
            provide: VersesService,
            useValue: mockVersesService({ historyReturn: [] }),
          },
        ],
      }).compile();

      const controller = module.get(VersesPublicController);
      const result = await controller.getHistory();

      expect(result).toEqual([]);
    });

    it("is accessible without authentication", async () => {
      const module = await Test.createTestingModule({
        controllers: [VersesPublicController],
        providers: [
          {
            provide: VersesService,
            useValue: mockVersesService(),
          },
        ],
      }).compile();

      const app = module.createNestApplication();
      await app.init();

      const res = await request(app.getHttpServer()).get("/verses/history");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });
});
