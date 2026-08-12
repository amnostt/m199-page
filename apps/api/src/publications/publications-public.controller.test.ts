import { Test } from "@nestjs/testing";
import request from "supertest";
import { ValidationPipe } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PublicationsPublicController } from "./publications-public.controller.js";
import { PublicationsService } from "./publications.service.js";

describe("PublicationsPublicController", () => {
  it("serves the exact public JSON contract without authentication", async () => {
    const service = {
      findManyPublic: vi.fn().mockResolvedValue({
        items: [
          {
            slug: "published",
            title: "Published",
            excerpt: "Excerpt",
            type: "POST",
            publishedAt: "2026-01-01T00:00:00.000Z",
            featuredImageUrl: null,
          },
        ],
        page: 2,
        limit: 1,
        total: 2,
        hasMore: true,
      }),
    };
    const module = await Test.createTestingModule({
      controllers: [PublicationsPublicController],
      providers: [{ provide: PublicationsService, useValue: service }],
    }).compile();
    const app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    try {
      const response = await request(app.getHttpServer())
        .get("/publications/public?page=2&limit=1")
        .expect(200);
      expect(response.body).toEqual(expect.objectContaining({ page: 2, limit: 1, total: 2, hasMore: true }));
      expect(Object.keys(response.body.items[0]).sort()).toEqual([
        "excerpt", "featuredImageUrl", "publishedAt", "slug", "title", "type",
      ]);
      expect(service.findManyPublic).toHaveBeenCalledWith({ page: 2, limit: 1 });
    } finally {
      await app.close();
    }
  });

  it("delegates the unauthenticated public list", async () => {
    const service = {
      findManyPublic: vi
        .fn()
        .mockResolvedValue({
          items: [],
          page: 1,
          limit: 10,
          total: 0,
          hasMore: false,
        }),
    };
    const result = await new PublicationsPublicController(
      service as never,
    ).findMany({ page: 1, limit: 10 });
    expect(service.findManyPublic).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result.total).toBe(0);
  });
});
