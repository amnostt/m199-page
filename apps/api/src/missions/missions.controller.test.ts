import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { AuthGuard } from "../auth/auth.guard.js";
import { AuthInterceptor } from "../auth/auth.interceptor.js";
import { MissionsAdminController } from "./missions-admin.controller.js";
import { MissionsPublicController } from "./missions-public.controller.js";
import { MissionsService } from "./missions.service.js";

const row = {
  id: "m-1",
  slug: "one",
  title: "One",
  heroImageId: "f-1",
  profileImageId: null,
  heroPhrase: "Go",
  status: "ACTIVE",
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function createApp(guard: {
  canActivate: () => boolean | Promise<boolean>;
}) {
  const service = {
    findByStatus: vi.fn().mockResolvedValue([row]),
    findPublicByStatus: vi.fn().mockResolvedValue([
      {
        id: row.id,
        slug: row.slug,
        title: row.title,
        heroImageUrl: "/files/f-1",
        profileImageUrl: null,
        heroPhrase: row.heroPhrase,
        status: row.status,
      },
    ]),
    findManyPublic: vi.fn().mockResolvedValue({
      items: [],
      page: 1,
      limit: 10,
      total: 0,
      hasMore: false,
    }),
    findOnePublicBySlug: vi.fn().mockResolvedValue({
      id: row.id,
      slug: row.slug,
      title: row.title,
      heroImageUrl: "/files/f-1",
      profileImageUrl: null,
      heroPhrase: row.heroPhrase,
      status: row.status,
      finished: false,
    }),
    create: vi.fn().mockResolvedValue(row),
    update: vi.fn().mockResolvedValue(row),
    updateStatus: vi.fn().mockResolvedValue(row),
  } as unknown as MissionsService;
  const module = await Test.createTestingModule({
    controllers: [MissionsAdminController, MissionsPublicController],
    providers: [
      { provide: MissionsService, useValue: service },
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
    .useValue(guard)
    .compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return { app, service };
}

describe("Mission route boundaries", () => {
  it("exposes exact public lists without auth or origin", async () => {
    const { app, service } = await createApp({
      canActivate: vi.fn().mockReturnValue(true),
    });
    try {
      await request(app.getHttpServer()).get("/missions/active").expect(200);
      await request(app.getHttpServer()).get("/missions/archived").expect(200);
      await request(app.getHttpServer())
        .get("/missions/public?page=1&limit=10")
        .expect(200);
      await request(app.getHttpServer())
        .get("/missions/public/one")
        .expect(200);
      expect(service.findPublicByStatus).toHaveBeenCalledWith("ACTIVE");
      expect(service.findPublicByStatus).toHaveBeenCalledWith("ARCHIVED");
    } finally {
      await app.close();
    }
  });

  it("serves active and archived public details and 404s unknown slugs", async () => {
    const { app, service } = await createApp({
      canActivate: vi.fn().mockReturnValue(false),
    });
    service.findOnePublicBySlug = vi
      .fn()
      .mockResolvedValueOnce({
        ...row,
        heroImageUrl: "/files/f-1",
        profileImageUrl: null,
        finished: false,
      })
      .mockResolvedValueOnce({
        ...row,
        status: "ARCHIVED",
        heroImageUrl: "/files/f-1",
        profileImageUrl: null,
        finished: true,
      })
      .mockRejectedValueOnce(new NotFoundException());
    try {
      await request(app.getHttpServer())
        .get("/missions/public/one")
        .expect(200)
        .expect(({ body }) => expect(body.finished).toBe(false));
      await request(app.getHttpServer())
        .get("/missions/public/two")
        .expect(200)
        .expect(({ body }) => expect(body.finished).toBe(true));
      await request(app.getHttpServer())
        .get("/missions/public/missing")
        .expect(404);
      expect(service.findManyPublic).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("protects every admin route and does not expose delete/detail/gallery routes", async () => {
    const { app } = await createApp({
      canActivate: vi.fn().mockReturnValue(false),
    });
    try {
      await request(app.getHttpServer())
        .get("/missions/admin/active")
        .expect(403);
      await request(app.getHttpServer())
        .post("/missions/admin")
        .send({})
        .expect(403);
      await request(app.getHttpServer()).delete("/missions/m-1").expect(404);
      await request(app.getHttpServer()).get("/missions/m-1").expect(404);
      await request(app.getHttpServer())
        .get("/missions/m-1/gallery")
        .expect(404);
    } finally {
      await app.close();
    }
  });

  it.each([
    ["page=0", "page=0"],
    ["nonnumeric page", "page=abc"],
    ["limit=51", "limit=51"],
    ["nonnumeric limit", "limit=abc"],
  ])("rejects invalid public pagination: %s", async (_label, query) => {
    const { app } = await createApp({
      canActivate: vi.fn().mockReturnValue(true),
    });
    try {
      await request(app.getHttpServer())
        .get(`/missions/public?${query}`)
        .expect(400);
    } finally {
      await app.close();
    }
  });

  it("routes admin mutations to the service with validated payloads", async () => {
    const { app, service } = await createApp({
      canActivate: vi.fn().mockReturnValue(true),
    });
    try {
      await request(app.getHttpServer())
        .post("/missions/admin")
        .send({
          title: "One",
          slug: "one",
          heroImageId: "f-1",
          heroPhrase: "Go",
        })
        .set("Origin", "http://localhost:3000")
        .expect(201);
      await request(app.getHttpServer())
        .patch("/missions/admin/m-1")
        .send({ title: "Updated" })
        .set("Origin", "http://localhost:3000")
        .expect(200);
      await request(app.getHttpServer())
        .patch("/missions/admin/m-1/status")
        .send({ status: "ARCHIVED" })
        .set("Origin", "http://localhost:3000")
        .expect(200);
      expect(service.create).toHaveBeenCalled();
      expect(service.update).toHaveBeenCalledWith("m-1", { title: "Updated" });
      expect(service.updateStatus).toHaveBeenCalledWith("m-1", "ARCHIVED");
    } finally {
      await app.close();
    }
  });

  it.each([undefined, "https://evil.example"])(
    "rejects admin mutation with %s Origin through AuthInterceptor",
    async (origin) => {
      const { app, service } = await createApp({
        canActivate: vi.fn().mockReturnValue(true),
      });
      try {
        const req = request(app.getHttpServer()).post("/missions/admin").send({
          title: "One",
          slug: "one",
          heroImageId: "f-1",
          heroPhrase: "Go",
        });
        if (origin) req.set("Origin", origin);
        await req.expect(403);
        expect(service.create).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    },
  );
});
