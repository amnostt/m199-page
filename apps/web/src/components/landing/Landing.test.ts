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

function navbarMarkup(html: string): string {
  const navbar = html.match(
    /<header\b[^>]*data-testid="landing-navbar"[^>]*>[\s\S]*?<\/header>/,
  );
  if (!navbar) throw new Error("Landing navbar was not rendered");
  return navbar[0];
}

function navbarHrefs(html: string): string[] {
  return [...navbarMarkup(html).matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)].map(
    (match) => match[1]!,
  );
}

function ids(html: string): string[] {
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]!);
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
      "missions-section",
      "about-section",
      "video-section",
      "featured-posts-section",
      "verse-section",
      "contact-section",
      "landing-footer",
    ];
    for (const id of sections) {
      expect(html).toContain(`data-testid="${id}"`);
    }
    const sectionOffsets = sections.map((id) =>
      html.indexOf(`data-testid="${id}"`),
    );
    expect(sectionOffsets).toEqual([...sectionOffsets].sort((a, b) => a - b));
    expect(html.match(/data-testid="hero-section"/g)).toHaveLength(1);
    // Sanity-check the section content for the most error-prone fields.
    expect(html).toContain("Misión 1-99");
    expect(html).toContain("Transformamos vidas");
    expect(html).toContain('href="/outings/salida-de-prueba"');
    expect(html).toContain('class="public-action public-action--primary"');
    expect(html).toContain("Un testimonio");
    expect(html).toContain("Id por todo el mundo");
    expect(html).toContain("Marcos 16:15");
  });

  it("renders the fallback hero and permanent missions slot while omitting empty optional sections", async () => {
    const html = await render(minimalPayload());
    expect(html).toContain('data-testid="landing-page"');
    expect(html).toContain('data-testid="hero-section"');
    expect(html).toContain('data-testid="missions-section"');
    expect(html).toContain('src="/assets/template-picture.jpg"');
    const sections = [
      "about-section",
      "video-section",
      "contact-section",
      "featured-posts-section",
      "verse-section",
    ];
    for (const id of sections) {
      expect(html).not.toContain(`data-testid="${id}"`);
    }
    expect(html).toContain('data-testid="landing-footer"');
  });

  it.each([
    ["full", fullPayload(), ["#inicio", "#misiones", "#nosotros", "#contacto"]],
    [
      "optional",
      {
        ...minimalPayload(),
        mission: "Alcanzar a cada persona",
        description: "Una comunidad de fe",
        contactEmail: "contacto@m199.org",
      },
      ["#inicio", "#misiones", "#nosotros", "#contacto"],
    ],
    [
      "minimal",
      minimalPayload(),
      ["#inicio", "#misiones", "#inicio", "#inicio"],
    ],
  ] as const)(
    "renders four navigable destinations with unique target ownership for the %s branch",
    async (_branch, payload, expectedHrefs) => {
      const html = await render(payload);
      const hrefs = navbarHrefs(html);

      expect(hrefs).toEqual(expectedHrefs);
      for (const href of new Set(hrefs)) {
        expect(ids(html).filter((id) => `#${id}` === href)).toHaveLength(1);
      }
      expect(new Set(ids(html)).size).toBe(ids(html).length);
    },
  );
});

describe("Landing.astro — about and contact", () => {
  it("renders the approved manifesto, principles, and exact contact CTA", async () => {
    const html = await render(fullPayload());

    expect(html).toContain("No construimos una institución");
    expect(html).toContain("Buscamos al uno");
    expect(html).toContain("Cristo es el centro");
    expect(html).toContain("Cada persona tiene valor");
    expect(html).toContain("Acción antes que comodidad");
    expect(html).toContain('href="#contacto"');
    expect(html).toContain("Quiero ser parte");
    expect(html).not.toContain('href="/nosotros"');
  });

  it("renders only available contact channels as direct actions", async () => {
    const emailOnly = await render({
      ...minimalPayload(),
      contactEmail: " contacto@m199.org ",
    });
    expect(emailOnly).toContain('href="mailto:contacto@m199.org"');
    expect(emailOnly).not.toContain('href="tel:');

    const phoneOnly = await render({
      ...minimalPayload(),
      contactPhone: "+54 11 1234-5678",
    });
    expect(phoneOnly).toContain('href="tel:+541112345678"');
    expect(phoneOnly).not.toContain('href="mailto:');
  });

  it("omits the participation CTA when about exists without a contact destination", async () => {
    const html = await render({
      ...minimalPayload(),
      description: "Somos un movimiento que sale a buscar al uno.",
    });

    expect(html).toContain('id="nosotros"');
    expect(html).not.toContain('id="contacto"');
    expect(html).not.toContain('href="#contacto"');
    expect(html).not.toContain("Quiero ser parte");
  });

  it("does not render empty about or contact anchors for blank values", async () => {
    const html = await render({
      ...minimalPayload(),
      description: "   ",
      contactEmail: "   ",
    });

    expect(html).not.toContain('id="nosotros"');
    expect(html).not.toContain('id="contacto"');
    expect(navbarHrefs(html)).toEqual([
      "#inicio",
      "#misiones",
      "#inicio",
      "#inicio",
    ]);
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

  it("renders nothing when both payload and failure are null", async () => {
    const html = await render(null);

    expect(html).not.toContain('data-testid="landing-page"');
    expect(html).not.toContain('data-testid="hero-section"');
  });

  it("prefers failure over a present payload (defensive precedence)", async () => {
    const html = await render(fullPayload(), { reason: "timeout" });
    expect(html).toContain('data-testid="landing-error"');
    expect(html).not.toContain('data-testid="landing-page"');
    expect(html).not.toContain('data-testid="hero-section"');
  });

  it("keeps all failure-branch destinations valid on the error root", async () => {
    const html = await render(null, { reason: "timeout" });
    const hrefs = navbarHrefs(html);

    expect(hrefs).toEqual(["#inicio", "#inicio", "#inicio", "#inicio"]);
    expect(ids(html).filter((id) => id === "inicio")).toHaveLength(1);
    expect(new Set(ids(html)).size).toBe(ids(html).length);
  });
});

describe("Landing.astro — navbar SSR contract", () => {
  it("keeps the semantic navigation, exact Spanish destinations, CTA, and logo", async () => {
    const html = await render(fullPayload());
    const navbar = navbarMarkup(html);

    expect(navbar).toMatch(/^<header\b/);
    expect(navbar).toMatch(/<nav\b[^>]*aria-label="Navegación principal"/);
    expect(navbar).toContain('src="/assets/brand/logo-horizontal.png"');
    expect(navbar).toContain('alt="Misión 1-99"');
    expect(navbar).toContain("Inicio");
    expect(navbar).toContain("Misiones");
    expect(navbar).toContain("Nosotros");
    expect(navbar).toContain("Contacto");
    expect(navbar).not.toContain("Publicaciones");
    expect(navbar.match(/landing-navbar__link--cta/g)).toHaveLength(1);
    expect(navbar.match(/<a\b/g)).toHaveLength(4);
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
      html.match(/class="[^"]*\bpublic-section\b[^"]*"/g)?.length,
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
      /class="[^"]*\bpublic-media--cover\b[^"]*"[^]*<iframe[^>]*data-testid="featured-video"/,
    );
    expect(html).toContain('src="https://www.youtube.com/embed/abc"');
    expect(html).toMatch(/<iframe[^>]*title="Misión 1-99 en acción"/);
  });
});
