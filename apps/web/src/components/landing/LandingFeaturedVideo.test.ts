// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LandingFeaturedVideo from "./LandingFeaturedVideo.astro";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe("LandingFeaturedVideo.astro", () => {
  it("omits the complete section when no video is configured", async () => {
    const html = await container.renderToString(LandingFeaturedVideo, {
      props: { featuredVideoUrl: null },
    });

    expect(html).not.toContain('data-testid="video-section"');
    expect(html).not.toContain("<iframe");
  });

  it("renders a titled standalone section for the safe video URL", async () => {
    const html = await container.renderToString(LandingFeaturedVideo, {
      props: {
        featuredVideoUrl: "https://www.youtube.com/embed/abc",
      },
    });

    expect(html).toContain('data-testid="video-section"');
    expect(html).toContain('id="video-destacado"');
    expect(html).toContain('data-testid="featured-video"');
    expect(html).toContain('src="https://www.youtube.com/embed/abc"');
    expect(html).toContain('title="Misión 1-99 en acción"');
  });
});
