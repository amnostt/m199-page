// @vitest-environment node
import { describe, expect, it } from "vitest";
import reactRenderer from "@astrojs/react/server.js";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import MissionDetail from "./MissionDetail.astro";

const renderMissionDetail = async (mission: object) => {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
  return container.renderToString(MissionDetail, { props: { mission } });
};

const mission = {
  id: "m-1",
  slug: "one",
  title: "One",
  heroImageUrl: "/files/hero",
  profileImageUrl: "/files/profile",
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
      featuredImageUrl: "/files/story",
    },
  ],
  gallery: [{ imageUrl: "/files/story" }, { imageUrl: "/files/hero" }],
};

describe("MissionDetail image integration", () => {
  it("includes the hero and related images once, in source order", async () => {
    const html = await renderMissionDetail(mission);

    expect(html).toContain('data-testid="public-image-carousel"');
    expect(html).toContain('aria-label="Ampliar imagen 1 de 2 de la misión One"');
    expect(html.indexOf('src="/files/hero"')).toBeLessThan(
      html.indexOf('src="/files/story"'),
    );
    expect(html.match(/src="\/files\/hero"/g)).toHaveLength(2);
    expect(html).toContain('alt="Logotipo de One"');
    expect(html).toContain("Story One");
  });

  it("keeps the carousel available with the public fallback when the hero is blank", async () => {
    const html = await renderMissionDetail({
      ...mission,
      heroImageUrl: " ",
      publications: [],
      gallery: [],
    });

    expect(html).toContain('src="/assets/template-picture.png"');
    expect(html).toContain('aria-label="Ampliar imagen 1 de 1 de la misión One"');
    expect(html).not.toContain("Explorar publicaciones");
  });
});
