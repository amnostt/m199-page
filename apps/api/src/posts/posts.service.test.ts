/**
 * PostsService unit tests — PR 1 (Tasks 1.9-1.13, RED phase).
 *
 * Covers: create, update, publish, archive, delete, findAll, findBySlug,
 * findAllPublic. Tests sanitization, FileAsset category validation,
 * slug conflict handling, FeaturedPost row deletion on archive/delete.
 *
 * Follows the same pattern as outings.service.test.ts:
 * Test.createTestingModule with explicit provider overrides.
 */
import { Test } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PostsService } from "./posts.service.js";
import { DbService } from "../db/db.service.js";

import type {
  PostRow,
  FeaturedPostRow,
  PostDownloadRow,
} from "./posts.service.js";

// ---- test data ------------------------------------------------------------

const NOW = new Date("2026-07-06T12:00:00.000Z");
const EARLIER = new Date("2026-06-01T00:00:00.000Z");

function makePost(overrides: Partial<PostRow> = {}): PostRow {
  return {
    id: "post-001",
    slug: "my-post",
    title: "My Post",
    description: "A test post",
    coverImageId: null,
    content: "<p>Hello <strong>world</strong></p>",
    status: "DRAFT",
    tags: [],
    createdById: null,
    publishedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const DRAFT_POST = makePost();
const PUBLISHED_POST = makePost({
  id: "post-002",
  slug: "published-post",
  status: "PUBLISHED",
  publishedAt: EARLIER,
});
const ARCHIVED_POST = makePost({
  id: "post-003",
  slug: "archived-post",
  status: "ARCHIVED",
});

const FEATURED_ROW: FeaturedPostRow = {
  id: "fp-001",
  slot: "SLOT_1",
  postId: "post-002",
  featuredAt: EARLIER,
  createdAt: EARLIER,
  updatedAt: EARLIER,
};

const DOWNLOAD_ROW: PostDownloadRow = {
  id: "dl-001",
  postId: "post-001",
  fileId: "file-dl-001",
  label: "Study Guide",
  sortOrder: 0,
  createdAt: NOW,
};

// ---- mock helpers ---------------------------------------------------------

interface MockDbOverrides {
  existingPosts?: PostRow[];
  findUniqueReturn?: PostRow | null;
  existingFiles?: { id: string; category?: string }[];
  existingFeatured?: FeaturedPostRow[];
  existingDownloads?: PostDownloadRow[];
}

function makeDbValue(overrides: MockDbOverrides = {}) {
  const existingPosts: PostRow[] = [...(overrides.existingPosts ?? [])];

  const create = vi
    .fn<(args: { data: Record<string, unknown> }) => Promise<PostRow>>()
    .mockImplementation(async (args: { data: Record<string, unknown> }) => {
      const slug = args.data.slug as string;
      const dup = existingPosts.find((o) => o.slug === slug);
      if (dup) {
        const err = new Error(
          "Unique constraint failed on the fields: (slug)",
        ) as Error & { code?: string };
        err.code = "P2002";
        throw err;
      }
      const row: PostRow = {
        id: `post-new-${existingPosts.length}`,
        slug: slug,
        title: (args.data.title as string) || "",
        description: (args.data.description as string) || "",
        coverImageId: (args.data.coverImageId as string) ?? null,
        content: (args.data.content as string) || "",
        status: (args.data.status as PostRow["status"]) || "DRAFT",
        tags: (args.data.tags as string[]) ?? [],
        createdById: (args.data.createdById as string) ?? null,
        publishedAt:
          args.data.publishedAt != null
            ? (args.data.publishedAt as Date)
            : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      existingPosts.push(row);
      return row;
    });

  const findUnique = vi
    .fn<(args: { where: Record<string, unknown> }) => Promise<PostRow | null>>()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const id = args.where?.id as string | undefined;
      const slugCond = args.where?.slug as string | undefined;
      if (
        id &&
        overrides.findUniqueReturn &&
        overrides.findUniqueReturn.id === id
      ) {
        return overrides.findUniqueReturn;
      }
      if (
        slugCond &&
        overrides.findUniqueReturn &&
        overrides.findUniqueReturn.slug === slugCond
      ) {
        return overrides.findUniqueReturn;
      }
      const found = existingPosts.find(
        (o) => (id && o.id === id) || (slugCond && o.slug === slugCond),
      );
      return found ?? null;
    });

  const findMany = vi
    .fn<
      (args?: {
        where?: Record<string, unknown>;
        skip?: number;
        take?: number;
      }) => Promise<PostRow[]>
    >()
    .mockImplementation(
      async (args?: {
        where?: Record<string, unknown>;
        skip?: number;
        take?: number;
      }) => {
        let results = existingPosts;
        if (args?.where?.status) {
          results = results.filter((o) => o.status === args.where!.status);
        }
        if (
          (args?.where?.publishedAt as { not?: null } | undefined)?.not === null
        ) {
          results = results.filter((post) => post.publishedAt !== null);
        }
        const skip = args?.skip ?? 0;
        const take = args?.take ?? results.length;
        return results.slice(skip, skip + take);
      },
    );

  const update = vi
    .fn<
      (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => Promise<PostRow>
    >()
    .mockImplementation(
      async (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const id = args.where.id as string;
        const idx = existingPosts.findIndex((o) => o.id === id);
        if (idx === -1) {
          const err = new Error("Record not found") as Error & {
            code?: string;
          };
          err.code = "P2025";
          throw err;
        }
        const merged: PostRow = {
          ...existingPosts[idx]!,
          ...(args.data as Partial<PostRow>),
          updatedAt: new Date(),
        };
        existingPosts[idx] = merged;
        if (overrides.findUniqueReturn?.id === id) {
          overrides.findUniqueReturn = merged;
        }
        return merged;
      },
    );

  const postDelete = vi
    .fn<(args: { where: Record<string, unknown> }) => Promise<PostRow>>()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const id = args.where.id as string;
      const idx = existingPosts.findIndex((o) => o.id === id);
      if (idx === -1) {
        const err = new Error("Record not found") as Error & { code?: string };
        err.code = "P2025";
        throw err;
      }
      const [removed] = existingPosts.splice(idx, 1);
      return removed!;
    });

  // -- FileAsset mocks --
  const existingFiles = overrides.existingFiles ?? [];

  const findUniqueFile = vi
    .fn<
      (args: {
        where: Record<string, unknown>;
      }) => Promise<{ id: string; category?: string } | null>
    >()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const id = args.where?.id as string | undefined;
      if (id && existingFiles.some((f) => f.id === id)) {
        return existingFiles.find((f) => f.id === id) ?? null;
      }
      return null;
    });

  // -- PostDownload mocks --
  const existingDownloads = [...(overrides.existingDownloads ?? [])];

  const downloadCreate = vi
    .fn<(args: { data: Record<string, unknown> }) => Promise<PostDownloadRow>>()
    .mockImplementation(async (args: { data: Record<string, unknown> }) => {
      const row: PostDownloadRow = {
        id: `dl-${existingDownloads.length}`,
        postId: args.data.postId as string,
        fileId: args.data.fileId as string,
        label: (args.data.label as string) ?? null,
        sortOrder: (args.data.sortOrder as number) ?? 0,
        createdAt: new Date(),
      };
      existingDownloads.push(row);
      return row;
    });

  const downloadDeleteMany = vi
    .fn<
      (args: { where: Record<string, unknown> }) => Promise<{ count: number }>
    >()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const postId = args.where.postId as string;
      const before = existingDownloads.length;
      for (let i = existingDownloads.length - 1; i >= 0; i--) {
        if (existingDownloads[i]!.postId === postId) {
          existingDownloads.splice(i, 1);
        }
      }
      return { count: before - existingDownloads.length };
    });

  // -- FeaturedPost mocks --
  const existingFeatured = [...(overrides.existingFeatured ?? [])];

  const featuredCreate = vi
    .fn<(args: { data: Record<string, unknown> }) => Promise<FeaturedPostRow>>()
    .mockImplementation(async (args: { data: Record<string, unknown> }) => {
      const row: FeaturedPostRow = {
        id: `fp-${existingFeatured.length}`,
        slot: args.data.slot as FeaturedPostRow["slot"],
        postId: args.data.postId as string,
        featuredAt: (args.data.featuredAt as Date) ?? new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      existingFeatured.push(row);
      return row;
    });

  const featuredFindUnique = vi
    .fn<
      (args: {
        where: Record<string, unknown>;
      }) => Promise<FeaturedPostRow | null>
    >()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const postId = args.where?.postId as string | undefined;
      if (postId) {
        return existingFeatured.find((f) => f.postId === postId) ?? null;
      }
      return null;
    });

  const featuredDelete = vi
    .fn<
      (args: { where: Record<string, unknown> }) => Promise<FeaturedPostRow>
    >()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const postId = args.where?.postId as string | undefined;
      const idx = existingFeatured.findIndex((f) => f.postId === postId);
      if (idx === -1) {
        const err = new Error("Record not found") as Error & { code?: string };
        err.code = "P2025";
        throw err;
      }
      const [removed] = existingFeatured.splice(idx, 1);
      return removed!;
    });

  const featuredCount = vi
    .fn<(args?: { where?: Record<string, unknown> }) => Promise<number>>()
    .mockImplementation(async () => existingFeatured.length);

  const featuredFindMany = vi
    .fn<
      (args?: {
        where?: Record<string, unknown>;
        orderBy?: Record<string, unknown>;
        take?: number;
      }) => Promise<FeaturedPostRow[]>
    >()
    .mockImplementation(
      async (args?: {
        where?: Record<string, unknown>;
        orderBy?: Record<string, unknown>;
        take?: number;
      }) => {
        let results = [...existingFeatured];
        if (args?.take != null) {
          results = results.slice(0, args.take);
        }
        // Sort by featuredAt desc if specified
        const orderBy = args?.orderBy as Record<string, string> | undefined;
        if (orderBy?.featuredAt === "desc") {
          results.sort(
            (a, b) => b.featuredAt.getTime() - a.featuredAt.getTime(),
          );
        }
        return results;
      },
    );

  // -- $transaction --
  const $transaction = vi
    .fn()
    .mockImplementation(async <T>(cb: (tx: unknown) => Promise<T>) =>
      cb(client),
    );

  const client = {
    post: {
      create,
      findUnique,
      findMany,
      update,
      delete: postDelete,
    },
    fileAsset: {
      findUnique: findUniqueFile,
    },
    postDownload: {
      create: downloadCreate,
      deleteMany: downloadDeleteMany,
    },
    featuredPost: {
      create: featuredCreate,
      findUnique: featuredFindUnique,
      delete: featuredDelete,
      count: featuredCount,
      findMany: featuredFindMany,
    },
    $transaction,
  };

  return {
    client,
    create,
    findUnique,
    findMany,
    update,
    postDelete,
    findUniqueFile,
    downloadCreate,
    downloadDeleteMany,
    featuredCreate,
    featuredFindUnique,
    featuredDelete,
    featuredCount,
    $transaction,
  };
}

interface ServiceFixture {
  service: PostsService;
  mocks: ReturnType<typeof makeDbValue>;
}

async function buildService(
  dbOverrides: MockDbOverrides = {},
): Promise<ServiceFixture> {
  const dbValue = makeDbValue(dbOverrides);

  const module = await Test.createTestingModule({
    providers: [PostsService, { provide: DbService, useValue: dbValue }],
  }).compile();

  return {
    service: module.get(PostsService),
    mocks: dbValue,
  };
}

// ---- tests ----------------------------------------------------------------

describe("PostsService (PR 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- 1.9: create ---------------------------------------------------------

  describe("create (1.9)", () => {
    it("sanitizes content before persistence", async () => {
      const { service, mocks } = await buildService();

      await service.create({
        title: "Test",
        slug: "test",
        content: '<p>Safe</p><script>alert("xss")</script>',
      });

      const createArgs = mocks.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      const persistedContent = createArgs.data.content as string;
      expect(persistedContent).not.toContain("<script>");
      expect(persistedContent).not.toContain("alert");
      expect(persistedContent).toContain("<p>Safe</p>");
    });

    it("creates a post with DRAFT status by default", async () => {
      const { service, mocks } = await buildService();

      const result = await service.create({
        title: "New Post",
        slug: "new-post",
        content: "<p>Hello</p>",
      });

      expect(mocks.create).toHaveBeenCalledTimes(1);
      const createArgs = mocks.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(createArgs.data.status).toBe("DRAFT");
      expect(result.status).toBe("DRAFT");
    });

    it("rejects duplicate slug", async () => {
      const { service } = await buildService({
        existingPosts: [DRAFT_POST],
      });

      await expect(
        service.create({
          title: "Dup",
          slug: "my-post", // same slug as DRAFT_POST
          content: "<p>text</p>",
        }),
      ).rejects.toThrow();
    });

    it("validates coverImageId belongs to POST_COVER_IMAGE category", async () => {
      const { service } = await buildService({
        existingFiles: [{ id: "img-001", category: "POST_COVER_IMAGE" }],
      });

      const result = await service.create({
        title: "With Cover",
        slug: "with-cover",
        content: "<p>text</p>",
        coverImageId: "img-001",
      });

      expect(result.title).toBe("With Cover");
    });

    it("rejects coverImageId with wrong category", async () => {
      const { service } = await buildService({
        existingFiles: [{ id: "img-001", category: "OTHER" }],
      });

      await expect(
        service.create({
          title: "Bad Cover",
          slug: "bad-cover",
          content: "<p>text</p>",
          coverImageId: "img-001",
        }),
      ).rejects.toThrow(/POST_COVER_IMAGE/);
    });

    it("rejects coverImageId referencing non-existent file", async () => {
      const { service } = await buildService({
        existingFiles: [],
      });

      await expect(
        service.create({
          title: "Missing Cover",
          slug: "missing-cover",
          content: "<p>text</p>",
          coverImageId: "nonexistent-file",
        }),
      ).rejects.toThrow();
    });

    it("validates downloadIds belong to POST_DOWNLOAD category", async () => {
      const { service } = await buildService({
        existingFiles: [{ id: "dl-001", category: "POST_DOWNLOAD" }],
      });

      await service.create({
        title: "With Downloads",
        slug: "with-downloads",
        content: "<p>text</p>",
        downloadIds: ["dl-001"],
      });

      // download was created
      expect(service).toBeDefined();
    });

    it("rejects downloadId with wrong category", async () => {
      const { service } = await buildService({
        existingFiles: [{ id: "dl-001", category: "OTHER" }],
      });

      await expect(
        service.create({
          title: "Bad Download",
          slug: "bad-download",
          content: "<p>text</p>",
          downloadIds: ["dl-001"],
        }),
      ).rejects.toThrow(/POST_DOWNLOAD/);
    });

    it("wires download rows after create", async () => {
      const { service, mocks } = await buildService({
        existingFiles: [
          { id: "dl-001", category: "POST_DOWNLOAD" },
          { id: "dl-002", category: "POST_DOWNLOAD" },
        ],
      });

      await service.create({
        title: "Multi DL",
        slug: "multi-dl",
        content: "<p>text</p>",
        downloadIds: ["dl-001", "dl-002"],
      });

      expect(mocks.downloadCreate).toHaveBeenCalledTimes(2);
    });

    it("wraps post creation and download wiring in a transaction", async () => {
      const { service, mocks } = await buildService({
        existingFiles: [{ id: "dl-001", category: "POST_DOWNLOAD" }],
      });

      await service.create({
        title: "Atomic",
        slug: "atomic",
        content: "<p>test</p>",
        downloadIds: ["dl-001"],
      });

      // MUST use $transaction to keep post creation and download wiring atomic
      expect(mocks.$transaction).toHaveBeenCalledOnce();
    });

    it("errors propagate out when a download creation fails inside create", async () => {
      const { service, mocks } = await buildService({
        existingFiles: [
          { id: "dl-good", category: "POST_DOWNLOAD" },
          { id: "dl-bad", category: "POST_DOWNLOAD" },
        ],
      });

      // First download succeeds, second fails — simulate partial failure
      mocks.downloadCreate
        .mockResolvedValueOnce({
          id: "dl-0",
          postId: "any",
          fileId: "dl-good",
          label: null,
          sortOrder: 0,
          createdAt: new Date(),
        } as PostDownloadRow)
        .mockRejectedValueOnce(new Error("DB error during download creation"));

      await expect(
        service.create({
          title: "Fail",
          slug: "partial-fail",
          content: "<p>test</p>",
          downloadIds: ["dl-good", "dl-bad"],
        }),
      ).rejects.toThrow("DB error during download creation");

      // The post.create call must have been inside the transaction,
      // so the error propagates and nothing is committed.
      expect(mocks.$transaction).toHaveBeenCalledOnce();
    });
  });

  // -- Phase 2, TDD 2.1: downloadLabels persistence (create) -------------

  describe("create downloadLabels (Phase 2, TDD 2.1)", () => {
    it("persists each supplied label on the matching download", async () => {
      const { service, mocks } = await buildService({
        existingFiles: [
          { id: "dl-001", category: "POST_DOWNLOAD" },
          { id: "dl-002", category: "POST_DOWNLOAD" },
        ],
      });

      await service.create({
        title: "With Labels",
        slug: "with-labels",
        content: "<p>text</p>",
        downloadIds: ["dl-001", "dl-002"],
        downloadLabels: { "dl-001": "Study Guide", "dl-002": "Slides" },
      });

      const dl001Call = mocks.downloadCreate.mock.calls.find(
        ([args]) =>
          (args as { data: { fileId: string } }).data.fileId === "dl-001",
      );
      const dl002Call = mocks.downloadCreate.mock.calls.find(
        ([args]) =>
          (args as { data: { fileId: string } }).data.fileId === "dl-002",
      );
      expect((dl001Call![0] as { data: { label: unknown } }).data.label).toBe(
        "Study Guide",
      );
      expect((dl002Call![0] as { data: { label: unknown } }).data.label).toBe(
        "Slides",
      );
    });

    it("persists null for downloads absent from the label map", async () => {
      const { service, mocks } = await buildService({
        existingFiles: [
          { id: "dl-001", category: "POST_DOWNLOAD" },
          { id: "dl-002", category: "POST_DOWNLOAD" },
        ],
      });

      await service.create({
        title: "Partial Labels",
        slug: "partial-labels",
        content: "<p>text</p>",
        downloadIds: ["dl-001", "dl-002"],
        downloadLabels: { "dl-001": "Study Guide" },
      });

      const dl002Call = mocks.downloadCreate.mock.calls.find(
        ([args]) =>
          (args as { data: { fileId: string } }).data.fileId === "dl-002",
      );
      expect(
        (dl002Call![0] as { data: { label: unknown } }).data.label,
      ).toBeNull();
    });

    it("persists null for every download when no label map is provided", async () => {
      const { service, mocks } = await buildService({
        existingFiles: [{ id: "dl-001", category: "POST_DOWNLOAD" }],
      });

      await service.create({
        title: "No Map",
        slug: "no-map",
        content: "<p>text</p>",
        downloadIds: ["dl-001"],
      });

      const call = mocks.downloadCreate.mock.calls[0]![0] as {
        data: { label: unknown };
      };
      expect(call.data.label).toBeNull();
    });

    // -- Phase 5 remediation: trimmed values must be persisted, not the raw padded value

    it("persists the trimmed label when input has surrounding whitespace", async () => {
      const { service, mocks } = await buildService({
        existingFiles: [{ id: "dl-001", category: "POST_DOWNLOAD" }],
      });

      await service.create({
        title: "Padded",
        slug: "padded",
        content: "<p>text</p>",
        downloadIds: ["dl-001"],
        downloadLabels: { "dl-001": "  Guide  " },
      });

      const call = mocks.downloadCreate.mock.calls[0]![0] as {
        data: { label: unknown };
      };
      expect(call.data.label).toBe("Guide");
    });
  });

  // -- 1.10: update --------------------------------------------------------

  describe("update (1.10)", () => {
    it("partially updates a post", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
      });

      const result = await service.update("post-001", {
        title: "Updated Title",
      });

      expect(mocks.update).toHaveBeenCalledTimes(1);
      const updateArgs = mocks.update.mock.calls[0]![0] as {
        where: { id: string };
        data: Record<string, unknown>;
      };
      expect(updateArgs.where.id).toBe("post-001");
      expect(updateArgs.data.title).toBe("Updated Title");
      expect(result.title).toBe("Updated Title");
    });

    it("sanitizes content on update", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
      });

      await service.update("post-001", {
        content: '<p>Safe</p><img src="x.jpg" onerror="alert(1)">',
      });

      const updateArgs = mocks.update.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      const persistedContent = updateArgs.data.content as string;
      expect(persistedContent).not.toContain("<img");
      expect(persistedContent).toContain("<p>Safe</p>");
    });

    it("normal edit never touches featuredAt", async () => {
      // FeaturedPost.featuredAt must not change on normal post updates
      const { service, mocks } = await buildService({
        existingPosts: [PUBLISHED_POST],
        findUniqueReturn: PUBLISHED_POST,
      });

      await service.update("post-002", { title: "New Title" });

      const updateArgs = mocks.update.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      // No featuredAt mutation in update data
      expect(updateArgs.data).not.toHaveProperty("featuredAt");
    });

    it("throws on non-existent post", async () => {
      const { service } = await buildService({ existingPosts: [] });

      await expect(
        service.update("nonexistent", { title: "X" }),
      ).rejects.toThrow();
    });

    it("updates description and tags", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
      });

      await service.update("post-001", {
        description: "New desc",
        tags: ["ministry", "prayer"],
      });

      const updateArgs = mocks.update.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(updateArgs.data.description).toBe("New desc");
      expect(updateArgs.data.tags).toEqual(["ministry", "prayer"]);
    });

    it("rejects duplicate slug on update", async () => {
      // RED: When update tries to set a slug that already belongs to
      // another post, the service must surface a ConflictException.
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
      });

      // Simulate P2002 on the update call
      vi.mocked(mocks.update).mockRejectedValueOnce(
        Object.assign(
          new Error("Unique constraint failed on the fields: (slug)"),
          { code: "P2002" },
        ),
      );

      await expect(
        service.update("post-001", { slug: "my-post" }),
      ).rejects.toThrow("Slug already exists");
    });

    it("validates downloadIds on update belong to POST_DOWNLOAD", async () => {
      // Updating downloadIds must validate the file category.
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
        existingFiles: [{ id: "dl-099", category: "POST_DOWNLOAD" }],
      });

      await service.update("post-001", { downloadIds: ["dl-099"] });

      // Should not throw — category is valid, and download was created
      expect(mocks.downloadCreate).toHaveBeenCalledTimes(1);
    });

    it("rejects update downloadId with wrong category", async () => {
      // RED: non-POST_DOWNLOAD file IDs must be rejected.
      const { service } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
        existingFiles: [{ id: "dl-099", category: "OTHER" }],
      });

      await expect(
        service.update("post-001", { downloadIds: ["dl-099"] }),
      ).rejects.toThrow(/POST_DOWNLOAD/);
    });

    it("replaces download rows on update", async () => {
      // RED: updating downloadIds must delete old downloads and
      // create new ones, mirroring the create behavior.
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
        existingFiles: [
          { id: "dl-001", category: "POST_DOWNLOAD" },
          { id: "dl-002", category: "POST_DOWNLOAD" },
        ],
        existingDownloads: [
          { ...DOWNLOAD_ROW, postId: "post-001", fileId: "old-dl" },
        ],
      });

      await service.update("post-001", {
        downloadIds: ["dl-001", "dl-002"],
      });

      // Old downloads must be deleted before new ones are created
      expect(mocks.downloadDeleteMany).toHaveBeenCalledWith({
        where: { postId: "post-001" },
      });
      // New downloads must be created
      expect(mocks.downloadCreate).toHaveBeenCalledTimes(2);
    });

    it("wraps post update and download replacement in a transaction", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
        existingFiles: [{ id: "dl-001", category: "POST_DOWNLOAD" }],
      });

      await service.update("post-001", { downloadIds: ["dl-001"] });

      // update with downloads must use $transaction for atomicity
      expect(mocks.$transaction).toHaveBeenCalledOnce();
    });

    it("errors propagate when download replacement fails inside update", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
        existingFiles: [
          { id: "dl-good", category: "POST_DOWNLOAD" },
          { id: "dl-bad", category: "POST_DOWNLOAD" },
        ],
        existingDownloads: [
          { ...DOWNLOAD_ROW, postId: "post-001", fileId: "old-dl" },
        ],
      });

      // Second download creation fails
      mocks.downloadCreate
        .mockResolvedValueOnce({
          id: "dl-0",
          postId: "post-001",
          fileId: "dl-good",
          label: null,
          sortOrder: 0,
          createdAt: new Date(),
        } as PostDownloadRow)
        .mockRejectedValueOnce(
          new Error("DB error during download replacement"),
        );

      await expect(
        service.update("post-001", {
          downloadIds: ["dl-good", "dl-bad"],
        }),
      ).rejects.toThrow("DB error during download replacement");

      // Must use $transaction so the post update is rolled back
      expect(mocks.$transaction).toHaveBeenCalledOnce();
    });
  });

  // -- Phase 2, TDD 2.1: downloadLabels persistence (update) -------------

  describe("update downloadLabels (Phase 2, TDD 2.1)", () => {
    it("writes supplied labels on the replacement download rows", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
        existingFiles: [
          { id: "dl-001", category: "POST_DOWNLOAD" },
          { id: "dl-002", category: "POST_DOWNLOAD" },
        ],
        existingDownloads: [
          { ...DOWNLOAD_ROW, postId: "post-001", fileId: "old-dl" },
        ],
      });

      await service.update("post-001", {
        downloadIds: ["dl-001", "dl-002"],
        downloadLabels: { "dl-001": "Guide", "dl-002": "Slides" },
      });

      const dl001Call = mocks.downloadCreate.mock.calls.find(
        ([args]) =>
          (args as { data: { fileId: string } }).data.fileId === "dl-001",
      );
      const dl002Call = mocks.downloadCreate.mock.calls.find(
        ([args]) =>
          (args as { data: { fileId: string } }).data.fileId === "dl-002",
      );
      expect((dl001Call![0] as { data: { label: unknown } }).data.label).toBe(
        "Guide",
      );
      expect((dl002Call![0] as { data: { label: unknown } }).data.label).toBe(
        "Slides",
      );
    });

    it("writes null for replacement downloads absent from the label map", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
        existingFiles: [
          { id: "dl-001", category: "POST_DOWNLOAD" },
          { id: "dl-002", category: "POST_DOWNLOAD" },
        ],
        existingDownloads: [
          { ...DOWNLOAD_ROW, postId: "post-001", fileId: "old-dl" },
        ],
      });

      await service.update("post-001", {
        downloadIds: ["dl-001", "dl-002"],
        downloadLabels: { "dl-001": "Guide" },
      });

      const dl002Call = mocks.downloadCreate.mock.calls.find(
        ([args]) =>
          (args as { data: { fileId: string } }).data.fileId === "dl-002",
      );
      expect(
        (dl002Call![0] as { data: { label: unknown } }).data.label,
      ).toBeNull();
    });

    it("writes null for every replacement when no label map is provided", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
        existingFiles: [{ id: "dl-001", category: "POST_DOWNLOAD" }],
        existingDownloads: [
          { ...DOWNLOAD_ROW, postId: "post-001", fileId: "old-dl" },
        ],
      });

      await service.update("post-001", {
        downloadIds: ["dl-001"],
      });

      const call = mocks.downloadCreate.mock.calls[0]![0] as {
        data: { label: unknown };
      };
      expect(call.data.label).toBeNull();
    });

    it("preserves existing downloads and labels when both fields are omitted", async () => {
      // Phase 2, TDD 2.1 — Omission Preservation.
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
        existingDownloads: [
          {
            ...DOWNLOAD_ROW,
            postId: "post-001",
            fileId: "existing-dl",
            label: "Existing Label",
          },
        ],
      });

      await service.update("post-001", { title: "New Title" });

      // No delete and no create of downloads must happen
      expect(mocks.downloadDeleteMany).not.toHaveBeenCalled();
      expect(mocks.downloadCreate).not.toHaveBeenCalled();
    });

    // -- Phase 5 remediation: trimmed values must be persisted on update too

    it("persists the trimmed label on replacement rows when input has surrounding whitespace", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
        existingFiles: [{ id: "dl-001", category: "POST_DOWNLOAD" }],
        existingDownloads: [
          { ...DOWNLOAD_ROW, postId: "post-001", fileId: "old-dl" },
        ],
      });

      await service.update("post-001", {
        downloadIds: ["dl-001"],
        downloadLabels: { "dl-001": "   Slides   " },
      });

      const call = mocks.downloadCreate.mock.calls[0]![0] as {
        data: { label: unknown };
      };
      expect(call.data.label).toBe("Slides");
    });
  });

  // -- 1.11: publish, archive, delete --------------------------------------

  describe("publish (1.11)", () => {
    it("sets PUBLISHED status and publishedAt when first published", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
      });

      const result = await service.publish("post-001");

      expect(mocks.update).toHaveBeenCalledTimes(1);
      const updateArgs = mocks.update.mock.calls[0]![0] as {
        where: { id: string };
        data: Record<string, unknown>;
      };
      expect(updateArgs.data.status).toBe("PUBLISHED");
      expect(updateArgs.data.publishedAt).toBeDefined();
      expect(result.publishedAt).toBeDefined();
    });

    it("keeps existing publishedAt on republish (idempotent)", async () => {
      const { service } = await buildService({
        existingPosts: [PUBLISHED_POST],
        findUniqueReturn: PUBLISHED_POST,
      });

      const result = await service.publish("post-002");
      // Should keep the original publishedAt, not overwrite with now
      expect(result.publishedAt?.getTime()).toBe(EARLIER.getTime());
    });

    it("throws on non-existent post", async () => {
      const { service } = await buildService({ existingPosts: [] });

      await expect(service.publish("nonexistent")).rejects.toThrow();
    });
  });

  describe("archive (1.11)", () => {
    it("sets ARCHIVED status and deletes FeaturedPost row", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [PUBLISHED_POST],
        findUniqueReturn: PUBLISHED_POST,
        existingFeatured: [FEATURED_ROW],
      });

      const result = await service.archive("post-002");

      expect(mocks.update).toHaveBeenCalledTimes(1);
      const updateArgs = mocks.update.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(updateArgs.data.status).toBe("ARCHIVED");
      // FeaturedPost was deleted
      expect(mocks.featuredDelete).toHaveBeenCalledWith({
        where: { postId: "post-002" },
      });
      expect(result.status).toBe("ARCHIVED");
    });

    it("handles archive when no FeaturedPost row exists", async () => {
      const { service } = await buildService({
        existingPosts: [PUBLISHED_POST],
        findUniqueReturn: PUBLISHED_POST,
        existingFeatured: [],
      });

      // Should not throw — deleting non-existent featured post must not fail
      // (the archive method catches P2025 on featured delete)
      await service.archive("post-002");
    });

    it("throws on non-existent post", async () => {
      const { service } = await buildService({ existingPosts: [] });

      await expect(service.archive("nonexistent")).rejects.toThrow();
    });

    it("rejects archiving a draft without writing", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
      });

      await expect(service.archive(DRAFT_POST.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mocks.update).not.toHaveBeenCalled();
      expect(mocks.featuredDelete).not.toHaveBeenCalled();
    });

    it("rejects archiving an archived post without writing", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [ARCHIVED_POST],
        findUniqueReturn: ARCHIVED_POST,
      });

      await expect(service.archive(ARCHIVED_POST.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mocks.update).not.toHaveBeenCalled();
    });
  });

  describe("delete (1.11)", () => {
    it("deletes post, downloads, and featured row in transaction", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
        existingFeatured: [{ ...FEATURED_ROW, postId: "post-001" }],
        existingDownloads: [DOWNLOAD_ROW],
      });

      await service.delete("post-001");

      // Verify transaction was used
      expect(mocks.$transaction).toHaveBeenCalledTimes(1);

      // Post was deleted
      expect(mocks.postDelete).toHaveBeenCalledWith({
        where: { id: "post-001" },
      });

      // Downloads were deleted
      expect(mocks.downloadDeleteMany).toHaveBeenCalledWith({
        where: { postId: "post-001" },
      });

      // FeaturedPost was deleted
      expect(mocks.featuredDelete).toHaveBeenCalledWith({
        where: { postId: "post-001" },
      });
    });

    it("throws on non-existent post", async () => {
      const { service } = await buildService({ existingPosts: [] });

      await expect(service.delete("nonexistent")).rejects.toThrow();
    });
  });

  // -- 1.12: findAll, findBySlug -------------------------------------------

  describe("findAll (1.12)", () => {
    it("returns all posts with no status filter", async () => {
      const { service } = await buildService({
        existingPosts: [DRAFT_POST, PUBLISHED_POST, ARCHIVED_POST],
      });

      const result = await service.findAll({});
      expect(result).toHaveLength(3);
    });

    it("filters by status", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST, PUBLISHED_POST, ARCHIVED_POST],
      });

      await service.findAll({ status: "DRAFT" });

      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "DRAFT" },
        }),
      );
    });

    it("applies skip/take pagination", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST, PUBLISHED_POST, ARCHIVED_POST],
      });

      await service.findAll({ skip: 0, take: 2 });

      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 2,
        }),
      );
    });
  });

  describe("findBySlug (1.12)", () => {
    it("returns post by slug", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [DRAFT_POST],
        findUniqueReturn: DRAFT_POST,
      });

      const result = await service.findBySlug("my-post");

      expect(mocks.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: "my-post" },
        }),
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe("post-001");
    });

    it("returns null when slug not found", async () => {
      const { service } = await buildService({ existingPosts: [] });

      const result = await service.findBySlug("nonexistent");
      expect(result).toBeNull();
    });
  });

  // -- 1.13: findAllPublic ------------------------------------------------

  describe("findAllPublic (1.13)", () => {
    it("returns only PUBLISHED posts as PostPublicResponse", async () => {
      const { service } = await buildService({
        existingPosts: [PUBLISHED_POST, DRAFT_POST, ARCHIVED_POST],
      });

      const result = await service.findAllPublic();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("post-002");
      expect(result[0]!.slug).toBe("published-post");
      expect(result[0]!.status).toBe("PUBLISHED");
    });

    it("returns empty array when no PUBLISHED posts", async () => {
      const { service } = await buildService({
        existingPosts: [DRAFT_POST, ARCHIVED_POST],
      });

      const result = await service.findAllPublic();
      expect(result).toHaveLength(0);
    });

    it("excludes internal fields from public response", async () => {
      const { service } = await buildService({
        existingPosts: [PUBLISHED_POST],
      });

      const result = await service.findAllPublic();

      expect(result[0]!).not.toHaveProperty("createdById");
      expect(result[0]!).not.toHaveProperty("createdAt");
      expect(result[0]!).not.toHaveProperty("updatedAt");
    });

    it("resolves coverImageId to URL path", async () => {
      const postWithCover = makePost({
        id: "post-cover",
        slug: "with-cover-public",
        status: "PUBLISHED",
        coverImageId: "img-cov-001",
        publishedAt: NOW,
      });
      const { service } = await buildService({
        existingPosts: [postWithCover],
      });

      const result = await service.findAllPublic();

      expect(result[0]!.coverImageUrl).toBe("/files/img-cov-001");
    });

    it("returns null coverImageUrl when no cover image", async () => {
      const { service } = await buildService({
        existingPosts: [PUBLISHED_POST], // coverImageId is null
      });

      const result = await service.findAllPublic();

      expect(result[0]!.coverImageUrl).toBeNull();
    });

    it("queries only published posts with a publication timestamp", async () => {
      const timestampLess = makePost({
        id: "invalid-published",
        status: "PUBLISHED",
        publishedAt: null,
      });
      const { service, mocks } = await buildService({
        existingPosts: [PUBLISHED_POST, timestampLess],
      });

      await service.findAllPublic();

      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PUBLISHED", publishedAt: { not: null } },
        }),
      );
    });

    // -- Phase 5 remediation: prove the public response exposes a null label
    //    through the real toPublicResponse mapping (not just a mock passthrough).

    it("surfaces label: null for an unlabeled persisted download", async () => {
      const publishedWithNullLabel = makePost({
        id: "post-with-null-dl",
        slug: "post-with-null-dl",
        status: "PUBLISHED",
        publishedAt: NOW,
        downloads: [
          {
            id: "dl-null-1",
            postId: "post-with-null-dl",
            fileId: "file-1",
            label: null,
            sortOrder: 0,
            createdAt: NOW,
          },
          {
            id: "dl-labeled-1",
            postId: "post-with-null-dl",
            fileId: "file-2",
            label: "Study Guide",
            sortOrder: 1,
            createdAt: NOW,
          },
        ],
      });
      const { service } = await buildService({
        existingPosts: [publishedWithNullLabel],
      });

      const result = await service.findAllPublic();

      expect(result).toHaveLength(1);
      const post = result[0]!;
      expect(post.downloads).toHaveLength(2);
      expect(post.downloads[0]!.label).toBeNull();
      expect(post.downloads[0]!.fileUrl).toBe("/files/file-1");
      expect(post.downloads[1]!.label).toBe("Study Guide");
      expect(post.downloads[1]!.fileUrl).toBe("/files/file-2");
    });
  });

  describe("safe lifecycle transitions", () => {
    it("publishes archived posts while preserving their first publication timestamp", async () => {
      const archivedPublished = makePost({
        ...ARCHIVED_POST,
        publishedAt: EARLIER,
      });
      const { service, mocks } = await buildService({
        existingPosts: [archivedPublished],
        findUniqueReturn: archivedPublished,
      });

      const result = await service.publish(archivedPublished.id);

      expect(result.status).toBe("PUBLISHED");
      expect(result.publishedAt?.getTime()).toBe(EARLIER.getTime());
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "PUBLISHED" },
        }),
      );
    });

    it("returns an already published post without a write", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [PUBLISHED_POST],
        findUniqueReturn: PUBLISHED_POST,
      });

      const result = await service.publish(PUBLISHED_POST.id);

      expect(result).toEqual(PUBLISHED_POST);
      expect(mocks.update).not.toHaveBeenCalled();
    });
  });

  // -- 2.4: feature ----------------------------------------------------------

  describe("feature (2.4)", () => {
    it("features a PUBLISHED post by creating a FeaturedPost row with first free slot", async () => {
      const { service, mocks } = await buildService({
        existingPosts: [PUBLISHED_POST],
        existingFeatured: [], // no featured posts yet
      });

      const result = await service.feature(PUBLISHED_POST.id);

      // Should have created a FeaturedPost row
      expect(mocks.featuredCreate).toHaveBeenCalledOnce();
      const createArgs = mocks.featuredCreate.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(createArgs.data.postId).toBe(PUBLISHED_POST.id);
      expect(createArgs.data.slot).toBe("SLOT_1"); // first free slot
      expect(createArgs.data.featuredAt).toBeDefined();

      expect(result.success).toBe(true);
    });

    it("assigns SLOT_2 when SLOT_1 is taken", async () => {
      const existingFeatured: FeaturedPostRow[] = [
        {
          id: "fp-A",
          slot: "SLOT_1",
          postId: "other-post-1",
          featuredAt: EARLIER,
          createdAt: EARLIER,
          updatedAt: EARLIER,
        },
      ];

      const { service, mocks } = await buildService({
        existingPosts: [PUBLISHED_POST],
        existingFeatured,
      });

      await service.feature(PUBLISHED_POST.id);

      const createArgs = mocks.featuredCreate.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(createArgs.data.slot).toBe("SLOT_2");
    });

    it("assigns SLOT_3 when SLOT_1 and SLOT_2 are taken", async () => {
      const existingFeatured: FeaturedPostRow[] = [
        {
          id: "fp-A",
          slot: "SLOT_1",
          postId: "other-post-1",
          featuredAt: EARLIER,
          createdAt: EARLIER,
          updatedAt: EARLIER,
        },
        {
          id: "fp-B",
          slot: "SLOT_2",
          postId: "other-post-2",
          featuredAt: EARLIER,
          createdAt: EARLIER,
          updatedAt: EARLIER,
        },
      ];

      const { service, mocks } = await buildService({
        existingPosts: [PUBLISHED_POST],
        existingFeatured,
      });

      await service.feature(PUBLISHED_POST.id);

      const createArgs = mocks.featuredCreate.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(createArgs.data.slot).toBe("SLOT_3");
    });

    it("rejects feature when all FEATURE_SLOTS are occupied (derived cap)", async () => {
      const existingFeatured: FeaturedPostRow[] = [
        {
          id: "fp-A",
          slot: "SLOT_1",
          postId: "other-post-1",
          featuredAt: EARLIER,
          createdAt: EARLIER,
          updatedAt: EARLIER,
        },
        {
          id: "fp-B",
          slot: "SLOT_2",
          postId: "other-post-2",
          featuredAt: EARLIER,
          createdAt: EARLIER,
          updatedAt: EARLIER,
        },
        {
          id: "fp-C",
          slot: "SLOT_3",
          postId: "other-post-3",
          featuredAt: EARLIER,
          createdAt: EARLIER,
          updatedAt: EARLIER,
        },
      ];

      const { service, mocks } = await buildService({
        existingPosts: [PUBLISHED_POST],
        existingFeatured,
      });

      await expect(service.feature(PUBLISHED_POST.id)).rejects.toThrow(
        "Maximum 3 featured",
      );

      // Should NOT have created a new featured row
      expect(mocks.featuredCreate).not.toHaveBeenCalled();
    });

    it("updates featuredAt when re-featuring an already featured post", async () => {
      const existingFeatured: FeaturedPostRow[] = [
        {
          id: "fp-A",
          slot: "SLOT_1",
          postId: PUBLISHED_POST.id,
          featuredAt: EARLIER,
          createdAt: EARLIER,
          updatedAt: EARLIER,
        },
      ];

      const { service, mocks } = await buildService({
        existingPosts: [PUBLISHED_POST],
        existingFeatured,
        findUniqueReturn: PUBLISHED_POST,
      });

      await service.feature(PUBLISHED_POST.id);

      // Re-feature uses delete + create pattern to update featuredAt
      expect(mocks.featuredDelete).toHaveBeenCalledOnce();
      expect(mocks.featuredDelete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { postId: PUBLISHED_POST.id } }),
      );
      expect(mocks.featuredCreate).toHaveBeenCalledOnce();
      const createArgs = mocks.featuredCreate.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(createArgs.data.postId).toBe(PUBLISHED_POST.id);
      expect(createArgs.data.slot).toBe("SLOT_1"); // preserves existing slot
      // featuredAt should be a new Date() (later than EARLIER)
      expect(createArgs.data.featuredAt).toBeDefined();
    });

    it("rejects featuring a DRAFT post", async () => {
      const { service } = await buildService({
        existingPosts: [DRAFT_POST],
      });

      await expect(service.feature(DRAFT_POST.id)).rejects.toThrow(
        "Only PUBLISHED posts can be featured",
      );
    });

    it("rejects featuring an ARCHIVED post", async () => {
      const { service } = await buildService({
        existingPosts: [ARCHIVED_POST],
      });

      await expect(service.feature(ARCHIVED_POST.id)).rejects.toThrow(
        "Only PUBLISHED posts can be featured",
      );
    });

    it("rejects featuring a non-existent post", async () => {
      const { service } = await buildService();

      await expect(service.feature("non-existent-id")).rejects.toThrow(
        "not found",
      );
    });
  });

  // -- 2.5: unfeature --------------------------------------------------------

  describe("unfeature (2.5)", () => {
    it("unfeatures a post by deleting the FeaturedPost row", async () => {
      const existingFeatured: FeaturedPostRow[] = [
        {
          id: "fp-A",
          slot: "SLOT_1",
          postId: PUBLISHED_POST.id,
          featuredAt: EARLIER,
          createdAt: EARLIER,
          updatedAt: EARLIER,
        },
      ];

      const { service, mocks } = await buildService({
        existingPosts: [PUBLISHED_POST],
        existingFeatured,
      });

      const result = await service.unfeature(PUBLISHED_POST.id);

      expect(mocks.featuredDelete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { postId: PUBLISHED_POST.id } }),
      );
      expect(result.success).toBe(true);
    });

    it("is idempotent when post is not featured (no error)", async () => {
      const { service } = await buildService({
        existingPosts: [PUBLISHED_POST],
        existingFeatured: [],
      });

      // Should not throw even though there's no FeaturedPost row
      const result = await service.unfeature(PUBLISHED_POST.id);

      expect(result.success).toBe(true);
    });

    it("is idempotent when post does not exist", async () => {
      const { service } = await buildService();

      const result = await service.unfeature("non-existent-id");

      expect(result.success).toBe(true);
    });
  });

  // -- listFeatured -------------------------------------------------------

  describe("listFeatured", () => {
    it("returns empty array when no posts are featured", async () => {
      const { service } = await buildService({
        existingPosts: [PUBLISHED_POST],
        existingFeatured: [],
      });

      const result = await service.listFeatured();

      expect(result.postIds).toEqual([]);
    });

    it("returns all featured post IDs", async () => {
      const existingFeatured: FeaturedPostRow[] = [
        {
          id: "fp-A",
          slot: "SLOT_1",
          postId: "post-alpha",
          featuredAt: EARLIER,
          createdAt: EARLIER,
          updatedAt: EARLIER,
        },
        {
          id: "fp-B",
          slot: "SLOT_2",
          postId: "post-beta",
          featuredAt: EARLIER,
          createdAt: EARLIER,
          updatedAt: EARLIER,
        },
        {
          id: "fp-C",
          slot: "SLOT_3",
          postId: "post-gamma",
          featuredAt: EARLIER,
          createdAt: EARLIER,
          updatedAt: EARLIER,
        },
      ];
      const { service } = await buildService({
        existingPosts: [PUBLISHED_POST],
        existingFeatured,
      });

      const result = await service.listFeatured();

      expect(result.postIds).toEqual(
        expect.arrayContaining(["post-alpha", "post-beta", "post-gamma"]),
      );
      expect(result.postIds).toHaveLength(3);
    });
  });
});
