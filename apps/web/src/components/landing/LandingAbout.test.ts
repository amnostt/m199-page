// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LandingAbout from "./LandingAbout.astro";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe("LandingAbout.astro — narrative precedence + local gallery + video + CTA", () => {
  it("uses the description field when it has priority over mission and vision", async () => {
    const html = await container.renderToString(LandingAbout, {
      props: {
        mission: "Misión narrativa",
        vision: "Visión narrativa",
        description: "Descripción narrativa prioritaria",
        featuredVideoUrl: null,
        hasContact: false,
      },
    });

    expect(html).toContain('data-testid="about-description"');
    expect(html).toContain("Descripción narrativa prioritaria");
    expect(html).not.toContain("Misión narrativa");
    expect(html).not.toContain("Visión narrativa");
  });

  it("falls back to mission then vision when description is null/blank", async () => {
    const missionOnly = await container.renderToString(LandingAbout, {
      props: {
        mission: "Misión narrativa",
        vision: "Visión narrativa",
        description: null,
        featuredVideoUrl: null,
        hasContact: false,
      },
    });
    expect(missionOnly).toContain("Misión narrativa");

    const visionOnly = await container.renderToString(LandingAbout, {
      props: {
        mission: null,
        vision: "Visión narrativa",
        description: null,
        featuredVideoUrl: null,
        hasContact: false,
      },
    });
    expect(visionOnly).toContain("Visión narrativa");

    const blank = await container.renderToString(LandingAbout, {
      props: {
        mission: "   ",
        vision: "Visión narrativa",
        description: null,
        featuredVideoUrl: null,
        hasContact: false,
      },
    });
    expect(blank).toContain("Visión narrativa");
    expect(blank).not.toContain("Misión narrativa");
  });

  it("renders the local gallery using the bundled OpenDesign redesign assets", async () => {
    const html = await container.renderToString(LandingAbout, {
      props: {
        mission: "Historia",
        vision: null,
        description: null,
        featuredVideoUrl: null,
        hasContact: false,
      },
    });

    expect(html).toContain('data-testid="about-gallery"');
    expect(html).toContain('class="landing-about__inner"');
    expect(html).toContain('data-testid="about-media"');
    expect(html).toContain('src="/assets/redesign/ours-1.png"');
    expect(html).toContain('src="/assets/redesign/ours-2.png"');
    expect(html).toContain('src="/assets/redesign/ours-3.png"');
    expect(html).not.toContain("/api/projects/");
  });

  it("renders the iframe only when featuredVideoUrl is provided", async () => {
    const noVideo = await container.renderToString(LandingAbout, {
      props: {
        mission: "Historia",
        vision: null,
        description: null,
        featuredVideoUrl: null,
        hasContact: false,
      },
    });
    expect(noVideo).not.toContain("<iframe");
    expect(noVideo).not.toContain('data-testid="featured-video"');

    const withVideo = await container.renderToString(LandingAbout, {
      props: {
        mission: "Historia",
        vision: null,
        description: null,
        featuredVideoUrl: "https://www.youtube.com/embed/abc",
        hasContact: false,
      },
    });
    expect(withVideo).toContain("<iframe");
    expect(withVideo).toContain('data-testid="featured-video"');
    expect(withVideo).toContain('src="https://www.youtube.com/embed/abc"');
  });

  it("shows the participation CTA only when hasContact is true", async () => {
    const cta = await container.renderToString(LandingAbout, {
      props: {
        mission: "Historia",
        vision: null,
        description: null,
        featuredVideoUrl: null,
        hasContact: true,
      },
    });
    expect(cta).toContain('data-testid="about-cta"');
    expect(cta).toContain("Quiero ser parte");
    expect(cta).toContain('href="#contacto"');

    const noCta = await container.renderToString(LandingAbout, {
      props: {
        mission: "Historia",
        vision: null,
        description: null,
        featuredVideoUrl: null,
        hasContact: false,
      },
    });
    expect(noCta).not.toContain('data-testid="about-cta"');
    expect(noCta).not.toContain("Quiero ser parte");
  });

  it("hides the section entirely when no narrative and no video exist", async () => {
    const html = await container.renderToString(LandingAbout, {
      props: {
        mission: null,
        vision: null,
        description: null,
        featuredVideoUrl: null,
        hasContact: true,
      },
    });

    expect(html).not.toContain('data-testid="about-section"');
    expect(html).not.toContain('id="nosotros"');
    expect(html).not.toContain('data-testid="about-gallery"');
  });
});
