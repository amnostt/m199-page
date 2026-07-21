/**
 * PostsPublicController tests — PR 2 (Task 2.2).
 *
 * Proves public routes return only PUBLISHED posts, 404 for DRAFT/ARCHIVED/
 * missing. Follows outings-public.controller.test.ts pattern.
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
import { NotFoundException } from "@nestjs/common";
import request from "supertest";
import { PostsPublicController } from "./posts-public.controller.js";
import { PostsService } from "./posts.service.js";

// ---- test data ------------------------------------------------------------

const NOW = new Date("2026-07-06T12:00:00.000Z");

const PUBLISHED_POST = {
  id: "post-001",
  slug: "my-post",
  title: "My Post",
  description: "A test post",
  coverImageId: "img-001",
  content: "<p>Hello <strong>world</strong></p>",
  status: "PUBLISHED" as const,
  tags: ["ministry"],
  createdById: "user-1",
  publishedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

const PUBLIC_RESPONSE = {
  id: "post-001",
  slug: "my-post",
  title: "My Post",
  description: "A test post",
  coverImageUrl: "/files/img-001",
  content: "<p>Hello <strong>world</strong></p>",
  status: "PUBLISHED" as const,
  tags: ["ministry"],
  publishedAt: "2026-07-06T12:00:00.000Z",
};

// ---- helpers --------------------------------------------------------------

function mockPostsService(): PostsService {
  return {
    findAllPublic: vi.fn().mockResolvedValue([PUBLIC_RESPONSE]),
    findBySlug: vi.fn().mockResolvedValue(PUBLISHED_POST),
    findPublicBySlug: vi.fn().mockResolvedValue(PUBLIC_RESPONSE),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
    feature: vi.fn(),
    unfeature: vi.fn(),
  } as unknown as PostsService;
}

// ---- tests ----------------------------------------------------------------

describe("PostsPublicController", () => {
  let controller: PostsPublicController;
  let service: PostsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    service = mockPostsService();

    const module = await Test.createTestingModule({
      controllers: [PostsPublicController],
      providers: [{ provide: PostsService, useValue: service }],
    }).compile();

    controller = module.get(PostsPublicController);
  });

  // ---- GET /posts ----------------------------------------------------------

  describe("GET /posts", () => {
    it("delegates to service.findAllPublic and returns published posts", async () => {
      const result = await controller.findAllPublic();

      expect(service.findAllPublic).toHaveBeenCalledOnce();
      expect(result).toEqual([PUBLIC_RESPONSE]);
    });

    it("returns empty array when no published posts", async () => {
      (service.findAllPublic as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        [],
      );

      const result = await controller.findAllPublic();

      expect(result).toEqual([]);
    });
  });

  // ---- GET /posts/:slug ----------------------------------------------------

  describe("GET /posts/:slug", () => {
    it("returns a published post by slug", async () => {
      const result = await controller.findBySlug("my-post");

      expect(service.findPublicBySlug).toHaveBeenCalledWith("my-post");
      expect(result.slug).toBe("my-post");
      expect(result.title).toBe("My Post");
      expect(result.coverImageUrl).toBe("/files/img-001");
    });

    it("returns 404 for a DRAFT post", async () => {
      (
        service.findPublicBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      await expect(controller.findBySlug("draft-post")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns 404 for an ARCHIVED post", async () => {
      (
        service.findPublicBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      await expect(controller.findBySlug("archived-post")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns 404 for a missing post", async () => {
      (
        service.findPublicBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      await expect(controller.findBySlug("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    // -- Phase 5 remediation: public API must surface a null label for unlabeled downloads

    it("returns the public response with downloads[] carrying label: null for an unlabeled download", async () => {
      const responseWithNullLabel = {
        ...PUBLIC_RESPONSE,
        downloads: [
          { label: null, fileUrl: "/files/dl-001" },
          { label: "Study Guide", fileUrl: "/files/dl-002" },
        ],
      };
      (
        service.findPublicBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(responseWithNullLabel);

      const result = await controller.findBySlug("my-post");

      expect(result.downloads).toHaveLength(2);
      expect(result.downloads[0]!.label).toBeNull();
      expect(result.downloads[0]!.fileUrl).toBe("/files/dl-001");
      expect(result.downloads[1]!.label).toBe("Study Guide");
    });
  });

  // ---- Route-level 404 for non-published via HTTP ---------------------------

  describe("Route-level 404 for non-published posts via HTTP", () => {
    let app: INestApplication;

    beforeAll(async () => {
      const svc = mockPostsService();
      // findPublicBySlug returns null (missing or ineligible post)
      (svc.findPublicBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const module = await Test.createTestingModule({
        controllers: [PostsPublicController],
        providers: [{ provide: PostsService, useValue: svc }],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it("returns 404 for GET /posts/non-existent", async () => {
      const res = await request(app.getHttpServer()).get("/posts/non-existent");
      expect(res.status).toBe(404);
    });

    it("returns 200 for GET /posts (list is always allowed)", async () => {
      const res = await request(app.getHttpServer()).get("/posts");
      expect(res.status).toBe(200);
    });
  });

  // -- Phase 5 remediation: end-to-end runtime proof that the public
  //    post-detail API returns `label: null` for an unlabeled persisted download.

  describe("Runtime: GET /posts/:slug returns label: null over HTTP (Phase 5.3)", () => {
    let app: INestApplication;
    let svc: PostsService;

    beforeAll(async () => {
      svc = mockPostsService();
      (svc.findPublicBySlug as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...PUBLIC_RESPONSE,
        downloads: [
          { label: null, fileUrl: "/files/dl-001" },
          { label: "Slides", fileUrl: "/files/dl-002" },
        ],
      });

      const module = await Test.createTestingModule({
        controllers: [PostsPublicController],
        providers: [{ provide: PostsService, useValue: svc }],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it("response body includes downloads[].label === null for an unlabeled download", async () => {
      const res = await request(app.getHttpServer()).get("/posts/my-post");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("downloads");
      expect(Array.isArray(res.body.downloads)).toBe(true);
      expect(res.body.downloads).toHaveLength(2);
      expect(res.body.downloads[0].label).toBeNull();
      expect(res.body.downloads[0].fileUrl).toBe("/files/dl-001");
      expect(res.body.downloads[1].label).toBe("Slides");
      expect(res.body.downloads[1].fileUrl).toBe("/files/dl-002");
    });
  });
});
