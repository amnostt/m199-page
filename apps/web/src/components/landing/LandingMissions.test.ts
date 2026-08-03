// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LandingMissions from "./LandingMissions.astro";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe("LandingMissions.astro", () => {
  it("reserves one labeled editorial focus at the missions destination", async () => {
    const html = await container.renderToString(LandingMissions);

    expect(html).toMatch(
      /<section[^>]*id="misiones"[^>]*aria-labelledby="missions-title"/,
    );
    expect(html).toContain('data-testid="missions-section"');
    expect(html).toMatch(/<h2[^>]*id="missions-title"[^>]*>Misiones<\/h2>/);
    expect(html).toContain("Ministerios y misiones");
    expect(html).toContain("Próximamente");
  });

  it("does not imply real mission data or interactive carousel controls", async () => {
    const html = await container.renderToString(LandingMissions);

    expect(html).toContain("Historias en preparación");
    expect(html).not.toMatch(/<button\b/);
    expect(html).not.toMatch(/<a\b/);
    expect(html).not.toMatch(/aria-(?:current|controls|live)=/);
    expect(html).not.toMatch(/\b0?1\s*\/\s*0?4\b/);
  });
});
