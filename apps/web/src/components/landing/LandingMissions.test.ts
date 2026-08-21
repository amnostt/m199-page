// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LandingMissions from "./LandingMissions.astro";
import type { MissionListItem } from "../../lib/server/missions.js";
import { PUBLIC_IMAGE_FALLBACK_HANDLER } from "../../lib/public-image.js";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const sampleMissions: MissionListItem[] = [
  {
    id: "m-1",
    slug: "alpha",
    title: "Alpha mission",
    heroImageUrl: "/files/m-1-hero",
    profileImageUrl: "/files/m-1-profile",
    heroPhrase: "Alpha phrase",
    status: "ACTIVE",
  },
  {
    id: "m-2",
    slug: "beta",
    title: "Beta mission",
    heroImageUrl: "/files/m-2-hero",
    profileImageUrl: null,
    heroPhrase: "Beta phrase",
    status: "ACTIVE",
  },
];

describe("LandingMissions.astro — loaded cards", () => {
  it("renders the missions section with one card per mission and the list-view entry", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: sampleMissions },
    });

    expect(html).toMatch(
      /<section[^>]*id="misiones"[^>]*aria-labelledby="missions-title"/,
    );
    expect(html).toContain('data-testid="missions-section"');
    expect(html).toContain('id="missions-title"');
    expect(html).toContain("Proyectos");
    expect(html).toContain("reales.");
    expect(html).toContain('data-testid="missions-subtitle"');
    expect(html).toContain(
      "Cada salida, conversación y servicio es una oportunidad para buscar al uno.",
    );

    expect(html).toContain('href="/misiones/alpha"');
    expect(html).toContain("Alpha mission");
    expect(html).toContain("Alpha phrase");
    expect(html).toContain('src="/files/m-1-hero"');
    expect(html).toContain('src="/files/m-1-profile"');
    expect(html).toContain('alt="Logotipo de Alpha mission"');
    expect(html).toContain(`onerror="${PUBLIC_IMAGE_FALLBACK_HANDLER}"`);

    expect(html).toContain('href="/misiones/beta"');
    expect(html).toContain("Beta mission");
    expect(html).toContain("Beta phrase");
    expect(html).toContain('src="/files/m-2-hero"');
    expect(html).not.toContain('src="/files/m-2-profile"');

    expect(html).toContain('href="/misiones"');
    expect(html).toContain("Ver todas las misiones");
    expect(html.match(/class="landing-mission-card"/g)).toHaveLength(2);
    expect(html.match(/class="landing-missions__item"/g)).toHaveLength(2);
    expect(html).toContain('data-testid="missions-prev"');
    expect(html).toContain('data-testid="missions-next"');
  });

  it("keeps hero media first, metadata compact, and identity grouped before the phrase", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: sampleMissions },
    });
    const cards = [
      ...html.matchAll(/<a class="landing-mission-card"[\s\S]*?<\/a>/g),
    ].map(([card]) => card);
    expect(cards).toHaveLength(2);

    const firstCard = cards[0]!;
    const mediaIndex = firstCard.indexOf('class="landing-mission-card__media"');
    const metaIndex = firstCard.indexOf('class="landing-mission-card__meta"');
    const identityIndex = firstCard.indexOf(
      'class="landing-mission-card__identity"',
    );
    const phraseIndex = firstCard.indexOf(
      'class="landing-mission-card__phrase"',
    );

    expect(mediaIndex).toBeLessThan(metaIndex);
    expect(metaIndex).toBeLessThan(identityIndex);
    expect(identityIndex).toBeLessThan(phraseIndex);
    expect(firstCard).toMatch(
      /class="landing-mission-card__media"[\s\S]*?<img[^>]*alt=""[^>]*class="landing-mission-card__image"/,
    );
    expect(firstCard).toMatch(
      /class="landing-mission-card__identity"[\s\S]*?class="landing-mission-card__profile"[\s\S]*?alt="Logotipo de Alpha mission"[\s\S]*?class="landing-mission-card__title"/,
    );
  });

  it("omits the optional profile container while retaining the identity group", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: sampleMissions },
    });
    const cards = [
      ...html.matchAll(/<a class="landing-mission-card"[\s\S]*?<\/a>/g),
    ].map(([card]) => card);

    expect(cards[0]).toContain('data-testid="mission-profile-image"');
    expect(cards[1]).not.toContain('data-testid="mission-profile-image"');
    expect(cards[1]).toContain('data-has-profile="false"');
    expect(cards[1]).toMatch(
      /class="landing-mission-card__identity"[\s\S]*?class="landing-mission-card__title"[^>]*>\s*Beta mission/,
    );
  });

  it("renders derived zero-padded card indices in order", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: sampleMissions },
    });

    const indices = [
      ...html.matchAll(/data-testid="mission-card-index"[^>]*>(\d+)</g),
    ]
      .map((match) => match[1])
      .sort();
    expect(indices).toEqual(["01", "02"]);
  });

  it("uses the public image fallback for an empty mission image", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: {
        missions: [{ ...sampleMissions[0]!, heroImageUrl: "" }],
      },
    });

    expect(html).toContain('src="/assets/template-picture.png"');
    expect(html).toContain(`onerror="${PUBLIC_IMAGE_FALLBACK_HANDLER}"`);
    expect(html).not.toContain('src="/files/m-1-hero"');
  });
});

describe("LandingMissions.astro — empty and failure states", () => {
  it("hides the entire section when the missions array is empty", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: [] },
    });

    expect(html).not.toContain('data-testid="missions-section"');
    expect(html).not.toContain('id="misiones"');
    expect(html).not.toContain("Ver todas las misiones");
    expect(html).not.toContain("Alpha mission");
    expect(html).not.toContain("Beta mission");
    expect(html).not.toMatch(/class="landing-mission-card"/);
  });

  it("hides the entire section when the missions fetch failed (null)", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: null },
    });

    expect(html).not.toContain('data-testid="missions-section"');
    expect(html).not.toContain('id="misiones"');
    expect(html).not.toContain("Ver todas las misiones");
    expect(html).not.toContain("Alpha mission");
    expect(html).not.toMatch(/class="landing-mission-card"/);
  });

  it("never emits alarming failure copy in any state", async () => {
    for (const value of [null, [], sampleMissions]) {
      const html = await container.renderToString(LandingMissions, {
        props: { missions: value },
      });
      const visitorCopy = html.replace(/<[^>]*>/g, " ").toLowerCase();
      for (const leak of [
        "error",
        "fallo",
        "no se puede cargar",
        "timeout",
        "network",
        "http_error",
        "invalid_payload",
        "503",
      ]) {
        expect(visitorCopy).not.toContain(leak);
      }
    }
  });
});

describe("LandingMissions.astro — controls and reduced-motion", () => {
  it("disables the controls for a single card so they cannot overflow the track", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: [sampleMissions[0]!] },
    });

    expect(html).not.toContain('data-testid="missions-prev"');
    expect(html).not.toContain('data-testid="missions-next"');
    expect(html).not.toContain("landing-missions__controls");
    expect(html).not.toMatch(/<script\b/);
  });

  it("emits an inline enhancement script guarded by controls and reduced-motion", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: sampleMissions },
    });

    expect(html).toContain("<script>");
    expect(html).toContain("prefers-reduced-motion: reduce");
    expect(html).toContain('data-mission-control="prev"');
    expect(html).toContain('data-mission-control="next"');
    // The script must fall back to scrollWidth when no card width
    // can be measured yet, so it does not throw on early ticks.
    expect(html).toContain("scrollWidth");
  });
});

describe("LandingMissions.astro — owned visitor contract", () => {
  it("uses the documented landing-mission-card compound class", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: sampleMissions },
    });
    expect(html).toContain('class="landing-mission-card"');
  });

  it("never renders placeholder mission cards from the OpenDesign draft", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: sampleMissions },
    });
    expect(html).not.toContain("Misión pendiente");
    expect(html).not.toContain("Incorporar nombre, logo, descripción breve");
    expect(html).not.toContain('href="#"');
  });
});
