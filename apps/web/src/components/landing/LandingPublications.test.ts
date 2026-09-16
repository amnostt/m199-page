// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LandingPublications from "./LandingPublications.astro";
import type { PublicationListItem } from "../../lib/server/publications.js";
import { PUBLIC_IMAGE_FALLBACK_HANDLER } from "../../lib/public-image.js";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const samplePublications: PublicationListItem[] = [
  {
    slug: "latest-story",
    title: "Latest story",
    excerpt: "Latest excerpt",
    type: "POST",
    publishedAt: "2026-09-16T00:00:00.000Z",
    featuredImageUrl: "/files/latest-story",
  },
  {
    slug: "another-story",
    title: "Another story",
    excerpt: "Another excerpt",
    type: "OUTING",
    publishedAt: "2026-09-15T00:00:00.000Z",
    featuredImageUrl: null,
  },
];

describe("LandingPublications.astro — loaded carousel", () => {
  it("renders the latest cards, real destinations, and the archive link", async () => {
    const html = await container.renderToString(LandingPublications, {
      props: { publications: samplePublications },
    });

    expect(html).toContain('data-testid="publications-entry"');
    expect(html).toContain('class="landing-publications__inner"');
    expect(html).toContain('data-testid="publications-entry-link"');
    expect(html).toContain('href="/publicaciones"');
    expect(html).toContain("Ver todas las publicaciones");
    expect(html).toContain('href="/publicaciones/latest-story"');
    expect(html).toContain('href="/publicaciones/another-story"');
    expect(html).toContain("Latest story");
    expect(html).toContain("Another story");
    expect(html).toContain('src="/files/latest-story"');
    expect(html).toContain('src="/assets/template-picture.png"');
    expect(html).toContain(`onerror="${PUBLIC_IMAGE_FALLBACK_HANDLER}"`);
    expect(html.match(/class="landing-publication-card"/g)).toHaveLength(2);
    expect(html.match(/class="landing-publications__item"/g)).toHaveLength(2);
    expect(html).not.toContain("Latest excerpt");
    expect(html).not.toContain("Another excerpt");
    expect(html).not.toContain('href="#"');
    expect(html).not.toContain("/api/projects/");
    expect(html).not.toContain("workspaceId=");
  });

  it("keeps card media first, exposes a labelled scroll region, and renders controls", async () => {
    const html = await container.renderToString(LandingPublications, {
      props: { publications: samplePublications },
    });
    const firstCard = html.match(
      /<a class="landing-publication-card"[\s\S]*?<\/a>/,
    )?.[0];

    expect(firstCard).toBeDefined();
    expect(firstCard!.indexOf("landing-publication-card__media")).toBeLessThan(
      firstCard!.indexOf("landing-publication-card__meta"),
    );
    expect(firstCard!.indexOf("landing-publication-card__meta")).toBeLessThan(
      firstCard!.indexOf("landing-publication-card__title"),
    );
    expect(html).toMatch(
      /class="landing-publications__track"[^>]*role="region"[^>]*aria-label="Publicaciones recientes"[^>]*tabindex="0"/,
    );
    expect(html).toContain('data-testid="publications-prev"');
    expect(html).toContain('data-testid="publications-next"');
    expect(html).toContain('aria-label="Ver publicaciones anteriores"');
    expect(html).toContain('aria-label="Ver más publicaciones"');
    expect(html).toContain("prefers-reduced-motion: reduce");
    expect(html).toContain("scrollWidth");
  });

  it("renders derived zero-padded card indices in newest-first order", async () => {
    const html = await container.renderToString(LandingPublications, {
      props: { publications: samplePublications },
    });
    const indices = [
      ...html.matchAll(/data-testid="publication-card-index"[^>]*>(\d+)</g),
    ].map((match) => match[1]);

    expect(indices).toEqual(["01", "02"]);
  });
});

describe("LandingPublications.astro — empty and failure states", () => {
  it.each([null, []])(
    "omits the entire section for %s publications",
    async (publications) => {
      const html = await container.renderToString(LandingPublications, {
        props: { publications },
      });

      expect(html).not.toContain('data-testid="publications-entry"');
      expect(html).not.toContain('id="publicaciones"');
      expect(html).not.toContain("Ver todas las publicaciones");
      expect(html).not.toMatch(/class="landing-publication-card"/);
    },
  );

  it("does not emit controls or an enhancement script for one card", async () => {
    const html = await container.renderToString(LandingPublications, {
      props: { publications: [samplePublications[0]!] },
    });

    expect(html).not.toContain('data-testid="publications-prev"');
    expect(html).not.toContain('data-testid="publications-next"');
    expect(html).not.toContain("landing-publications__controls");
    expect(html).not.toMatch(/<script\b/);
  });

  it("never emits failure details or legacy placeholder markup", async () => {
    for (const publications of [null, [], samplePublications]) {
      const html = await container.renderToString(LandingPublications, {
        props: { publications },
      });
      const visitorCopy = html.replace(/<[^>]*>/g, " ").toLowerCase();
      for (const leak of [
        "error",
        "fallo",
        "timeout",
        "network",
        "http_error",
        "invalid_payload",
        "publicación pendiente",
        "featured-posts-section",
      ]) {
        expect(visitorCopy).not.toContain(leak);
      }
    }
  });
});
