/**
 * OutingsPublicController tests (OUT-02, OUT-06, OUT-07).
 *
 * Proves that public routes are NOT behind AuthGuard, delegate correctly
 * to OutingsService, hide DRAFT/ARCHIVED outings, and handle likes idempotently.
 *
 * Follows landing-public.controller.test.ts pattern:
 * Test.createTestingModule with mocked OutingsService, no guard override
 * (public routes have no auth).
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request } from "express";
import { OutingsPublicController } from "./outings-public.controller.js";
import { OutingsService } from "./outings.service.js";
import type { OutingResponse, OutingRow } from "./outings.service.js";

// ---- test data ------------------------------------------------------------

const PUBLISHED_OUTING: OutingResponse = {
  id: "out-001",
  slug: "camp-day",
  title: "Camp Day",
  dateTime: "2026-07-15T10:00:00.000Z",
  location: "Barrio Norte",
  description: "A great day of camping",
  status: "PUBLISHED",
  likesCount: 5,
  mainImageUrl: "/files/img-001",
  croquisUrl: null,
  planUrl: null,
};

const PUBLISHED_OUTING_2: OutingResponse = {
  id: "out-002",
  slug: "park-cleanup",
  title: "Park Cleanup",
  dateTime: "2026-08-01T09:00:00.000Z",
  location: "Central Park",
  description: "Community park cleanup",
  status: "PUBLISHED",
  likesCount: 3,
  mainImageUrl: null,
  croquisUrl: null,
  planUrl: null,
};

// ---- helpers --------------------------------------------------------------

function mockOutingsService(): OutingsService {
  return {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    findBySlug: vi
      .fn()
      .mockResolvedValue({ id: "out-001", status: "PUBLISHED" } as OutingRow),
    findAllPublic: vi
      .fn()
      .mockResolvedValue([PUBLISHED_OUTING, PUBLISHED_OUTING_2]),
    addLike: vi.fn().mockResolvedValue({ likesCount: 6 }),
    featureOuting: vi.fn(),
  } as unknown as OutingsService;
}

/**
 * Creates a minimal Express-like request object with IP and User-Agent headers.
 */
function mockLikeRequest(ip: string, userAgent: string): Request {
  return {
    ip,
    headers: { "user-agent": userAgent },
  } as unknown as Request;
}

// ---- tests ----------------------------------------------------------------

describe("OutingsPublicController", () => {
  let controller: OutingsPublicController;
  let service: OutingsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    service = mockOutingsService();

    const module = await Test.createTestingModule({
      controllers: [OutingsPublicController],
      providers: [{ provide: OutingsService, useValue: service }],
    }).compile();

    controller = module.get(OutingsPublicController);
  });

  // ---- GET /outings (OUT-02, OUT-06) ---------------------------------------

  describe("GET /outings (OUT-02, OUT-06)", () => {
    it("delegates to service.findAllPublic and returns OutingResponse array", async () => {
      const result = await controller.findAllPublic();

      expect(service.findAllPublic).toHaveBeenCalledOnce();
      expect(result).toEqual([PUBLISHED_OUTING, PUBLISHED_OUTING_2]);
      expect(result).toHaveLength(2);
    });

    it("returns only PUBLISHED outings", async () => {
      const result = await controller.findAllPublic();

      for (const outing of result) {
        expect(outing.status).toBe("PUBLISHED");
      }
    });

    it("returns empty array when no published outings exist", async () => {
      vi.mocked(service.findAllPublic).mockResolvedValue([]);

      const result = await controller.findAllPublic();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("does not expose internal fields (createdById, publishedAt)", async () => {
      const result = await controller.findAllPublic();

      for (const outing of result) {
        expect(outing).not.toHaveProperty("createdById");
        expect(outing).not.toHaveProperty("publishedAt");
        expect(outing).not.toHaveProperty("createdAt");
        expect(outing).not.toHaveProperty("updatedAt");
      }
    });
  });

  // ---- GET /outings/:slug (OUT-02, OUT-06) ---------------------------------

  describe("GET /outings/:slug (OUT-02, OUT-06)", () => {
    it("delegates to service.findBySlug with path param", async () => {
      vi.mocked(service.findBySlug).mockResolvedValue({
        id: "out-001",
        slug: "camp-day",
        status: "PUBLISHED",
        title: "Camp Day",
        dateTime: new Date("2026-07-15T10:00:00Z"),
        location: "Barrio Norte",
        description: "Great camping",
        likesCount: 5,
        mainImageId: "img-001",
        croquisId: null,
        planId: null,
        createdById: null,
        publishedAt: null,
        createdAt: new Date("2026-07-01T00:00:00Z"),
        updatedAt: new Date("2026-07-01T00:00:00Z"),
      } as OutingRow);

      const result = await controller.findBySlug("camp-day");

      expect(service.findBySlug).toHaveBeenCalledWith("camp-day");
      expect(result.slug).toBe("camp-day");
      expect(result.status).toBe("PUBLISHED");
    });

    it("returns 404-like NotFoundException for missing slug", async () => {
      vi.mocked(service.findBySlug).mockResolvedValue(null);

      await expect(controller.findBySlug("nonexistent")).rejects.toThrow();
    });

    it("returns 404-like NotFoundException for DRAFT outing slug", async () => {
      vi.mocked(service.findBySlug).mockResolvedValue({
        id: "out-draft",
        slug: "draft-outing",
        status: "DRAFT",
        title: "Draft",
        dateTime: new Date(),
        location: "X",
        description: "X",
        likesCount: 0,
        mainImageId: null,
        croquisId: null,
        planId: null,
        createdById: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OutingRow);

      await expect(controller.findBySlug("draft-outing")).rejects.toThrow();
    });

    it("returns 404-like NotFoundException for ARCHIVED outing slug", async () => {
      vi.mocked(service.findBySlug).mockResolvedValue({
        id: "out-archived",
        slug: "old-outing",
        status: "ARCHIVED",
        title: "Old",
        dateTime: new Date(),
        location: "X",
        description: "X",
        likesCount: 0,
        mainImageId: null,
        croquisId: null,
        planId: null,
        createdById: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OutingRow);

      await expect(controller.findBySlug("old-outing")).rejects.toThrow();
    });
  });

  // ---- POST /outings/:slug/like (OUT-07) -----------------------------------

  describe("POST /outings/:slug/like (OUT-07)", () => {
    it("delegates to service.addLike with outing id, IP, and user-agent", async () => {
      vi.mocked(service.findBySlug).mockResolvedValue({
        id: "out-001",
        slug: "camp-day",
        status: "PUBLISHED",
      } as OutingRow);
      const req = mockLikeRequest("192.168.1.1", "Mozilla/5.0");

      const result = await controller.like("camp-day", req);

      expect(service.findBySlug).toHaveBeenCalledWith("camp-day");
      expect(service.addLike).toHaveBeenCalledWith(
        "out-001",
        "192.168.1.1",
        "Mozilla/5.0",
      );
      expect(result).toEqual({ likesCount: 6 });
    });

    it("returns updated likesCount on first like", async () => {
      vi.mocked(service.addLike).mockResolvedValue({ likesCount: 1 });
      vi.mocked(service.findBySlug).mockResolvedValue({
        id: "out-new",
        slug: "new-outing",
        status: "PUBLISHED",
      } as OutingRow);
      const req = mockLikeRequest("10.0.0.1", "curl/8.0");

      const result = await controller.like("new-outing", req);

      expect(result).toEqual({ likesCount: 1 });
    });

    it("returns same likesCount on duplicate like (idempotent)", async () => {
      vi.mocked(service.addLike).mockResolvedValue({ likesCount: 5 });
      vi.mocked(service.findBySlug).mockResolvedValue({
        id: "out-001",
        slug: "camp-day",
        status: "PUBLISHED",
      } as OutingRow);
      const req = mockLikeRequest("192.168.1.1", "Mozilla/5.0");

      // First like
      let result = await controller.like("camp-day", req);
      expect(result).toEqual({ likesCount: 5 });

      // Duplicate like — same IP/UA, same outing
      result = await controller.like("camp-day", req);
      expect(result).toEqual({ likesCount: 5 });
      expect(service.addLike).toHaveBeenCalledTimes(2);
    });

    it("throws NotFoundException when outing slug does not exist", async () => {
      vi.mocked(service.findBySlug).mockResolvedValue(null);
      const req = mockLikeRequest("1.2.3.4", "test-agent");

      await expect(controller.like("nonexistent", req)).rejects.toThrow();
    });

    it("throws NotFoundException for DRAFT outing (public boundary)", async () => {
      vi.mocked(service.findBySlug).mockResolvedValue({
        id: "out-draft",
        slug: "draft-outing",
        status: "DRAFT",
      } as OutingRow);
      const req = mockLikeRequest("1.2.3.4", "test-agent");

      await expect(controller.like("draft-outing", req)).rejects.toThrow();
    });

    it("throws NotFoundException for ARCHIVED outing (public boundary)", async () => {
      vi.mocked(service.findBySlug).mockResolvedValue({
        id: "out-archived",
        slug: "old-outing",
        status: "ARCHIVED",
      } as OutingRow);
      const req = mockLikeRequest("1.2.3.4", "test-agent");

      await expect(controller.like("old-outing", req)).rejects.toThrow();
    });

    it("passes IPv6 addresses to service.addLike", async () => {
      vi.mocked(service.findBySlug).mockResolvedValue({
        id: "out-001",
        slug: "camp-day",
        status: "PUBLISHED",
      } as OutingRow);
      const req = mockLikeRequest("::ffff:192.168.1.1", "Mozilla/5.0");

      await controller.like("camp-day", req);

      expect(service.addLike).toHaveBeenCalledWith(
        "out-001",
        "::ffff:192.168.1.1",
        "Mozilla/5.0",
      );
    });
  });

  // ---- No auth guard (OUT-06) ----------------------------------------------

  describe("No auth guard (OUT-06)", () => {
    it("does NOT have @UseGuards decorator on the controller", () => {
      const guards = Reflect.getMetadata("__guards__", OutingsPublicController);
      expect(guards).toBeUndefined();
    });
  });

  // ---- module wiring (smoke test) -----------------------------------------

  it("compiles with mocked service", () => {
    expect(controller).toBeDefined();
  });
});
