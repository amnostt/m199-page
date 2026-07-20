/**
 * OutingsAdminController tests (OUT-01, OUT-05).
 *
 * Proves that admin routes are behind AuthGuard, delegate correctly
 * to OutingsService, and that the controller validates inputs.
 *
 * Follows landing-admin.controller.test.ts pattern:
 * Test.createTestingModule with mocked OutingsService and overridden AuthGuard.
 */
import { Test } from "@nestjs/testing";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import type { INestApplication } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import request from "supertest";
import { OutingsAdminController } from "./outings-admin.controller.js";
import { OutingsService } from "./outings.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { CreateOutingDto } from "./dto/create-outing.dto.js";
import { UpdateOutingDto } from "./dto/update-outing.dto.js";
import { OutingListQueryDto } from "./dto/outing-list-query.dto.js";

// ---- test data ------------------------------------------------------------

const SAMPLE_OUTING = {
  id: "out-001",
  slug: "camp-day",
  title: "Camp Day",
  dateTime: new Date("2026-07-15T10:00:00Z"),
  location: "Barrio Norte",
  description: "A great day of camping",
  status: "DRAFT" as const,
  likesCount: 0,
  mainImageId: null,
  croquisId: null,
  planId: null,
  createdById: null,
  publishedAt: null,
  createdAt: new Date("2026-07-01T00:00:00Z"),
  updatedAt: new Date("2026-07-01T00:00:00Z"),
};

// ---- helpers --------------------------------------------------------------

function mockOutingsService(): OutingsService {
  return {
    findAll: vi.fn().mockResolvedValue([SAMPLE_OUTING]),
    findBySlug: vi.fn(),
    create: vi.fn().mockResolvedValue(SAMPLE_OUTING),
    update: vi.fn().mockResolvedValue(SAMPLE_OUTING),
    archive: vi.fn().mockResolvedValue({
      ...SAMPLE_OUTING,
      status: "ARCHIVED" as const,
    }),
    featureOuting: vi.fn().mockResolvedValue({ featuredOutingId: "out-002" }),
    clearFeaturedOuting: vi.fn().mockResolvedValue({ featuredOutingId: null }),
    findAllPublic: vi.fn(),
    addLike: vi.fn(),
  } as unknown as OutingsService;
}

// ---- tests ----------------------------------------------------------------

describe("OutingsAdminController", () => {
  let controller: OutingsAdminController;
  let service: OutingsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    service = mockOutingsService();

    const module = await Test.createTestingModule({
      controllers: [OutingsAdminController],
      providers: [{ provide: OutingsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: vi.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(OutingsAdminController);
  });

  // ---- GET /outings/admin (OUT-01) -----------------------------------------

  describe("GET /outings/admin (OUT-01)", () => {
    it("delegates to service.findAll with empty query and returns array", async () => {
      const result = await controller.findAll({} as OutingListQueryDto);

      expect(service.findAll).toHaveBeenCalledOnce();
      expect(result).toEqual([SAMPLE_OUTING]);
    });

    it("passes status filter to service.findAll", async () => {
      const query = { status: "PUBLISHED" } as OutingListQueryDto;

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it("passes skip/take pagination to service.findAll", async () => {
      const query = { skip: 10, take: 5 } as OutingListQueryDto;

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ---- POST /outings/admin (OUT-01) ----------------------------------------

  describe("POST /outings/admin (OUT-01)", () => {
    it("delegates to service.create with validated DTO", async () => {
      const dto: CreateOutingDto = {
        title: "Camp Day",
        slug: "camp-day",
        dateTime: "2026-07-15T10:00:00Z",
        location: "Barrio Norte",
        description: "A great day of camping",
      };

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(SAMPLE_OUTING);
    });

    it("passes optional asset IDs to service.create", async () => {
      const dto: CreateOutingDto = {
        title: "Camp Day",
        slug: "camp-day",
        dateTime: "2026-07-15T10:00:00Z",
        location: "Barrio Norte",
        description: "A great day of camping",
        mainImageId: "img-001",
        croquisId: "croq-001",
      };

      await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it("passes status field to service.create", async () => {
      const dto: CreateOutingDto = {
        title: "Published Outing",
        slug: "published-outing",
        dateTime: "2026-07-20T10:00:00Z",
        location: "Downtown",
        description: "Full description",
        status: "PUBLISHED",
      } as CreateOutingDto;

      await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  // ---- PATCH /outings/admin/:id (OUT-01) -----------------------------------

  describe("PATCH /outings/admin/:id (OUT-01)", () => {
    it("delegates to service.update with path param and DTO", async () => {
      const dto: UpdateOutingDto = {
        title: "Updated Camp Day",
        location: "New Location",
      };

      const result = await controller.update("out-001", dto);

      expect(service.update).toHaveBeenCalledWith("out-001", dto);
      expect(result).toEqual(SAMPLE_OUTING);
    });

    it("passes empty DTO for no-op update", async () => {
      const dto: UpdateOutingDto = {};

      await controller.update("out-001", dto);

      expect(service.update).toHaveBeenCalledWith("out-001", dto);
    });
  });

  // ---- POST /outings/admin/:id/archive (OUT-01) ----------------------------

  describe("POST /outings/admin/:id/archive (OUT-01)", () => {
    it("delegates to service.archive and returns archived outing", async () => {
      const result = await controller.archive("out-001");

      expect(service.archive).toHaveBeenCalledWith("out-001");
      expect(result.status).toBe("ARCHIVED");
    });
  });

  // ---- POST /outings/admin/:id/feature (OUT-05) ----------------------------

  describe("POST /outings/admin/:id/feature (OUT-05)", () => {
    it("delegates to service.featureOuting for published outing", async () => {
      await controller.feature("out-002");

      expect(service.featureOuting).toHaveBeenCalledWith("out-002");
    });

    it("calls featureOuting for draft outing (service validates status)", async () => {
      // The controller delegates; the service is responsible for
      // rejecting non-PUBLISHED outings.
      await controller.feature("out-001");

      expect(service.featureOuting).toHaveBeenCalledWith("out-001");
    });

    it("returns the authoritative featured pointer from selection", async () => {
      await expect(controller.feature("out-002")).resolves.toEqual({
        featuredOutingId: "out-002",
      });
    });

    it("delegates clear and returns a null pointer", async () => {
      await expect(controller.clearFeature()).resolves.toEqual({
        featuredOutingId: null,
      });
      expect(service.clearFeaturedOuting).toHaveBeenCalledOnce();
    });
  });

  // ---- AuthGuard protection (OUT-01) ---------------------------------------

  describe("AuthGuard protection (OUT-01)", () => {
    it("has @UseGuards(AuthGuard) decorator on the controller", () => {
      const guards = Reflect.getMetadata(
        "__guards__",
        OutingsAdminController,
      ) as unknown[];
      expect(guards).toBeDefined();
      expect(guards).toContain(AuthGuard);
    });
  });

  // ---- Route-level 401 (OUT-01) --------------------------------------------

  describe("Route-level 401 for unauthenticated requests (OUT-01)", () => {
    let app: INestApplication;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        controllers: [OutingsAdminController],
        providers: [
          { provide: OutingsService, useValue: mockOutingsService() },
        ],
      })
        .overrideGuard(AuthGuard)
        .useValue({
          canActivate: () => {
            throw new UnauthorizedException("Missing access token");
          },
        })
        .compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it("returns 401 for GET /outings/admin without valid auth", async () => {
      const res = await request(app.getHttpServer()).get("/outings/admin");
      expect(res.status).toBe(401);
    });

    it("returns 401 for POST /outings/admin without valid auth", async () => {
      const res = await request(app.getHttpServer())
        .post("/outings/admin")
        .send({
          title: "Test",
          slug: "test",
          dateTime: "2026-07-15T10:00:00Z",
          location: "Test",
          description: "Test",
        });
      expect(res.status).toBe(401);
    });
  });

  // ---- module wiring (smoke test) -----------------------------------------

  it("compiles with mocked service and overridden guard", () => {
    expect(controller).toBeDefined();
  });
});
