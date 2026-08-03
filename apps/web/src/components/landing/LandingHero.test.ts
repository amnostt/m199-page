// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LandingHero from "./LandingHero.astro";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

async function render(
  overrides: Partial<{
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroImageUrl: string | null;
  }> = {},
): Promise<string> {
  return container.renderToString(LandingHero, {
    props: {
      heroTitle: "Misión 1-99",
      heroSubtitle: "Transformamos vidas",
      heroImageUrl: "/files/hero",
      ...overrides,
    },
  });
}

describe("LandingHero.astro", () => {
  it.each([null, ""])(
    "renders the fallback hero when the image URL is %j",
    async (heroImageUrl) => {
      const html = await render({ heroImageUrl });

      expect(html).toContain('data-testid="hero-section"');
      expect(html).toMatch(
        /<img[^>]*src="\/assets\/template-picture\.jpg"[^>]*data-testid="hero-image"/,
      );
    },
  );

  it("renders the existing payload fields verbatim in one hero", async () => {
    const html = await render();

    expect(html.match(/data-testid="hero-section"/g)).toHaveLength(1);
    expect(html).toContain('src="/files/hero"');
    expect(html).not.toContain('src="/assets/template-picture.jpg"');
    expect(html).toMatch(/data-testid="hero-title"[^>]*>Misión 1-99<\/h1>/);
    expect(html).toMatch(
      /data-testid="hero-subtitle"[^>]*>Transformamos vidas<\/p>/,
    );
  });

  it("uses the title to label the section and CMS image", async () => {
    const html = await render();

    expect(html).toMatch(/<section[^>]*aria-labelledby="hero-title"/);
    expect(html).toMatch(
      /<img[^>]*alt="Misión 1-99"[^>]*data-testid="hero-image"/,
    );
    expect(html).not.toMatch(/<section[^>]*aria-label=/);
  });

  it("omits nullable copy and supplies accessible decorative fallbacks", async () => {
    const html = await render({ heroTitle: null, heroSubtitle: null });

    expect(html).toContain('data-testid="hero-section"');
    expect(html).toMatch(/<section[^>]*aria-label="Presentación"/);
    expect(html).not.toContain('data-testid="hero-title"');
    expect(html).not.toContain('data-testid="hero-subtitle"');
    expect(html).toMatch(
      /<img[^>]*\balt(?:="")?[^>]*data-testid="hero-image"[^>]*aria-hidden="true"/,
    );
  });

  it("renders the hero image without decorative layers", async () => {
    const html = await render();

    expect(html).toContain('data-testid="hero-image"');
    expect(html).not.toContain('data-testid="hero-accent"');
    expect(html).not.toContain('data-testid="hero-isotipo"');
  });
});
