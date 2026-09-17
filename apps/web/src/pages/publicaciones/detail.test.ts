// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import reactRenderer from "@astrojs/react/server.js";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Page from "./[slug].astro";

const detail = (type: string, missions: object[] = []) => ({
  slug: "demo",
  title: "Demo",
  excerpt: "Intro",
  content: "<p>Body</p><script>bad()</script>",
  type,
  publishedAt: "2026-01-01T00:00:00.000Z",
  featuredImageUrl: null,
  missions,
  startDate: "2026-02-01T00:00:00.000Z",
  endDate: null,
  activityStatus: "COMPLETED",
  documentationStatus: "DOCUMENTED",
});

const createContainer = async () =>
  AstroContainer.create().then((container) => {
    container.addServerRenderer({ renderer: reactRenderer });
    container.addClientRenderer({
      name: "@astrojs/react",
      entrypoint: "@astrojs/react/client.js",
    });
    return container;
  });

describe("publication detail SSR", () => {
  beforeEach(() => {
    vi.stubEnv("ASTRO_API_BASE_URL", "http://api.test");
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each(["POST", "OUTING", "EVENT"])("renders %s", async (type) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(detail(type)))),
    );
    const html = await (
      await createContainer()
    ).renderToString(Page, {
      params: { slug: "demo" },
      request: new Request("http://localhost/publicaciones/demo"),
    });
    expect(html).toContain("Demo");
    expect(html).toContain("Body");
    expect(html.includes('data-testid="publication-badges"')).toBe(
      type !== "POST",
    );
    expect(html).toContain('class="public-publication-page-nav"');
    expect(html).toContain("Todas las publicaciones");
    expect(html).toContain('class="public-publication-detail__hero"');
    expect(html).toContain('src="/assets/template-picture.png"');
    expect(html).toContain('data-testid="public-image-carousel"');
    expect(html).toContain(
      `aria-label="Ampliar imagen 1 de 1 de la publicación Demo"`,
    );
    expect(html).toContain(
      type === "POST" ? "Historia" : type === "OUTING" ? "Salida" : "Evento",
    );
    expect(html).toContain(
      type === "POST"
        ? "Ver publicación"
        : type === "OUTING"
          ? "Ver salida"
          : "Ver evento",
    );
    expect(html).not.toContain("La historia continúa");
    expect(html).toMatch(
      /<h1 id="publication-title" class="public-publication-detail__title"/,
    );
    expect(html).not.toContain("<script>bad()</script>");
    expect(html).not.toContain("bad()");
    expect(html).not.toContain('data-testid="publication-missions"');
  });

  it("renders the publication-missions section with mixed ACTIVE+ARCHIVED links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify(
            detail("POST", [
              {
                slug: "alpha",
                title: "Alpha mission",
                status: "ACTIVE",
                profileImageUrl: "/files/alpha-logo",
              },
              {
                slug: "beta",
                title: "Beta mission",
                status: "ARCHIVED",
                profileImageUrl: null,
              },
            ]),
          ),
        ),
      ),
    );
    const html = await (
      await createContainer()
    ).renderToString(Page, {
      params: { slug: "demo" },
      request: new Request("http://localhost/publicaciones/demo"),
    });
    expect(html).toContain('data-testid="publication-missions"');
    expect(html).toContain('href="/misiones/alpha"');
    expect(html).toContain('href="/misiones/beta"');
    expect(html).toContain("Alpha mission");
    expect(html).toContain("Beta mission");
    expect(html).toContain("Misión finalizada");
    expect(html).toContain('data-testid="publication-mission-logo"');
    expect(html).toContain('src="/files/alpha-logo"');
    expect(html).toContain("Body");
  });

  it("places the featured image before the editorial copy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...detail("POST"),
            featuredImageUrl: "/files/cover",
          }),
        ),
      ),
    );
    const html = await (
      await createContainer()
    ).renderToString(Page, {
      params: { slug: "demo" },
      request: new Request("http://localhost/publicaciones/demo"),
    });
    expect(html.indexOf("public-publication-detail__hero-media")).toBeLessThan(
      html.indexOf("public-publication-detail__hero-copy"),
    );
    expect(html).toContain('src="/files/cover"');
    expect(html).toContain('data-testid="public-image-carousel"');
  });

  it("renders a controlled failure", async () => {
    for (const failure of [
      new Response("unavailable", { status: 503 }),
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
        params: { slug: "missing" },
        request: new Request("http://localhost/publicaciones/missing"),
      });
      expect(response.status).toBe(503);
      expect(await response.text()).toContain(
        "No pudimos cargar esta publicación.",
      );
    }
  });

  it.each(["missing", "draft"])(
    "returns the same visitor-facing 404 for %s detail",
    async (slug) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("not found", { status: 404 })),
      );
      const response = await (
        await createContainer()
      ).renderToResponse(Page, {
        params: { slug },
        request: new Request(`http://localhost/publicaciones/${slug}`),
      });

      expect(response.status).toBe(404);
      expect(await response.text()).toContain(
        "No pudimos cargar esta publicación.",
      );
    },
  );
});
