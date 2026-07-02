/**
 * LandingPublicController tests (LP-02).
 *
 * Proves that the public GET endpoint exists, is NOT behind AuthGuard,
 * and delegates to LandingService.getPublicPayload() correctly.
 *
 * Follows files-public.controller.test.ts pattern:
 * Test.createTestingModule with mocked LandingService, no guard override
 * (public routes have no auth).
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LandingPublicController } from "./landing-public.controller.js";
import { LandingService } from "./landing.service.js";

import type {
  LandingPublicPayload,
  FeaturedOutingPayload,
  FeaturedPostPayload,
  CurrentVersePayload,
} from "./landing.service.js";

// ---- test data ------------------------------------------------------------

const FULL_PAYLOAD: LandingPublicPayload = {
  heroTitle: "Misión 1-99",
  heroSubtitle: "Transformando vidas",
  heroImageUrl: "/files/img-001",
  mission: "Nuestra misión es servir",
  vision: "Ser referencia en la comunidad",
  description: "Somos una organización dedicada a...",
  featuredVideoUrl: "https://youtube.com/watch?v=abc",
  contactEmail: "info@m199.org",
  contactPhone: "+54 11 1234-5678",
  featuredOuting: {
    id: "out-001",
    slug: "salida-mensual",
    title: "Salida Mensual",
    location: "Barrio Norte",
    mainImageUrl: "/files/img-out-001",
  } as FeaturedOutingPayload,
  featuredPosts: [
    {
      id: "post-001",
      slug: "primer-post",
      title: "Primer Post",
      coverImageUrl: "/files/img-post-001",
    } as FeaturedPostPayload,
  ],
  currentVerse: {
    text: "Todo lo puedo en Cristo que me fortalece",
    reference: "Filipenses 4:13",
    date: "2026-07-01T00:00:00.000Z",
  } as CurrentVersePayload,
};

const NULL_SECTIONS_PAYLOAD: LandingPublicPayload = {
  heroTitle: null,
  heroSubtitle: null,
  heroImageUrl: null,
  mission: null,
  vision: null,
  description: null,
  featuredVideoUrl: null,
  contactEmail: null,
  contactPhone: null,
  featuredOuting: null,
  featuredPosts: [],
  currentVerse: null,
};

// ---- helpers --------------------------------------------------------------

function mockLandingService(): LandingService {
  return {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    getPublicPayload: vi.fn().mockResolvedValue(FULL_PAYLOAD),
  } as unknown as LandingService;
}

// ---- tests ----------------------------------------------------------------

describe("LandingPublicController", () => {
  let controller: LandingPublicController;
  let service: LandingService;

  beforeEach(async () => {
    vi.clearAllMocks();

    service = mockLandingService();

    const module = await Test.createTestingModule({
      controllers: [LandingPublicController],
      providers: [{ provide: LandingService, useValue: service }],
    }).compile();

    controller = module.get(LandingPublicController);
  });

  // ---- GET /landing/public (LP-02) ----------------------------------------

  describe("GET /landing/public (LP-02)", () => {
    it("delegates to service.getPublicPayload and returns full payload", async () => {
      const result = await controller.getPublicPayload();

      expect(service.getPublicPayload).toHaveBeenCalledOnce();
      expect(result).toEqual(FULL_PAYLOAD);
      // Spot-check key fields
      expect(result.heroTitle).toBe("Misión 1-99");
      expect(result.heroImageUrl).toBe("/files/img-001");
      expect(result.mission).toBe("Nuestra misión es servir");
      expect(result.featuredOuting).not.toBeNull();
      expect(result.featuredPosts).toHaveLength(1);
      expect(result.currentVerse).not.toBeNull();
    });

    it("returns payload with null sections when service returns nulls", async () => {
      vi.mocked(service.getPublicPayload).mockResolvedValue(
        NULL_SECTIONS_PAYLOAD,
      );

      const result = await controller.getPublicPayload();

      expect(service.getPublicPayload).toHaveBeenCalledOnce();
      expect(result.heroTitle).toBeNull();
      expect(result.heroImageUrl).toBeNull();
      expect(result.mission).toBeNull();
      expect(result.featuredOuting).toBeNull();
      expect(result.featuredPosts).toEqual([]);
      expect(result.currentVerse).toBeNull();
    });
  });

  // ---- No auth guard (LP-02) ----------------------------------------------

  describe("No auth guard (LP-02)", () => {
    it("does NOT have @UseGuards decorator on the controller", () => {
      const guards = Reflect.getMetadata(
        "__guards__",
        LandingPublicController,
      );
      expect(guards).toBeUndefined();
    });
  });

  // ---- module wiring (smoke test) -----------------------------------------

  it("compiles with mocked service", () => {
    expect(controller).toBeDefined();
  });
});
