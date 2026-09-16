import { describe, expect, it, vi } from "vitest";
import { PublicationsService } from "./publications.service.js";
import { PublicationType } from "./dto/publication.dto.js";

const image = (fileAssetId: string, position = 0) => ({
  fileAssetId,
  position,
});

describe("PublicationsService public list", () => {
  it("filters published rows and maps position zero as the featured image", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        slug: "one",
        title: "One",
        excerpt: "",
        type: "POST",
        publishedAt: new Date("2026-01-01"),
        images: [image("cover")],
      },
    ]);
    const db = {
      client: {
        publication: { findMany, count: vi.fn().mockResolvedValue(1) },
      },
    };
    const result = await new PublicationsService(db as never).findManyPublic({
      page: 1,
      limit: 10,
    });
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      select: expect.objectContaining({
        images: { where: { position: 0 }, select: { fileAssetId: true } },
      }),
    });
    expect(result.items[0]).toEqual({
      slug: "one",
      title: "One",
      excerpt: "",
      type: "POST",
      publishedAt: "2026-01-01T00:00:00.000Z",
      featuredImageUrl: "/files/cover",
    });
  });

  it("narrows the Prisma query by publication type", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    await new PublicationsService({
      client: { publication: { findMany, count } },
    } as never).findManyPublic({
      page: 1,
      limit: 10,
      type: PublicationType.OUTING,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PUBLISHED", type: PublicationType.OUTING },
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { status: "PUBLISHED", type: PublicationType.OUTING },
    });
  });

  it("projects detail with ordered image URLs, activityDate, and sanitized content", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      slug: "outing",
      title: "Outing",
      excerpt: "Excerpt",
      content: '<p>safe</p><script>alert("x")</script>',
      type: PublicationType.OUTING,
      publishedAt: new Date("2026-01-01"),
      images: [image("cover", 0), image("second", 1)],
      activityDate: new Date("2026-02-01T00:00:00.000Z"),
      missions: [],
    });
    const service = new PublicationsService({
      client: { publication: { findUnique } },
    } as never);
    await expect(service.findOnePublicBySlug("outing")).resolves.toEqual({
      slug: "outing",
      title: "Outing",
      excerpt: "Excerpt",
      content: "<p>safe</p>",
      type: "OUTING",
      publishedAt: "2026-01-01T00:00:00.000Z",
      featuredImageUrl: "/files/cover",
      imageUrls: ["/files/cover", "/files/second"],
      activityDate: "2026-02-01",
      missions: [],
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "outing", status: "PUBLISHED" },
        select: expect.objectContaining({
          images: {
            orderBy: { position: "asc" },
            select: { fileAssetId: true, position: true },
          },
        }),
      }),
    );
  });

  it("projects published POST without activityDate or internal fields", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      slug: "post",
      title: "Post",
      excerpt: "Excerpt",
      content: "<p>safe</p>",
      type: PublicationType.POST,
      publishedAt: new Date("2026-01-01"),
      images: [],
      activityDate: null,
      missions: [],
    });
    const service = new PublicationsService({
      client: { publication: { findUnique } },
    } as never);
    const result = await service.findOnePublicBySlug("post");
    expect(result).not.toHaveProperty("activityDate");
    expect(result).not.toHaveProperty("imageIds");
    expect(result.imageUrls).toEqual([]);
  });

  it("projects associated Missions as closed rows in deterministic order", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      slug: "linked",
      title: "Linked",
      excerpt: "",
      content: "<p>safe</p>",
      type: PublicationType.POST,
      publishedAt: new Date("2026-01-01"),
      images: [],
      activityDate: null,
      missions: [
        {
          mission: {
            slug: "newer-archived",
            title: "Newer archived",
            status: "ARCHIVED",
          },
        },
        {
          mission: {
            slug: "older-active",
            title: "Older active",
            status: "ACTIVE",
          },
        },
      ],
    });
    const service = new PublicationsService({
      client: { publication: { findUnique } },
    } as never);
    const result = await service.findOnePublicBySlug("linked");
    expect(result.missions).toEqual([
      { slug: "newer-archived", title: "Newer archived", status: "ARCHIVED" },
      { slug: "older-active", title: "Older active", status: "ACTIVE" },
    ]);
  });

  it("maps a missing or draft slug to the same not-found error", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const service = new PublicationsService({
      client: { publication: { findUnique } },
    } as never);
    await expect(service.findOnePublicBySlug("hidden")).rejects.toThrow(
      'Publication "hidden" not found',
    );
  });
});
