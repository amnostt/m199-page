// ---------------------------------------------------------------------------
// postsApi unit tests
//
// Tests pure helper functions: parseTags, fileUrl, thumbUrl.
// Tests thin adminFetch wrappers: listPosts, getPost.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  archivePost,
  createPost,
  deletePost,
  fileUrl,
  getPost,
  listFeaturedPostIds,
  listPosts,
  parseTags,
  publishPost,
  thumbUrl,
  updatePost,
} from "./postsApi.js";
import type { PostForm } from "./adminTypes.js";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// parseTags
// ---------------------------------------------------------------------------

describe("parseTags", () => {
  it('splits "a, b, ,c" into ["a","b","c"] — trims whitespace, drops empty', () => {
    const result = parseTags("a, b, ,c");
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for null input", () => {
    const result = parseTags(null);
    expect(result).toEqual([]);
  });

  it("returns empty array for undefined input", () => {
    const result = parseTags(undefined);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    const result = parseTags("");
    expect(result).toEqual([]);
  });

  it("caps at max 20 tags — excess tags are dropped", () => {
    const twentyOne = "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21";
    const result = parseTags(twentyOne);
    expect(result).toHaveLength(20);
    expect(result[19]).toBe("20");
    expect(result).not.toContain("21");
  });

  it("handles single tag without commas", () => {
    const result = parseTags("single");
    expect(result).toEqual(["single"]);
  });

  it("handles tags with extra whitespace around commas", () => {
    const result = parseTags("  hello  ,  world  ");
    expect(result).toEqual(["hello", "world"]);
  });
});

// ---------------------------------------------------------------------------
// fileUrl
// ---------------------------------------------------------------------------

describe("fileUrl", () => {
  it("returns /files/{id} for a valid id", () => {
    const result = fileUrl("abc-123");
    expect(result).toBe("/files/abc-123");
  });

  it("returns null when id is null", () => {
    const result = fileUrl(null);
    expect(result).toBeNull();
  });

  it("returns null when id is undefined", () => {
    const result = fileUrl(undefined);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// thumbUrl
// ---------------------------------------------------------------------------

describe("thumbUrl", () => {
  it("returns /files/{id}/thumb for a valid id", () => {
    const result = thumbUrl("abc-123");
    expect(result).toBe("/files/abc-123/thumb");
  });

  it("returns null when id is null", () => {
    const result = thumbUrl(null);
    expect(result).toBeNull();
  });

  it("returns null when id is undefined", () => {
    const result = thumbUrl(undefined);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listPosts — thin adminFetch wrapper
// ---------------------------------------------------------------------------

describe("listPosts", () => {
  it("GETs /posts/admin with credentials and returns parsed JSON", async () => {
    const mockPosts = [
      {
        id: "p1",
        slug: "hello",
        title: "Hello",
        status: "DRAFT",
        coverImageId: null,
        publishedAt: null,
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPosts),
    });

    const result = await listPosts();

    expect(result).toEqual(mockPosts);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/posts/admin",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("throws when fetch returns non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(listPosts()).rejects.toThrow("Admin request failed");
  });
});

// ---------------------------------------------------------------------------
// getPost — thin adminFetch wrapper
// ---------------------------------------------------------------------------

describe("getPost", () => {
  it("GETs /posts/admin/slug/:slug with credentials and returns parsed JSON", async () => {
    const mockPost = {
      id: "p1",
      slug: "hello",
      title: "Hello",
      status: "DRAFT",
      coverImageId: null,
      publishedAt: null,
      description: "desc",
      content: "body",
      tags: ["a"],
      downloads: [],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPost),
    });

    const result = await getPost("hello");

    expect(result).toEqual(mockPost);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/posts/admin/slug/hello",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("throws when fetch returns non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });

    await expect(getPost("missing")).rejects.toThrow("Admin request failed");
  });
});

describe("post mutation payloads", () => {
  const form: PostForm = {
    title: "Safe post",
    slug: "safe-post",
    content: "<p>content</p>",
    description: "description",
    tagsInput: "faith, news",
    coverImageId: null,
    downloadIds: [],
  };

  it("omits lifecycle fields from create and update payloads", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await createPost(form);
    await updatePost("post-1", form);

    const bodies = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string),
    ) as Record<string, unknown>[];
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).not.toHaveProperty("status");
    expect(bodies[0]).not.toHaveProperty("publishedAt");
    expect(bodies[1]).not.toHaveProperty("status");
    expect(bodies[1]).not.toHaveProperty("publishedAt");
  });
});

// ---------------------------------------------------------------------------
// listFeaturedPostIds — thin adminFetch wrapper
// ---------------------------------------------------------------------------

describe("listFeaturedPostIds", () => {
  it("GETs /posts/admin/featured and returns postIds array", async () => {
    const mockResponse = { postIds: ["fp-1", "fp-2", "fp-3"] };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await listFeaturedPostIds();

    expect(result).toEqual(["fp-1", "fp-2", "fp-3"]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/posts/admin/featured",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("returns empty array when backends returns empty postIds", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ postIds: [] }),
    });

    const result = await listFeaturedPostIds();

    expect(result).toEqual([]);
  });

  it("throws when fetch returns non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(listFeaturedPostIds()).rejects.toThrow("Admin request failed");
  });
});

// ---------------------------------------------------------------------------
// publishPost — lifecycle endpoint wrapper
// ---------------------------------------------------------------------------

describe("publishPost", () => {
  it("sends POST /posts/admin/:id/publish with credentials and no body", async () => {
    const mockPost = {
      id: "p1",
      slug: "hello",
      title: "Hello",
      status: "PUBLISHED" as const,
      coverImageId: null,
      publishedAt: "2026-01-01T00:00:00.000Z",
      description: "desc",
      content: "body",
      tags: ["a"],
      downloads: [],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPost),
    });

    const result = await publishPost("p1");

    expect(result).toEqual(mockPost);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/posts/admin/p1/publish",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );

    // Verify no body is sent — the backend publish endpoint is parameterless
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit | undefined];
    const init = call[1];
    expect(init?.body).toBeUndefined();
  });

  it("throws when fetch returns non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(publishPost("p1")).rejects.toThrow("Admin request failed");
  });
});

// ---------------------------------------------------------------------------
// archivePost — lifecycle endpoint wrapper
// ---------------------------------------------------------------------------

describe("archivePost", () => {
  it("sends POST /posts/admin/:id/archive with credentials and no body", async () => {
    const mockPost = {
      id: "p1",
      slug: "hello",
      title: "Hello",
      status: "ARCHIVED" as const,
      coverImageId: null,
      publishedAt: null,
      description: "desc",
      content: "body",
      tags: ["a"],
      downloads: [],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPost),
    });

    const result = await archivePost("p1");

    expect(result).toEqual(mockPost);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/posts/admin/p1/archive",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );

    // Verify no body is sent — the backend archive endpoint is parameterless
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit | undefined];
    const init = call[1];
    expect(init?.body).toBeUndefined();
  });

  it("throws when fetch returns non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(archivePost("p1")).rejects.toThrow("Admin request failed");
  });
});

// ---------------------------------------------------------------------------
// deletePost — handles 204 No Content (no JSON body)
// ---------------------------------------------------------------------------

describe("deletePost", () => {
  it("sends DELETE /posts/admin/:id and resolves successfully on 204 No Content", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      // No .json() — 204 has no body; adminFetch should NOT call res.json()
    });

    const result = await deletePost("p1");

    expect(result).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/posts/admin/p1",
      expect.objectContaining({
        method: "DELETE",
        credentials: "include",
      }),
    );
  });

  it("resolves successfully on 200 with JSON body (non-204 ok response)", async () => {
    const mockBody = { deleted: true };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockBody),
    });

    const result = await deletePost("p1");

    // 200 ok with JSON still resolves to the parsed body
    expect(result).toEqual(mockBody);
  });

  it("throws when fetch returns non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({}),
    });

    // adminFetch now throws AdminRequestError with the parsed response
    // statusText as the message when no JSON/text body is present.
    await expect(deletePost("p1")).rejects.toThrow("Not Found");
  });
});
