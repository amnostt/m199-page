// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Page from "./index.astro";

describe("publications SSR", () => {
  it("renders list cards", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              items: [
                {
                  slug: "one",
                  title: "One",
                  excerpt: "Text",
                  type: "POST",
                  publishedAt: "2026-01-01T00:00:00.000Z",
                  featuredImageUrl: null,
                },
              ],
              page: 1,
              limit: 10,
              total: 1,
              hasMore: false,
            }),
            { status: 200 },
          ),
        ),
    );
    const html = await (
      await AstroContainer.create()
    ).renderToString(Page, {
      request: new Request("http://localhost/publicaciones"),
    });
    expect(html).toContain("One");
  });
});
