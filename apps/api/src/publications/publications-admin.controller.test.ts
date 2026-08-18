import { Test } from "@nestjs/testing";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { AuthGuard } from "../auth/auth.guard.js";
import { AuthInterceptor } from "../auth/auth.interceptor.js";
import { PublicationsAdminController } from "./publications-admin.controller.js";
import { PublicationsService } from "./publications.service.js";

const row = { id: "pub-1", slug: "hello", missionIds: [] };

async function createApp(canActivate: () => boolean | Promise<boolean>) {
  const service = {
    findMany: vi.fn().mockResolvedValue([row]),
    findOne: vi.fn().mockResolvedValue(row),
    create: vi.fn().mockResolvedValue(row),
    update: vi.fn().mockResolvedValue(row),
    updateStatus: vi.fn().mockResolvedValue(row),
    remove: vi.fn().mockResolvedValue(undefined),
  } as unknown as PublicationsService;
  const module = await Test.createTestingModule({
    controllers: [PublicationsAdminController],
    providers: [
      { provide: PublicationsService, useValue: service },
      {
        provide: ConfigService,
        useValue: {
          get: (key: string, fallback?: unknown) =>
            key === "PORT" ? 3000 : fallback,
        },
      },
      { provide: APP_INTERCEPTOR, useClass: AuthInterceptor },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue({ canActivate })
    .compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return { app, service };
}

describe("Publications admin route boundary", () => {
  it("protects every route with AuthGuard", async () => {
    const { app } = await createApp(() => false);
    try {
      await request(app.getHttpServer()).get("/publications/admin").expect(403);
      await request(app.getHttpServer())
        .post("/publications/admin")
        .expect(403);
      await request(app.getHttpServer())
        .delete("/publications/admin/pub-1")
        .expect(403);
    } finally {
      await app.close();
    }
  });

  it("routes validated CRUD and returns 204 for delete", async () => {
    const { app, service } = await createApp(() => true);
    try {
      const origin = { Origin: "http://localhost:3000" };
      await request(app.getHttpServer())
        .get("/publications/admin?status=DRAFT")
        .expect(200);
      await request(app.getHttpServer())
        .get("/publications/admin/pub-1")
        .expect(200);
      await request(app.getHttpServer())
        .post("/publications/admin")
        .set(origin)
        .send({})
        .expect(400);
      await request(app.getHttpServer())
        .patch("/publications/admin/pub-1")
        .set(origin)
        .send({ title: "Updated" })
        .expect(200);
      await request(app.getHttpServer())
        .patch("/publications/admin/pub-1/status")
        .set(origin)
        .send({ status: "PUBLISHED" })
        .expect(200);
      await request(app.getHttpServer())
        .delete("/publications/admin/pub-1")
        .set(origin)
        .expect(204);
      expect(service.findMany).toHaveBeenCalledWith("DRAFT");
      expect(service.update).toHaveBeenCalledWith("pub-1", {
        title: "Updated",
      });
      expect(service.updateStatus).toHaveBeenCalledWith("pub-1", "PUBLISHED");
      expect(service.remove).toHaveBeenCalledWith("pub-1");
    } finally {
      await app.close();
    }
  });

  it.each([undefined, "https://evil.example"])(
    "rejects mutation with %s Origin",
    async (origin) => {
      const { app, service } = await createApp(() => true);
      try {
        const req = request(app.getHttpServer()).delete(
          "/publications/admin/pub-1",
        );
        if (origin) req.set("Origin", origin);
        await req.expect(403);
        expect(service.remove).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    },
  );
});
