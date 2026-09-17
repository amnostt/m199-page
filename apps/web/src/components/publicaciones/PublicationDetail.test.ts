// @vitest-environment node
import { describe, expect, it } from "vitest";
import reactRenderer from "@astrojs/react/server.js";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import PublicationDetail from "./PublicationDetail.astro";

const renderPublicationDetail = async (publication: object) => {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(PublicationDetail, { props: { publication } });
};

const publication = {
  slug: "demo",
  title: "Demo",
  excerpt: "Intro",
  content: "<p>Body</p>",
  type: "POST",
  publishedAt: "2026-01-01T00:00:00.000Z",
  featuredImageUrl: "/files/first",
  imageUrls: ["/files/first", "/files/second", "/files/third"],
  missions: [],
};

describe("PublicationDetail image integration", () => {
  it("preserves the ordered publication image sequence", async () => {
    const html = await renderPublicationDetail(publication);

    expect(html).toContain('data-testid="public-image-carousel"');
    expect(html.indexOf('src="/files/first"')).toBeLessThan(
      html.indexOf('src="/files/second"'),
    );
    expect(html.indexOf('src="/files/second"')).toBeLessThan(
      html.indexOf('src="/files/third"'),
    );
    expect(html).toContain('aria-label="Ampliar imagen 1 de 3 de la publicación Demo"');
    expect(html).toContain("La historia continúa");
  });

  it("keeps one fallback image when the public image contract is empty", async () => {
    const html = await renderPublicationDetail({
      ...publication,
      featuredImageUrl: null,
      imageUrls: [],
    });

    expect(html).toContain('src="/assets/template-picture.png"');
    expect(html).toContain('aria-label="Ampliar imagen 1 de 1 de la publicación Demo"');
    expect(html).not.toContain("Imagen anterior");
  });
});
