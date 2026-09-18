// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import reactRenderer from "@astrojs/react/server.js";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Page from "./[slug].astro";
import { PUBLIC_IMAGE_FALLBACK_HANDLER } from "../../lib/public-image.js";

const activeDetail = {
  id: "m-1",
  slug: "one",
  title: "One",
  heroImageUrl: "/files/f-1",
  profileImageUrl: "/files/p-1",
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

const createContainer = async () =>
  AstroContainer.create().then((container) => {
    container.addServerRenderer({ renderer: reactRenderer });
    container.addClientRenderer({
      name: "@astrojs/react",
      entrypoint: "@astrojs/react/client.js",
    });
    return container;
  });

describe("mission detail SSR", () => {
  beforeEach(() => {
    vi.stubEnv("ASTRO_API_BASE_URL", "http://api.test");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("renders the active mission detail with the closed public projection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(activeDetail))),
    );
    const response = await (
      await createContainer()
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
    expect(html).toContain('data-testid="public-image-carousel"');
    expect(html).toContain('src="/files/f-1"');
    expect(html).toContain('src="/files/p-1"');
    expect(html).toContain('alt="Logotipo de One"');
    expect(html).toContain('src="/files/f-2"');
    expect(html).toContain(
      'aria-label="Ampliar imagen 1 de 2 de la misión One"',
    );
    expect(html).toContain('aria-label="Galería de la misión One"');
    expect(html).not.toContain("La Misión en imágenes");
    expect(html).toContain("Story One");
    expect(html).toContain("Explorar publicaciones");
    expect(html).not.toContain('data-testid="mission-detail-error"');
  });

  it("uses the public image fallback for an empty mission hero image", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ...activeDetail, heroImageUrl: "" })),
        ),
    );
    const html = await (
      await createContainer()
    ).renderToString(Page, {
      params: { slug: "one" },
      request: new Request("http://localhost/misiones/one"),
    });

    expect(html).toContain('src="/assets/template-picture.png"');
    expect(html).toContain('data-testid="public-image-carousel"');
    expect(html).toContain(
      'aria-label="Ampliar imagen 1 de 2 de la misión One"',
    );
  });

  it("uses the public image fallback for a related publication without an image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...activeDetail,
            publications: [
              { ...activeDetail.publications[0], featuredImageUrl: null },
            ],
          }),
        ),
      ),
    );
    const html = await (
      await createContainer()
    ).renderToString(Page, {
      params: { slug: "one" },
      request: new Request("http://localhost/misiones/one"),
    });

    expect(html).toContain('src="/assets/template-picture.png"');
    expect(html).toContain(`onerror="${PUBLIC_IMAGE_FALLBACK_HANDLER}"`);
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
      await createContainer()
    ).renderToResponse(Page, {
      params: { slug: "one" },
      request: new Request("http://localhost/misiones/one"),
    });
    const html = await response.text();
    expect(html).not.toContain('data-testid="mission-gallery"');
    expect(html).not.toContain("Explorar publicaciones");
    expect(html).toContain("No hay publicaciones relacionadas.");
  });

  it("omits the profile image container when no profile image is configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ ...activeDetail, profileImageUrl: null }),
          ),
        ),
    );
    const html = await (
      await createContainer()
    ).renderToString(Page, {
      params: { slug: "one" },
      request: new Request("http://localhost/misiones/one"),
    });

    expect(html).not.toContain('data-testid="mission-profile-image"');
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
        await createContainer()
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
      await createContainer()
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
      await createContainer()
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
