// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LandingMissions from "./LandingMissions.astro";
import type { MissionListItem } from "../../lib/server/missions.js";

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
    heroPhrase: "Alpha phrase",
    status: "ACTIVE",
  },
  {
    id: "m-2",
    slug: "beta",
    title: "Beta mission",
    heroImageUrl: "/files/m-2-hero",
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
    expect(html).toMatch(/<h2[^>]*id="missions-title"[^>]*>Misiones<\/h2>/);
    expect(html).toContain("Ministerios y misiones");

    expect(html).toContain('href="/misiones/alpha"');
    expect(html).toContain("Alpha mission");
    expect(html).toContain("Alpha phrase");
    expect(html).toContain('src="/files/m-1-hero"');

    expect(html).toContain('href="/misiones/beta"');
    expect(html).toContain("Beta mission");
    expect(html).toContain("Beta phrase");
    expect(html).toContain('src="/files/m-2-hero"');

    expect(html).toContain('href="/misiones"');
    expect(html).toContain("Ver todas las misiones");
    expect(html.match(/public-mission-card/g)).toHaveLength(2);
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
    expect(html).not.toMatch(/public-mission-card/);
  });

  it("hides the entire section when the missions fetch failed (null)", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: null },
    });

    expect(html).not.toContain('data-testid="missions-section"');
    expect(html).not.toContain('id="misiones"');
    expect(html).not.toContain("Ver todas las misiones");
    expect(html).not.toContain("Alpha mission");
    expect(html).not.toMatch(/public-mission-card/);
  });

  it("never emits alarming failure copy in any state", async () => {
    for (const value of [null, [], sampleMissions]) {
      const html = await container.renderToString(LandingMissions, {
        props: { missions: value },
      });
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
        expect(html.toLowerCase()).not.toContain(leak);
      }
    }
  });
});

describe("LandingMissions.astro — owned visitor contract", () => {
  it("uses the documented public-mission-card and public-card compound classes", async () => {
    const html = await container.renderToString(LandingMissions, {
      props: { missions: sampleMissions },
    });
    expect(html).toContain('class="public-mission-card public-card"');
  });
});
