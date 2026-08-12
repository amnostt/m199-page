import { describe, expect, it, vi } from "vitest";
import { PublicationsService } from "./publications.service.js";
import { PublicationType } from "./dto/publication.dto.js";

describe("PublicationsService public list", () => {
  it("filters published rows and maps a closed projection", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        {
          slug: "one",
          title: "One",
          excerpt: "",
          type: "POST",
          publishedAt: new Date("2026-01-01"),
          featuredImageId: null,
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
    });
    expect(result.items[0]).toEqual({
      slug: "one",
      title: "One",
      excerpt: "",
      type: "POST",
      publishedAt: "2026-01-01T00:00:00.000Z",
      featuredImageUrl: null,
    });
  });

  it("narrows the Prisma query by publication type", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    await new PublicationsService({ client: { publication: { findMany, count } } } as never)
      .findManyPublic({ page: 1, limit: 10, type: PublicationType.OUTING });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "PUBLISHED", type: PublicationType.OUTING },
    }));
    expect(count).toHaveBeenCalledWith({ where: { status: "PUBLISHED", type: PublicationType.OUTING } });
  });

  it("projects published POST and activity details without internal fields", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      slug: "post", title: "Post", excerpt: "Excerpt", content: "<p>safe</p>",
      type: PublicationType.POST, publishedAt: new Date("2026-01-01"), featuredImageId: null,
      startDate: null, endDate: null, activityStatus: null, documentationStatus: null,
      status: "PUBLISHED", scope: "MISSION", missionIds: ["secret"], createdAt: new Date(),
    });
    const service = new PublicationsService({ client: { publication: { findUnique } } } as never);
    const result = await service.findOnePublicBySlug("post");
    expect(result).toEqual({ slug: "post", title: "Post", excerpt: "Excerpt", content: "<p>safe</p>", type: "POST", publishedAt: "2026-01-01T00:00:00.000Z", featuredImageUrl: null });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: "post", status: "PUBLISHED" }, select: expect.objectContaining({ content: true }) }));
  });

  it("maps a missing or draft slug to the same not-found error", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const service = new PublicationsService({ client: { publication: { findUnique } } } as never);
    await expect(service.findOnePublicBySlug("hidden")).rejects.toThrow('Publication "hidden" not found');
  });
});
