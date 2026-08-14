// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LandingBanner from "./LandingBanner.astro";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe("LandingBanner.astro — OpenDesign visual pause", () => {
  it("renders the bundled banner asset as a decorative figure", async () => {
    const html = await container.renderToString(LandingBanner);

    expect(html).toContain('data-testid="banner-section"');
    expect(html).toContain('data-testid="banner-image"');
    expect(html).toContain('src="/assets/redesign/banner.png"');
    expect(html).toContain('alt=""');
    expect(html).toContain('loading="lazy"');
    expect(html).toMatch(/<figure\b[^>]*data-testid="banner-section"/);
  });

  it("never references the OpenDesign CDN", async () => {
    const html = await container.renderToString(LandingBanner);
    expect(html).not.toContain("/api/projects/");
    expect(html).not.toContain("workspaceId=");
    expect(html).not.toContain("workspaceMemberId=");
  });
});
