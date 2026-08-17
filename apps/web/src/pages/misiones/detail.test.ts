// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Page from "./[slug].astro";

const activeDetail = {
  id: "m-1",
  slug: "one",
  title: "One",
  heroImageUrl: "/files/f-1",
  heroPhrase: "Phrase",
  status: "ACTIVE",
  finished: false,
  publications: [
    {
      slug: "story-one",
      title: "Story One",
      excerpt: "A story from the mission.",
      type: "POST",
      publishedAt: "2026-08-15T00:00:00.000Z",
      featuredImageUrl: "/files/f-2",
    },
  ],
  gallery: [{ imageUrl: "/files/f-2" }],
};

describe("mission detail SSR", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the active mission detail with the closed public projection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(activeDetail))),
    );
    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      params: { slug: "one" },
      request: new Request("http://localhost/misiones/one"),
    });
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("One");
    expect(html).toContain("Phrase");
    expect(html).toContain('data-testid="mission-detail"');
    expect(html).toContain('href="/"');
    expect(html).toContain("Todas las misiones");
    expect(html).toContain('data-testid="mission-gallery"');
    expect(html).toContain("La Misión en imágenes");
    expect(html).toContain("Story One");
    expect(html).toContain("Explorar publicaciones");
    expect(html).not.toContain('data-testid="mission-detail-error"');
  });

  it("omits the gallery and hero action when optional content is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ ...activeDetail, publications: [], gallery: [] }),
          ),
        ),
    );
    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      params: { slug: "one" },
      request: new Request("http://localhost/misiones/one"),
    });
    const html = await response.text();
    expect(html).not.toContain('data-testid="mission-gallery"');
    expect(html).not.toContain("Explorar publicaciones");
    expect(html).toContain("No hay publicaciones relacionadas.");
  });

  it("returns 503 with the visitor-safe fallback for upstream, network, and invalid payloads", async () => {
    for (const failure of [
      new Response("down", { status: 503 }),
      new TypeError("network failure"),
      new Response(JSON.stringify({ invalid: true })),
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async () => {
          if (failure instanceof Error) throw failure;
          return failure;
        }),
      );
      const response = await (
        await AstroContainer.create()
      ).renderToResponse(Page, {
        params: { slug: "one" },
        request: new Request("http://localhost/misiones/one"),
      });
      expect(response.status).toBe(503);
      const html = await response.text();
      expect(html).toContain('data-testid="mission-detail-error"');
      expect(html).toContain("No pudimos cargar la misión");
    }
  });

  it("renders an archived mission with the finished badge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...activeDetail,
            status: "ARCHIVED",
            finished: true,
          }),
        ),
      ),
    );
    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      params: { slug: "archived" },
      request: new Request("http://localhost/misiones/archived"),
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Misión finalizada");
  });

  it("returns the visitor-safe 404 for missing slugs", async () => {
    const slug = "missing";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not found", { status: 404 })),
    );
    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      params: { slug },
      request: new Request(`http://localhost/misiones/${slug}`),
    });
    expect(response.status).toBe(404);
    const html = await response.text();
    expect(html).toContain('data-testid="mission-detail-error"');
    expect(html).toContain('href="/"');
    expect(html).toContain("Todas las misiones");
    expect(html).toContain("Misión no encontrada");
  });
});
