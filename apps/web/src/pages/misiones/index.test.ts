// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Page from "./index.astro";
import { PUBLIC_IMAGE_FALLBACK_HANDLER } from "../../lib/public-image.js";

describe("missions SSR", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the active list and preserves validated pagination parameters", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "m-1",
              slug: "one",
              title: "One",
              heroImageUrl: "/files/f-1",
              heroPhrase: "Phrase",
              status: "ACTIVE",
            },
          ],
          page: 2,
          limit: 4,
          total: 12,
          hasMore: true,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      request: new Request("http://localhost/misiones?page=2&limit=2"),
    });

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("One");
    expect(html).toContain("12 misiones activas");
    expect(html).toContain('class="public-missions-list__gallery"');
    expect(html).toContain('class="public-mission-card"');
    expect(html).toContain('href="/misiones/one"');
    expect(html).toContain('src="/files/f-1"');
    expect(html).toContain(`onerror="${PUBLIC_IMAGE_FALLBACK_HANDLER}"`);
    expect(html).toContain('href="/"');
    expect(html).toContain("Página 2 de 3");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/misiones?page=1&#38;limit=4"');
    expect(html).toContain('href="/misiones?page=3&#38;limit=4"');
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ search: "?page=2&limit=4" }),
    );
  });

  it("uses the public image fallback for an empty mission image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "m-1",
                slug: "one",
                title: "One",
                heroImageUrl: "",
                heroPhrase: "Phrase",
                status: "ACTIVE",
              },
            ],
            page: 1,
            limit: 4,
            total: 1,
            hasMore: false,
          }),
        ),
      ),
    );

    const html = await (
      await AstroContainer.create()
    ).renderToString(Page, {
      request: new Request("http://localhost/misiones"),
    });

    expect(html).toContain('src="/assets/template-picture.png"');
    expect(html).toContain(`onerror="${PUBLIC_IMAGE_FALLBACK_HANDLER}"`);
  });

  it("renders the controlled 503 state when the list fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("down", { status: 503 })),
    );

    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      request: new Request("http://localhost/misiones"),
    });

    expect(response.status).toBe(503);
    expect(await response.text()).toContain("No pudimos cargar las misiones.");
  });
});
