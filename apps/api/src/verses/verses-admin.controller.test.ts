/**
 * VersesAdminController tests — Daily Verse (Task 3.1).
 *
 * Proves admin routes are behind AuthGuard, delegate correctly to
 * VersesService, and validate inputs (whitelist rejects date/time fields).
 *
 * Follows posts-admin.controller.test.ts pattern:
 * Test.createTestingModule with mocked VersesService and overridden AuthGuard.
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { VersesAdminController } from "./verses-admin.controller.js";
import { VersesService } from "./verses.service.js";
import { AuthGuard } from "../auth/auth.guard.js";

// ---- test data ------------------------------------------------------------

const NOW = new Date("2026-07-06T12:00:00.000Z");
const PERU_DATE = new Date("2026-07-06T00:00:00.000Z");

const SAMPLE_VERSE = {
  id: "v-001",
  text: "Todo lo puedo en Cristo que me fortalece",
  reference: "Filipenses 4:13",
  date: PERU_DATE,
  publishedAt: NOW,
  status: "PUBLISHED" as const,
  createdById: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const VERSE_2 = {
  id: "v-002",
  text: "El Señor es mi pastor",
  reference: "Salmos 23:1",
  date: new Date("2026-07-05T00:00:00.000Z"),
  publishedAt: new Date("2026-07-05T10:00:00.000Z"),
  status: "PUBLISHED" as const,
  createdById: null,
  createdAt: new Date("2026-07-05T10:00:00.000Z"),
  updatedAt: new Date("2026-07-05T10:00:00.000Z"),
};

// ---- helpers --------------------------------------------------------------

function mockVersesService(): VersesService {
  return {
    create: vi.fn().mockResolvedValue(SAMPLE_VERSE),
    delete: vi.fn().mockResolvedValue(undefined),
    findAll: vi.fn().mockResolvedValue([SAMPLE_VERSE, VERSE_2]),
    getLatest: vi.fn().mockResolvedValue(SAMPLE_VERSE),
    getHistory: vi.fn().mockResolvedValue([VERSE_2]),
  } as unknown as VersesService;
}

async function createAppWithAuth(
  guardValue: boolean,
): Promise<{ app: INestApplication; service: VersesService }> {
  const service = mockVersesService();

  const module = await Test.createTestingModule({
    controllers: [VersesAdminController],
    providers: [{ provide: VersesService, useValue: service }],
  })
    .overrideGuard(AuthGuard)
    .useValue({ canActivate: vi.fn().mockResolvedValue(guardValue) })
    .compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  return { app, service };
}

// ---- tests ----------------------------------------------------------------

describe("VersesAdminController", () => {
  // -- Auth guard (unit, no HTTP layer needed) ------------------------------

  describe("POST /verses/admin — auth", () => {
    it("returns 201 when authenticated", async () => {
      const { app, service } = await createAppWithAuth(true);

      const res = await request(app.getHttpServer())
        .post("/verses/admin")
        .send({ text: "Test verse", reference: "John 1:1" });

      expect(res.status).toBe(201);
      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "Test verse",
          reference: "John 1:1",
        }),
      );
    });

    it("returns 403 when guard rejects", async () => {
      const { app } = await createAppWithAuth(false);

      const res = await request(app.getHttpServer())
        .post("/verses/admin")
        .send({ text: "Test", reference: "Ref" });

      // NestJS returns 403 Forbidden when a guard's canActivate resolves to false
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /verses/admin/:id — auth", () => {
    it("returns 204 when authenticated", async () => {
      const { app, service } = await createAppWithAuth(true);

      const res = await request(app.getHttpServer()).delete(
        "/verses/admin/v-001",
      );

      expect(res.status).toBe(204);
      expect(service.delete).toHaveBeenCalledWith("v-001");
    });

    it("returns 403 when guard rejects", async () => {
      const { app } = await createAppWithAuth(false);

      const res = await request(app.getHttpServer()).delete(
        "/verses/admin/v-001",
      );

      expect(res.status).toBe(403);
    });
  });

  describe("GET /verses/admin — auth", () => {
    it("returns 200 with verse list when authenticated", async () => {
      const { app, service } = await createAppWithAuth(true);

      const res = await request(app.getHttpServer()).get("/verses/admin");

      expect(res.status).toBe(200);
      expect(service.findAll).toHaveBeenCalled();
      expect(res.body).toHaveLength(2);
    });

    it("returns 403 when guard rejects", async () => {
      const { app } = await createAppWithAuth(false);

      const res = await request(app.getHttpServer()).get("/verses/admin");

      expect(res.status).toBe(403);
    });
  });

  // -- DTO validation -------------------------------------------------------

  describe("POST /verses/admin — validation", () => {
    it("accepts valid text and reference", async () => {
      const { app } = await createAppWithAuth(true);

      const res = await request(app.getHttpServer())
        .post("/verses/admin")
        .send({ text: "A verse", reference: "Psalm 1:1" });

      expect(res.status).toBe(201);
    });

    it("rejects empty text", async () => {
      const { app } = await createAppWithAuth(true);

      const res = await request(app.getHttpServer())
        .post("/verses/admin")
        .send({ text: "", reference: "Psalm 1:1" });

      expect(res.status).toBe(400);
    });

    it("rejects empty reference", async () => {
      const { app } = await createAppWithAuth(true);

      const res = await request(app.getHttpServer())
        .post("/verses/admin")
        .send({ text: "A verse", reference: "" });

      expect(res.status).toBe(400);
    });

    it("whitelist: strips date property if sent by client", async () => {
      const { app, service } = await createAppWithAuth(true);

      await request(app.getHttpServer())
        .post("/verses/admin")
        .send({ text: "Safe", reference: "Ref", date: "2026-01-01" });

      // The service should have received only text and reference
      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ text: "Safe", reference: "Ref" }),
      );
      // The DTO must not have date property
      const callArg = (service.create as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty("date");
    });

    it("whitelist: strips publishedAt property if sent by client", async () => {
      const { app, service } = await createAppWithAuth(true);

      await request(app.getHttpServer()).post("/verses/admin").send({
        text: "Safe",
        reference: "Ref",
        publishedAt: new Date().toISOString(),
      });

      const callArg = (service.create as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty("publishedAt");
    });

    it("rejects missing text", async () => {
      const { app } = await createAppWithAuth(true);

      const res = await request(app.getHttpServer())
        .post("/verses/admin")
        .send({ reference: "Psalm 1:1" });

      expect(res.status).toBe(400);
    });

    it("rejects missing reference", async () => {
      const { app } = await createAppWithAuth(true);

      const res = await request(app.getHttpServer())
        .post("/verses/admin")
        .send({ text: "A verse" });

      expect(res.status).toBe(400);
    });
  });
});
