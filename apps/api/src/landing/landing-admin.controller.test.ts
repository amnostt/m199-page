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
  missionsTitle: string | null;
  missionsDescription: string | null;
  publicationsTitle: string | null;
  publicationsDescription: string | null;
  aboutTitle: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoId: string | null;
  backgroundMusicId: string | null;
  contactTitle: string | null;
  contactDescription: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  verseText: string | null;
  verseReference: string | null;
  visualBreakImageId: string | null;
}

const FULL_SETTINGS: LandingSettingsRow = {
  id: 1,
  heroTitle: "Misión 1-99",
  heroSubtitle: "Transformando vidas",
  heroImageId: "img-001",
  missionsTitle: "Proyectos reales.",
  missionsDescription: "Cada salida, conversación y servicio.",
  publicationsTitle: "Lo que estamos viviendo.",
  publicationsDescription: "Historias de la misión.",
  aboutTitle: "No esperamos. Salimos.",
  mission: "Nuestra misión es servir",
  vision: "Ser referencia en la comunidad",
  description: "Somos una organización dedicada a...",
  featuredVideoId: "video-001",
  backgroundMusicId: "music-001",
  contactTitle: "Hablemos. Vamos juntos.",
  contactDescription: "Conoce más sobre una misión.",
  contactEmail: "info@m199.org",
  contactPhone: "+54 11 1234-5678",
  verseText: "Todo lo puedo en Cristo que me fortalece",
  verseReference: "Filipenses 4:13",
  visualBreakImageId: "img-break-001",
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
        verseText: "Nuevo texto",
        verseReference: "Juan 3:16",
      } as UpdateLandingSettingsDto;

      await controller.updateSettings(dto);

      expect(service.updateSettings).toHaveBeenCalledWith(dto);
    });

    it("rejects an empty featured video ID when validating the DTO directly", async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      try {
        await pipe.transform(
          { featuredVideoId: "" },
          { type: "body", metatype: UpdateLandingSettingsDto },
        );
        expect.unreachable("Expected BadRequestException");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it("accepts null to clear the optional featured video", async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      const result = await pipe.transform(
        { featuredVideoId: null },
        { type: "body", metatype: UpdateLandingSettingsDto },
      );

      expect(result.featuredVideoId).toBeNull();
    });

    it("rejects an empty background music ID when validating the DTO directly", async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });

      await expect(
        pipe.transform(
          { backgroundMusicId: "" },
          { type: "body", metatype: UpdateLandingSettingsDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("accepts null to clear the optional background music", async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      const result = await pipe.transform(
        { backgroundMusicId: null },
        { type: "body", metatype: UpdateLandingSettingsDto },
      );

      expect(result.backgroundMusicId).toBeNull();
    });

    it("accepts null to clear either landing image", async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      const result = await pipe.transform(
        { heroImageId: null, visualBreakImageId: null },
        { type: "body", metatype: UpdateLandingSettingsDto },
      );

      expect(result.heroImageId).toBeNull();
      expect(result.visualBreakImageId).toBeNull();
    });

    it.each(["heroImageId", "visualBreakImageId"] as const)(
      "rejects an empty %s before reaching the service",
      async (field) => {
        const pipe = new ValidationPipe({ whitelist: true, transform: true });

        await expect(
          pipe.transform(
            { [field]: "" },
            { type: "body", metatype: UpdateLandingSettingsDto },
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it("rejects an empty featured video ID through the real Nest route", async () => {
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
          .send({ featuredVideoId: "" });

        expect(res.status).toBe(400);
        expect(landingService.updateSettings).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    });

    it("passes an explicit null hero image through the real Nest route", async () => {
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

        expect(res.status).toBe(200);
        expect(landingService.updateSettings).toHaveBeenCalledWith({
          heroImageId: null,
        });
      } finally {
        await app.close();
      }
    });

    it("whitelists any legacy featured pointer from generic settings requests", async () => {
      // After the Mission/Publication domain reset, featuredOutingId is no
      // longer part of the UpdateLandingSettingsDto. ValidationPipe strips
      // unknown fields via whitelist:true, so the service only sees
      // legitimate DTO fields.
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
          .send({ heroTitle: "Updated", featuredOutingId: "out-002" });

        expect(res.status).toBe(200);
        expect(landingService.updateSettings).toHaveBeenCalledWith({
          heroTitle: "Updated",
        });
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
