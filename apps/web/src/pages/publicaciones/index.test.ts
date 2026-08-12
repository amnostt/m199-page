// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Page from "./index.astro";

describe("publications SSR", () => {
  it("renders list cards", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
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
            limit: 25,
            total: 2,
            hasMore: true,
          }),
          { status: 200 },
        ),
      ),
    );
    const html = await (
      await AstroContainer.create()
    ).renderToString(Page, {
      request: new Request(
        "http://localhost/publicaciones?type=OUTING&limit=25",
      ),
    });
    expect(html).toContain("One");
    expect(html).toContain('value="OUTING" aria-pressed="true"');
    expect(html).toContain(
      "/publicaciones?page=2&#38;limit=25&#38;type=OUTING",
    );
  });

  it("renders the controlled 503 state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("down", { status: 503 })),
    );
    const container = await AstroContainer.create();
    const html = await container.renderToString(Page, {
      request: new Request("http://localhost/publicaciones"),
    });
    expect(html).toContain("No pudimos cargar las publicaciones.");
  });
});
