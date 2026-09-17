// @vitest-environment node
//
// PR3 root rendering — focused tests for the pure `Landing.astro`
// component. Uses the experimental Astro Container API (the
// supported pattern for unit-testing .astro components in vitest)
// to render the component in isolation and assert on the HTML.
import { describe, it, expect, beforeAll } from "vitest";
import reactRenderer from "@astrojs/react/server.js";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Landing from "./Landing.astro";
import type { LandingPayloadShape } from "./landing-shape.js";
import type { PublicationListItem } from "../../lib/server/publications.js";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: "@astrojs/react",
    entrypoint: "@astrojs/react/client.js",
  });
});

function fullPayload(): LandingPayloadShape {
  return {
    heroTitle: "Misión 1-99",
    heroSubtitle: "Transformamos vidas",
    heroImageUrl: "/files/hero",
    missionsTitle: "Proyectos reales.",
    missionsDescription:
      "Cada salida, conversación y servicio es una oportunidad para buscar al uno.",
    publicationsTitle: "Lo que estamos viviendo.",
    publicationsDescription:
      "Historias, salidas y momentos que mantienen viva la misión.",
    aboutTitle: "No esperamos.\nSalimos.",
    mission: "Alcanzar a cada persona",
    vision: "Ver cada vida transformada",
    description: "Somos una comunidad de fe",
    featuredVideoUrl: "/files/video-001",
    backgroundMusicUrl: "/files/music-001",
    contactTitle: "Hablemos.\nVamos juntos.",
    contactDescription:
      "¿Quieres servir, sumar a tu iglesia o conocer más sobre una misión? Hablemos.",
    contactEmail: "contacto@m199.org",
    contactPhone: "+54 11 1234-5678",
    visualBreakImageUrl: "/files/banner",
    currentVerse: {
      text: "Id por todo el mundo",
      reference: "Marcos 16:15",
    },
  };
}

function minimalPayload(): LandingPayloadShape {
  return {
    heroTitle: null,
    heroSubtitle: null,
    heroImageUrl: null,
    missionsTitle: null,
    missionsDescription: null,
    publicationsTitle: null,
    publicationsDescription: null,
    aboutTitle: null,
    mission: null,
    vision: null,
    description: null,
    featuredVideoUrl: null,
    backgroundMusicUrl: null,
    contactTitle: null,
    contactDescription: null,
    contactEmail: null,
    contactPhone: null,
    visualBreakImageUrl: null,
    currentVerse: null,
  };
}

const samplePublications: PublicationListItem[] = [
  {
    slug: "latest-story",
    title: "Latest story",
    excerpt: "Latest excerpt",
    type: "POST",
    publishedAt: "2026-09-16T00:00:00.000Z",
    featuredImageUrl: "/files/latest-story",
  },
];

async function render(
  payload: LandingPayloadShape | null,
  failure: { reason: string } | null = null,
  missions: { slug: string; title: string }[] | null = null,
  publications: PublicationListItem[] | null = samplePublications,
): Promise<string> {
  return container.renderToString(Landing, {
    props: { payload, failure, missions, publications },
  });
}

function navbarMarkup(html: string): string {
  const navbar = html.match(
    /<header\b[^>]*data-testid="landing-navbar"[^>]*>[\s\S]*?<\/header>/,
  );
  if (!navbar) throw new Error("Landing navbar was not rendered");
  return navbar[0];
}

function navbarNavLinks(html: string): string[] {
  // Skip the skip link inside the navbar; it targets `#contenido`,
  // not a section anchor. The Landing page exposes it as an
  // accessibility escape hatch, not as a navigable destination.
  return [...navbarMarkup(html).matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)]
    .map((match) => match[1]!)
    .filter((href) => href !== "#contenido");
}

function ids(html: string): string[] {
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]!);
}

describe("Landing.astro — successful markup", () => {
  it("renders the full landing root with its public scopes and the #contenido skip target", async () => {
    const html = await render(fullPayload());
    expect(html).toContain('class="public-ui public-page landing-page"');
    expect(html).toContain('data-testid="landing-page"');
    expect(html).toContain('id="contenido"');
  });

  it("renders every section in payload order when the payload is full and missions are loaded", async () => {
    const html = await render(fullPayload(), null, [
      { slug: "alpha", title: "Alpha" },
    ]);
    const sections = [
      "hero-section",
      "verse-section",
      "banner-section",
      "missions-section",
      "publications-entry",
      "about-section",
      "video-section",
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
    expect(html).toContain("Proyectos");
    expect(html).toContain("reales.");
    expect(html).toContain("Cada salida, conversación y servicio");
    expect(html).toContain("Lo que estamos");
    expect(html).toContain("viviendo.");
    expect(html).toContain("Historias, salidas y momentos");
    expect(html).toContain("No esperamos.");
    expect(html).toContain("Hablemos.");
    expect(html).toContain("Id por todo el mundo");
    expect(html).toContain("Marcos 16:15");
    // The latest publications carousel keeps the archive link real and never
    // uses a placeholder or fake anchor.
    expect(html).toContain('href="/publicaciones"');
    expect(html).toContain('href="/publicaciones/latest-story"');
    expect(html).not.toContain('href="#"');
    expect(html).not.toContain("featured-outing-section");
    expect(html).not.toContain("featured-posts-section");
  });

  it("renders the OpenDesign fallback hero, hides the missions slot when missions are unavailable, and omits empty optional sections", async () => {
    const html = await render(minimalPayload());
    expect(html).toContain('data-testid="landing-page"');
    expect(html).toContain('data-testid="hero-section"');
    expect(html).toContain('src="/assets/redesign/hero-final.png"');
    expect(html).not.toContain('data-testid="missions-section"');
    // The banner is a static OpenDesign block. Publications are available in
    // this isolated render, while the optional CMS-driven
    // sections (about / video / contact / verse) are omitted when
    // the payload has no values for them.
    expect(html).toContain('data-testid="banner-section"');
    expect(html).toContain('data-testid="publications-entry"');
    const sections = [
      "about-section",
      "video-section",
      "contact-section",
      "verse-section",
    ];
    for (const id of sections) {
      expect(html).not.toContain(`data-testid="${id}"`);
    }
    expect(html).toContain('data-testid="landing-footer"');
  });

  it.each([
    [
      "full",
      fullPayload(),
      ["#inicio", "/misiones", "#nosotros", "/publicaciones", "#contacto"],
    ],
    [
      "optional",
      {
        ...minimalPayload(),
        mission: "Alcanzar a cada persona",
        description: "Una comunidad de fe",
        contactEmail: "contacto@m199.org",
      },
      ["#inicio", "/misiones", "#nosotros", "/publicaciones", "#contacto"],
    ],
    [
      "minimal",
      minimalPayload(),
      // `minimalPayload()` is still a non-null `payload`, so the
      // Misiones link points at `/misiones`; Nosotros and Contacto
      // fall back to `#inicio` because the optional sections have
      // no content. Publications stays absolute.
      ["#inicio", "/misiones", "#inicio", "/publicaciones", "#inicio"],
    ],
  ] as const)(
    "renders five navigable destinations with unique target ownership for the %s branch",
    async (_branch, payload, expectedHrefs) => {
      const html = await render(payload);
      const hrefs = navbarNavLinks(html);

      expect(hrefs).toEqual(expectedHrefs);
      for (const href of new Set(hrefs)) {
        if (!href.startsWith("#")) continue;
        expect(ids(html).filter((id) => `#${id}` === href)).toHaveLength(1);
      }
      expect(new Set(ids(html)).size).toBe(ids(html).length);
    },
  );
});

describe("Landing.astro — about, verse, banner, and contact", () => {
  it("renders the approved OpenDesign about headline and contact CTA when contact exists", async () => {
    const html = await render(fullPayload());

    expect(html).toContain("No esperamos");
    expect(html).toContain("Salimos");
    expect(html).toContain('href="#contacto"');
    expect(html).toContain("Quiero ser parte");
    expect(html).not.toContain('href="/nosotros"');
  });

  it("renders the local gallery images from the OpenDesign redesign bundle", async () => {
    const html = await render(fullPayload());

    expect(html).toContain('data-testid="about-gallery"');
    expect(html).toContain('src="/assets/redesign/ours-1.png"');
    expect(html).toContain('src="/assets/redesign/ours-2.png"');
    expect(html).toContain('src="/assets/redesign/ours-3.png"');
  });

  it("renders the dynamic verse from the validated payload only", async () => {
    const html = await render(fullPayload());
    expect(html).toContain('data-testid="verse-section"');
    expect(html).toContain("Id por todo el mundo");
    expect(html).toContain("Marcos 16:15");
  });

  it("renders the OpenDesign banner visual pause", async () => {
    const html = await render(fullPayload());
    expect(html).toContain('data-testid="banner-section"');
    expect(html).toContain('src="/files/banner"');
    expect(html).toContain('data-cms-image="present"');
  });

  it("uses the bundled banner fallback when the visual-break image is absent", async () => {
    const html = await render({ ...fullPayload(), visualBreakImageUrl: null });
    expect(html).toContain('src="/assets/redesign/banner.png"');
    expect(html).toContain('data-cms-image="fallback"');
  });

  it("keeps cards and optional sections when configurable headings and descriptions are blank", async () => {
    const html = await render(
      {
        ...fullPayload(),
        missionsTitle: "   ",
        missionsDescription: "\t",
        publicationsTitle: "\n",
        publicationsDescription: "   ",
        aboutTitle: "   ",
        contactTitle: "\t",
        contactDescription: "   ",
      },
      null,
      [{ slug: "alpha", title: "Alpha" }],
    );

    expect(html).toContain('data-testid="missions-section"');
    expect(html).toContain('data-testid="mission-card"');
    expect(html).not.toContain('id="missions-title"');
    expect(html).not.toContain('data-testid="missions-subtitle"');
    expect(html).toContain('data-testid="publications-entry"');
    expect(html).toContain('data-testid="publication-card"');
    expect(html).not.toContain('id="publications-entry-title"');
    expect(html).not.toContain('data-testid="publications-subtitle"');
    expect(html).toContain('data-testid="about-section"');
    expect(html).not.toContain('id="about-title"');
    expect(html).toContain('data-testid="contact-section"');
    expect(html).not.toContain('id="contact-title"');
    expect(html).not.toContain('class="landing-contact__copy"');
  });

  it("renders the latest publications carousel and archive link", async () => {
    const html = await render(fullPayload());
    expect(html).toContain('data-testid="publications-entry"');
    expect(html).toContain('href="/publicaciones"');
    expect(html).toContain('href="/publicaciones/latest-story"');
    expect(html).toContain("Latest story");
    expect(html).toContain("Ver todas las publicaciones");
    expect(html).not.toContain("PUBLICACIÓN PENDIENTE");
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
    expect(navbarNavLinks(html)).toEqual([
      "#inicio",
      "/misiones",
      "#inicio",
      "/publicaciones",
      "#inicio",
    ]);
  });
});

describe("Landing.astro — failure markup", () => {
  it("renders the landing-error root with the public-ui scope and error class", async () => {
    const html = await render(null, { reason: "timeout" });
    expect(html).toContain('data-testid="landing-error"');
    expect(html).toContain('class="public-ui public-page landing-page"');
    expect(html).toContain('class="public-state public-state--error"');
    expect(html).toContain('aria-live="polite"');
  });

  it("emits a generic, user-facing copy regardless of the reason", async () => {
    const html = await render(null, { reason: "network" });
    expect(html).toContain("La página no se puede cargar en este momento");
    expect(html).toContain("Intenta nuevamente en unos minutos");
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
    const hrefs = navbarNavLinks(html);

    expect(hrefs).toEqual([
      "#inicio",
      "#inicio",
      "#inicio",
      "/publicaciones",
      "#inicio",
    ]);
    expect(ids(html).filter((id) => id === "inicio")).toHaveLength(1);
    expect(new Set(ids(html)).size).toBe(ids(html).length);
  });
});

describe("Landing.astro — navbar SSR contract", () => {
  it("keeps the semantic navigation, exact Spanish destinations, CTA, logo, and skip link", async () => {
    const html = await render(fullPayload());
    const navbar = navbarMarkup(html);

    expect(navbar).toMatch(/^<header\b/);
    expect(navbar).toMatch(/<nav\b[^>]*aria-label="Navegación principal"/);
    expect(navbar).toContain('src="/assets/brand/logo-horizontal.png"');
    expect(navbar).toContain('alt="Misión 1-99"');
    expect(navbar).toContain('data-testid="landing-navbar-skip"');
    expect(navbar).toContain("Saltar al contenido");
    expect(navbar).toContain("Inicio");
    expect(navbar).toContain("Misiones");
    expect(navbar).toContain("Nosotros");
    expect(navbar).toContain("Contacto");
    expect(navbar).toContain("Publicaciones");
    expect(navbar).toContain('href="/publicaciones"');
    expect(navbar.match(/landing-navbar__link--cta/g)).toHaveLength(1);
    // Skip link + five navigable destinations = 6 anchors total.
    expect(navbar.match(/<a\b/g)).toHaveLength(6);
  });

  it("navigates Misiones to /misiones when the payload is loaded, while leaving the other anchors unchanged", async () => {
    const html = await render(fullPayload());
    const navbar = navbarMarkup(html);
    const misionesAnchor = navbar.match(
      /<a\b[^>]*class="[^"]*\blanding-navbar__link\b[^"]*"[^>]*>Misiones<\/a>/,
    );

    expect(misionesAnchor).not.toBeNull();
    expect(misionesAnchor?.[0]).toContain('href="/misiones"');

    expect(html).toContain('href="/publicaciones"');
    expect(html).toContain('href="#inicio"');
    expect(html).toContain('href="#nosotros"');
    expect(html).toContain('href="#contacto"');
  });

  it("falls back to #inicio for the Misiones destination on the failure root", async () => {
    const html = await render(null, { reason: "timeout" });
    const navbar = navbarMarkup(html);
    const misionesAnchor = navbar.match(
      /<a\b[^>]*class="[^"]*\blanding-navbar__link\b[^"]*"[^>]*>Misiones<\/a>/,
    );

    expect(misionesAnchor?.[0]).toContain('href="#inicio"');
  });

  it("exposes the skip link as the first focusable anchor inside the header", async () => {
    const html = await render(fullPayload());
    const navbar = navbarMarkup(html);
    const skipAnchor = navbar.match(
      /<a\b[^>]*data-testid="landing-navbar-skip"[^>]*>/,
    );

    expect(skipAnchor).not.toBeNull();
    expect(skipAnchor?.[0]).toContain('href="#contenido"');
  });
});

describe("Landing.astro — CSS scope contract", () => {
  it("uses the documented landing and public compound classes on the root", async () => {
    const html = await render(fullPayload());
    expect(html).toMatch(/class="public-ui public-page landing-page"/);
  });

  it("keeps generic section spacing off the full-width verse strip", async () => {
    const html = await render(fullPayload(), null, [
      { slug: "alpha", title: "Alpha" },
    ]);
    expect(html).toContain('class="landing-verse"');
    expect(html).not.toMatch(/class="[^"]*public-section[^"]*landing-verse/);
  });

  it("drops the missions public-section when no missions are provided", async () => {
    const html = await render(fullPayload(), null, []);
    const count = html.match(/class="[^"]*\bpublic-section\b[^"]*"/g)?.length;
    // About + contact + publications-entry. Hero, verse, and banner use
    // dedicated full-width composition classes; missions are conditional.
    expect(count).toBe(3);
    expect(html).not.toContain('data-testid="missions-section"');
  });

  it("drops the publications public-section when no publications are provided", async () => {
    const html = await render(fullPayload(), null, null, []);
    const count = html.match(/class="[^"]*\bpublic-section\b[^"]*"/g)?.length;

    expect(count).toBe(2);
    expect(html).not.toContain('data-testid="publications-entry"');
    expect(html).not.toContain("Latest story");
  });

  it("does not render the legacy featured-outing or featured-posts sections", async () => {
    const html = await render(fullPayload());
    expect(html).not.toContain("featured-outing-section");
    expect(html).not.toContain("featured-posts-section");
    expect(html).not.toContain("featured-outing-link");
    expect(html).not.toContain("featured-outing-title");
  });
});

describe("Landing.astro — no OpenDesign API URLs or placeholder payload values", () => {
  it("never references the OpenDesign /api/projects/ asset CDN", async () => {
    const html = await render(fullPayload(), null, [
      { slug: "alpha", title: "Alpha" },
    ]);
    expect(html).not.toContain("/api/projects/");
    expect(html).not.toContain("workspaceId=");
    expect(html).not.toContain("workspaceMemberId=");
  });

  it("never renders placeholder contact values from the OpenDesign draft", async () => {
    const html = await render(fullPayload());
    expect(html).not.toContain("contacto@pendiente.example");
    expect(html).not.toContain("+000000000");
    expect(html).not.toContain("Email pendiente de confirmar");
    expect(html).not.toContain("Teléfono pendiente de confirmar");
  });

  it("never renders placeholder mission cards from the OpenDesign draft", async () => {
    const html = await render(fullPayload(), null, [
      { slug: "alpha", title: "Alpha mission" },
    ]);
    expect(html).not.toContain("Misión pendiente");
    expect(html).not.toContain("Incorporar nombre, logo, descripción breve");
    expect(html).not.toContain('aria-label="Misión pendiente 0');
  });
});

describe("Landing.astro — featured video omission and safety", () => {
  it("omits the video entirely when featuredVideoUrl is null", async () => {
    const html = await render({ ...fullPayload(), featuredVideoUrl: null });
    expect(html).not.toContain("<video");
    expect(html).not.toContain('data-testid="featured-video"');
    expect(html).not.toContain('data-testid="video-section"');
  });

  it("emits the video only inside the .public-media wrapper, with controls", async () => {
    const html = await render(fullPayload());
    expect(html).toMatch(
      /class="[^"]*\bpublic-media--cover\b[^"]*"[^]*<video[^>]*data-testid="featured-video"/,
    );
    expect(html).toContain('src="/files/video-001"');
    expect(html).toMatch(/<video[^>]*title="Misión 1-99 en acción"/);
    expect(html).toContain('preload="metadata"');
    expect(html).not.toContain("autoplay");
  });

  it("renders the floating background music control only when configured", async () => {
    const html = await render(fullPayload());
    expect(html).toContain('data-testid="landing-background-music"');
    expect(html).toContain('src="/files/music-001"');
    expect(html).toContain('aria-label="Play background music"');
    expect(html).not.toContain(" autoplay");

    const withoutMusic = await render(minimalPayload());
    expect(withoutMusic).not.toContain(
      'data-testid="landing-background-music"',
    );
  });
});
