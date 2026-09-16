// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Page from "./index.astro";
import { PUBLIC_IMAGE_FALLBACK_HANDLER } from "../../lib/public-image.js";

describe("publications SSR", () => {
  beforeEach(() => {
    vi.stubEnv("ASTRO_API_BASE_URL", "http://api.test");
  });
  afterEach(() => vi.unstubAllEnvs());

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
                featuredImageUrl: "",
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
    expect(html).toContain("Archivo público");
    expect(html).toContain('class="public-publications-list__gallery"');
    expect(html).toContain('class="public-publication-card__media"');
    expect(html).toContain('src="/assets/template-picture.png"');
    expect(html).toContain(`onerror="${PUBLIC_IMAGE_FALLBACK_HANDLER}"`);
    expect(html).toContain("Ver publicación");
    expect(html).toContain('value="OUTING" aria-pressed="true"');
    expect(html).toContain("Página 1 de 2");
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
    const response = await container.renderToResponse(Page, {
      request: new Request("http://localhost/publicaciones"),
    });
    expect(response.status).toBe(503);
    expect(await response.text()).toContain(
      "No pudimos cargar las publicaciones.",
    );
  });
});
