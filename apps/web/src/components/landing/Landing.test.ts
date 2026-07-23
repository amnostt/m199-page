// @vitest-environment node
//
// PR3 root rendering — focused tests for the pure `Landing.astro`
// component. Uses the experimental Astro Container API (the
// supported pattern for unit-testing .astro components in vitest)
// to render the component in isolation and assert on the HTML.
import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Landing from "./Landing.astro";
import type { LandingPayloadShape } from "./landing-shape.js";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

function fullPayload(): LandingPayloadShape {
  return {
    heroTitle: "Misión 1-99",
    heroSubtitle: "Transformamos vidas",
    heroImageUrl: "/files/hero",
    mission: "Alcanzar a cada persona",
    vision: "Ver cada vida transformada",
    description: "Somos una comunidad de fe",
    featuredVideoUrl: "https://www.youtube.com/embed/abc",
    contactEmail: "contacto@m199.org",
    contactPhone: "+54 11 1234-5678",
    featuredOuting: {
      id: "out-1",
      slug: "salida-de-prueba",
      title: "Salida de prueba",
      location: "Chaco",
      mainImageUrl: "/files/out",
    },
    featuredPosts: [
      {
        id: "p-1",
        slug: "primer-post",
        title: "Un testimonio",
        coverImageUrl: "/files/post",
      },
    ],
    currentVerse: {
      text: "Id por todo el mundo",
      reference: "Marcos 16:15",
      date: "2025-01-01T00:00:00.000Z",
    },
  };
}

function minimalPayload(): LandingPayloadShape {
  return {
    heroTitle: null,
    heroSubtitle: null,
    heroImageUrl: null,
    mission: null,
    vision: null,
    description: null,
    featuredVideoUrl: null,
    contactEmail: null,
    contactPhone: null,
    featuredOuting: null,
    featuredPosts: [],
    currentVerse: null,
  };
}

async function render(
  payload: LandingPayloadShape | null,
  failure: { reason: string } | null = null,
): Promise<string> {
  return container.renderToString(Landing, {
    props: { payload, failure },
  });
}

describe("Landing.astro — successful markup", () => {
  it("renders the full landing root with the .public-ui public-page scope", async () => {
    const html = await render(fullPayload());
    expect(html).toContain('class="public-ui public-page"');
    expect(html).toContain('data-testid="landing-page"');
  });

  it("renders every section in payload order when the payload is full", async () => {
    const html = await render(fullPayload());
    const sections = [
      "hero-section",
      "featured-outing-section",
      "mission-section",
      "vision-section",
      "description-section",
      "video-section",
      "contact-section",
      "featured-posts-section",
      "verse-section",
    ];
    for (const id of sections) {
      expect(html).toContain(`data-testid="${id}"`);
    }
    // Sanity-check the section content for the most error-prone fields.
    expect(html).toContain("Misión 1-99");
    expect(html).toContain("Transformamos vidas");
    expect(html).toContain('href="/outings/salida-de-prueba"');
    expect(html).toContain('class="public-action public-action--primary"');
    expect(html).toContain("Un testimonio");
    expect(html).toContain("Id por todo el mundo");
    expect(html).toContain("Marcos 16:15");
  });

  it("omits every section that is null/empty in the payload", async () => {
    const html = await render(minimalPayload());
    expect(html).toContain('data-testid="landing-page"');
    const sections = [
      "hero-section",
      "mission-section",
      "video-section",
      "contact-section",
      "featured-posts-section",
      "verse-section",
    ];
    for (const id of sections) {
      expect(html).not.toContain(`data-testid="${id}"`);
    }
  });
});

describe("Landing.astro — failure markup", () => {
  it("renders the landing-error root with the public-ui scope and error class", async () => {
    const html = await render(null, { reason: "timeout" });
    expect(html).toContain('data-testid="landing-error"');
    expect(html).toContain('class="public-ui public-page"');
    expect(html).toContain('class="public-state public-state--error"');
    expect(html).toContain('aria-live="polite"');
  });

  it("emits a generic, user-facing copy regardless of the reason", async () => {
    const html = await render(null, { reason: "network" });
    expect(html).toContain("La página no se puede cargar en este momento");
    expect(html).toContain("Intentá nuevamente en unos minutos");
  });

  it.each([
    "timeout",
    "network",
    "http_error",
    "invalid_payload",
    "fetch_error",
  ])("never renders the failure reason '%s' to the user", async (reason) => {
    const html = await render(null, { reason });
    expect(html).not.toContain(reason);
  });

  it("never renders API host, status, stack, or cause details", async () => {
    const html = await render(null, { reason: "http_error" });
    for (const leak of [
      "localhost",
      "127.0.0.1",
      "http://",
      "https://",
      "status",
      "stack",
      "Error",
      "LandingFetchError",
    ]) {
      expect(html).not.toContain(leak);
    }
  });

  it("prefers failure over a present payload (defensive precedence)", async () => {
    const html = await render(fullPayload(), { reason: "timeout" });
    expect(html).toContain('data-testid="landing-error"');
    expect(html).not.toContain('data-testid="landing-page"');
    expect(html).not.toContain('data-testid="hero-section"');
  });
});

describe("Landing.astro — CSS scope contract", () => {
  it("uses the documented compound class .public-ui.public-page on the root", async () => {
    const html = await render(fullPayload());
    expect(html).toMatch(/class="public-ui public-page"/);
  });

  it("uses public-section for every block-level section", async () => {
    const html = await render(fullPayload());
    expect(
      html.match(/class="public-section"/g)?.length,
    ).toBeGreaterThanOrEqual(6);
  });

  it("uses public-card for the featured outing and each post", async () => {
    const html = await render(fullPayload());
    expect(html.match(/class="public-card"/g)?.length).toBeGreaterThanOrEqual(
      2,
    );
  });
});

describe("Landing.astro — iframe omission and safety", () => {
  it("omits the iframe entirely when featuredVideoUrl is null", async () => {
    const html = await render({ ...fullPayload(), featuredVideoUrl: null });
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain('data-testid="featured-video"');
    expect(html).not.toContain('data-testid="video-section"');
  });

  it("emits the iframe only inside the .public-media wrapper, with a title", async () => {
    const html = await render(fullPayload());
    expect(html).toMatch(
      /class="public-media public-media--cover"[^]*<iframe[^>]*data-testid="featured-video"/,
    );
    expect(html).toContain('src="https://www.youtube.com/embed/abc"');
    expect(html).toMatch(/<iframe[^>]*title="Featured Video"/);
  });
});
