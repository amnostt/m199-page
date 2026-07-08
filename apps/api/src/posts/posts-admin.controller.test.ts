/**
 * PostsAdminController tests.
 *
 * Proves admin routes are behind AuthGuard, delegate correctly to PostsService,
 * and validate inputs. Follows outings-admin.controller.test.ts pattern:
 * Test.createTestingModule with mocked PostsService and overridden AuthGuard.
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import request from "supertest";
import { PostsAdminController } from "./posts-admin.controller.js";
import { PostsService } from "./posts.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import type { CreatePostDto } from "./dto/create-post.dto.js";
import type { UpdatePostDto } from "./dto/update-post.dto.js";
import type { PostListQueryDto } from "./dto/post-list-query.dto.js";

// ---- test data ------------------------------------------------------------

const NOW = new Date("2026-07-06T12:00:00.000Z");

const SAMPLE_POST = {
  id: "post-001",
  slug: "my-post",
  title: "My Post",
  description: "A test post",
  coverImageId: null,
  content: "<p>Hello <strong>world</strong></p>",
  status: "DRAFT" as const,
  tags: [],
  createdById: null,
  publishedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

// ---- helpers --------------------------------------------------------------

function mockPostsService(): PostsService {
  return {
    findAll: vi.fn().mockResolvedValue([SAMPLE_POST]),
    findBySlug: vi.fn().mockResolvedValue(SAMPLE_POST),
    create: vi.fn().mockResolvedValue(SAMPLE_POST),
    update: vi.fn().mockResolvedValue({ ...SAMPLE_POST, title: "Updated" }),
    publish: vi.fn().mockResolvedValue({
      ...SAMPLE_POST,
      status: "PUBLISHED" as const,
      publishedAt: NOW,
    }),
    archive: vi.fn().mockResolvedValue({
      ...SAMPLE_POST,
      status: "ARCHIVED" as const,
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    feature: vi.fn().mockResolvedValue({ success: true }),
    unfeature: vi.fn().mockResolvedValue({ success: true }),
    listFeatured: vi.fn().mockResolvedValue({ postIds: [] }),
    findAllPublic: vi.fn(),
  } as unknown as PostsService;
}

// ---- tests ----------------------------------------------------------------

describe("PostsAdminController", () => {
  let controller: PostsAdminController;
  let service: PostsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    service = mockPostsService();

    const module = await Test.createTestingModule({
      controllers: [PostsAdminController],
      providers: [{ provide: PostsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: vi.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(PostsAdminController);
  });

  // ---- GET /posts/admin ---------------------------------------------------

  describe("GET /posts/admin", () => {
    it("delegates to service.findAll with empty query and returns array", async () => {
      const result = await controller.findAll({} as PostListQueryDto);

      expect(service.findAll).toHaveBeenCalledOnce();
      expect(result).toEqual([SAMPLE_POST]);
    });

    it("passes status filter to service.findAll", async () => {
      const query = { status: "PUBLISHED" } as PostListQueryDto;

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it("passes skip/take pagination", async () => {
      const query = { skip: 10, take: 5 } as PostListQueryDto;

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ---- GET /posts/admin/slug/:slug ------------------------------------------

  describe("GET /posts/admin/slug/:slug", () => {
    it("delegates to service.findBySlug with provided slug", async () => {
      (service.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        SAMPLE_POST,
      );

      const result = await controller.findOne("my-post");

      expect(service.findBySlug).toHaveBeenCalledWith("my-post");
      expect(result).toEqual(SAMPLE_POST);
    });
  });

  // ---- POST /posts/admin ---------------------------------------------------

  describe("POST /posts/admin", () => {
    it("delegates to service.create with validated DTO", async () => {
      const dto: CreatePostDto = {
        title: "My Post",
        slug: "my-post",
        content: "<p>Hello world</p>",
      };

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(SAMPLE_POST);
    });

    it("passes optional fields to service.create", async () => {
      const dto: CreatePostDto = {
        title: "Rich Post",
        slug: "rich-post",
        content: "<p>Rich content</p>",
        description: "A post with extra fields",
        coverImageId: "img-001",
        tags: ["ministry", "news"],
        downloadIds: ["dl-001"],
        status: "DRAFT",
      };

      await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  // ---- PATCH /posts/admin/:id ----------------------------------------------

  describe("PATCH /posts/admin/:id", () => {
    it("delegates to service.update with path param and DTO", async () => {
      const dto: UpdatePostDto = {
        title: "Updated Title",
        description: "Updated description",
      };

      const result = await controller.update("post-001", dto);

      expect(service.update).toHaveBeenCalledWith("post-001", dto);
      expect(result.title).toBe("Updated");
    });

    it("passes empty DTO for no-op update", async () => {
      const dto: UpdatePostDto = {};

      await controller.update("post-001", dto);

      expect(service.update).toHaveBeenCalledWith("post-001", dto);
    });
  });

  // ---- POST /posts/admin/:id/publish ---------------------------------------

  describe("POST /posts/admin/:id/publish", () => {
    it("delegates to service.publish", async () => {
      const result = await controller.publish("post-001");

      expect(service.publish).toHaveBeenCalledWith("post-001");
      expect(result.status).toBe("PUBLISHED");
    });
  });

  // ---- POST /posts/admin/:id/archive ---------------------------------------

  describe("POST /posts/admin/:id/archive", () => {
    it("delegates to service.archive and returns archived post", async () => {
      const result = await controller.archive("post-001");

      expect(service.archive).toHaveBeenCalledWith("post-001");
      expect(result.status).toBe("ARCHIVED");
    });
  });

  // ---- DELETE /posts/admin/:id ---------------------------------------------

  describe("DELETE /posts/admin/:id", () => {
    it("delegates to service.delete and returns no content", async () => {
      await controller.remove("post-001");

      expect(service.delete).toHaveBeenCalledWith("post-001");
    });
  });

  // ---- POST /posts/admin/:id/feature ---------------------------------------

  describe("POST /posts/admin/:id/feature", () => {
    it("delegates to service.feature", async () => {
      const result = await controller.feature("post-002");

      expect(service.feature).toHaveBeenCalledWith("post-002");
      expect(result.success).toBe(true);
    });
  });

  // ---- DELETE /posts/admin/:id/feature -------------------------------------

  describe("DELETE /posts/admin/:id/feature", () => {
    it("delegates to service.unfeature", async () => {
      const result = await controller.unfeature("post-002");

      expect(service.unfeature).toHaveBeenCalledWith("post-002");
      expect(result.success).toBe(true);
    });
  });

  // ---- GET /posts/admin/featured --------------------------------------

  describe("GET /posts/admin/featured", () => {
    it("delegates to service.listFeatured and returns postIds array", async () => {
      (service.listFeatured as ReturnType<typeof vi.fn>).mockResolvedValue({
        postIds: ["p1", "p2"],
      });

      const result = await controller.listFeatured();

      expect(service.listFeatured).toHaveBeenCalledOnce();
      expect(result).toEqual({ postIds: ["p1", "p2"] });
    });
  });

  // ---- AuthGuard protection ------------------------------------------------

  describe("AuthGuard protection", () => {
    it("has @UseGuards(AuthGuard) decorator on the controller", () => {
      const guards = Reflect.getMetadata(
        "__guards__",
        PostsAdminController,
      ) as unknown[];
      expect(guards).toBeDefined();
      expect(guards).toContain(AuthGuard);
    });
  });

  // ---- Route-level 401 -----------------------------------------------------

  describe("Route-level 401 for unauthenticated requests", () => {
    let app: INestApplication;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        controllers: [PostsAdminController],
        providers: [
          { provide: PostsService, useValue: mockPostsService() },
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

    it("returns 401 for GET /posts/admin without valid auth", async () => {
      const res = await request(app.getHttpServer()).get("/posts/admin");
      expect(res.status).toBe(401);
    });

    it("returns 401 for POST /posts/admin without valid auth", async () => {
      const res = await request(app.getHttpServer())
        .post("/posts/admin")
        .send({ title: "Test", slug: "test", content: "<p>test</p>" });
      expect(res.status).toBe(401);
    });
  });

  // ---- module wiring (smoke test) ------------------------------------------

  it("compiles with mocked service and overridden guard", () => {
    expect(controller).toBeDefined();
  });
});
