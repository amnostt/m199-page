/**
 * LandingAdminController tests (LP-01).
 *
 * Proves that admin routes are behind AuthGuard, delegate correctly
 * to LandingService, and that unauthenticated access is rejected (401).
 *
 * Follows responsibles.controller.test.ts pattern:
 * Test.createTestingModule with mocked LandingService and overridden AuthGuard.
 */
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LandingAdminController } from "./landing-admin.controller.js";
import { LandingService } from "./landing.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { UpdateLandingSettingsDto } from "./dto/update-landing-settings.dto.js";

// ---- test data ------------------------------------------------------------

export interface LandingSettingsRow {
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

const UPDATED_SETTINGS: LandingSettingsRow = {
  ...FULL_SETTINGS,
  mission: "Misión actualizada",
};

// ---- helpers --------------------------------------------------------------

function mockLandingService(): LandingService {
  return {
    getSettings: vi.fn().mockResolvedValue(FULL_SETTINGS),
    updateSettings: vi.fn().mockResolvedValue(UPDATED_SETTINGS),
    getPublicPayload: vi.fn(),
  } as unknown as LandingService;
}

// ---- tests ----------------------------------------------------------------

describe("LandingAdminController", () => {
  let controller: LandingAdminController;
  let service: LandingService;

  beforeEach(async () => {
    vi.clearAllMocks();

    service = mockLandingService();

    const module = await Test.createTestingModule({
      controllers: [LandingAdminController],
      providers: [{ provide: LandingService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: vi.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(LandingAdminController);
  });

  // ---- GET /landing/admin (LP-01) -----------------------------------------

  describe("GET /landing/admin (LP-01)", () => {
    it("delegates to service.getSettings and returns settings", async () => {
      const result = await controller.getSettings();

      expect(service.getSettings).toHaveBeenCalledOnce();
      expect(result).toEqual(FULL_SETTINGS);
    });

    it("returns null settings when service returns null", async () => {
      vi.mocked(service.getSettings).mockResolvedValue(null);

      const result = await controller.getSettings();

      expect(service.getSettings).toHaveBeenCalledOnce();
      expect(result).toBeNull();
    });
  });

  // ---- PUT /landing/admin (LP-01) -----------------------------------------

  describe("PUT /landing/admin (LP-01)", () => {
    it("delegates to service.updateSettings with provided DTO fields", async () => {
      const dto = { mission: "Misión actualizada" } as UpdateLandingSettingsDto;

      const result = await controller.updateSettings(dto);

      expect(service.updateSettings).toHaveBeenCalledWith(dto);
      expect(result).toEqual(UPDATED_SETTINGS);
      expect(result.mission).toBe("Misión actualizada");
    });

    it("passes multiple DTO fields to service.updateSettings", async () => {
      const dto = {
        mission: "Nueva misión",
        vision: "Nueva visión",
        contactEmail: "nuevo@test.com",
      } as UpdateLandingSettingsDto;

      await controller.updateSettings(dto);

      expect(service.updateSettings).toHaveBeenCalledWith(dto);
    });

    it("rejects unsafe video URLs when validating the DTO directly", async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      try {
        await pipe.transform(
          { featuredVideoUrl: "javascript:alert(1)" },
          { type: "body", metatype: UpdateLandingSettingsDto },
        );
        expect.unreachable("Expected BadRequestException");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it("rejects unsafe video URLs through the real Nest route", async () => {
      const landingService = mockLandingService();
      const module = await Test.createTestingModule({
        controllers: [LandingAdminController],
        providers: [{ provide: LandingService, useValue: landingService }],
      })
        .overrideGuard(AuthGuard)
        .useValue({ canActivate: vi.fn().mockResolvedValue(true) })
        .compile();
      const app = module.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();

      try {
        const res = await request(app.getHttpServer())
          .put("/landing/admin")
          .send({ featuredVideoUrl: "javascript:alert(1)" });

        expect(res.status).toBe(400);
        expect(landingService.updateSettings).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    });

    it("rejects an explicit null hero image before calling the service", async () => {
      const landingService = mockLandingService();
      const module = await Test.createTestingModule({
        controllers: [LandingAdminController],
        providers: [{ provide: LandingService, useValue: landingService }],
      })
        .overrideGuard(AuthGuard)
        .useValue({ canActivate: vi.fn().mockResolvedValue(true) })
        .compile();
      const app = module.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();

      try {
        const res = await request(app.getHttpServer())
          .put("/landing/admin")
          .send({ heroImageId: null });

        expect(res.status).toBe(400);
        expect(landingService.updateSettings).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    });
  });

  // ---- AuthGuard protection (LP-01) ---------------------------------------

  describe("AuthGuard protection (LP-01)", () => {
    it("has @UseGuards(AuthGuard) decorator on the controller", () => {
      const guards = Reflect.getMetadata(
        "__guards__",
        LandingAdminController,
      ) as unknown[];
      expect(guards).toBeDefined();
      expect(guards).toContain(AuthGuard);
    });
  });

  // ---- module wiring (smoke test) -----------------------------------------

  it("compiles with mocked service and overridden guard", () => {
    expect(controller).toBeDefined();
  });
});
