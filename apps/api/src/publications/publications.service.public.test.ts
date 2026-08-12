import { describe, expect, it, vi } from "vitest";
import { PublicationsService } from "./publications.service.js";

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
});
