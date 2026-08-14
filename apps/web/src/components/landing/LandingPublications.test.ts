// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LandingPublications from "./LandingPublications.astro";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe("LandingPublications.astro — honest static entry", () => {
  it("renders a real link to /publicaciones and never a placeholder href or anchor", async () => {
    const html = await container.renderToString(LandingPublications);

    expect(html).toContain('data-testid="publications-entry"');
    expect(html).toContain('class="landing-publications__inner"');
    expect(html).toContain('data-testid="publications-entry-link"');
    expect(html).toContain('href="/publicaciones"');
    expect(html).toContain("Ver todas las publicaciones");
    expect(html).not.toContain('href="#"');
    expect(html).not.toContain("PUBLICACIÓN PENDIENTE");
    expect(html).not.toContain("Próximamente, historias que muestran");
  });

  it("never references the OpenDesign CDN nor restores the legacy featured-payload markup", async () => {
    const html = await container.renderToString(LandingPublications);

    expect(html).not.toContain("/api/projects/");
    expect(html).not.toContain("workspaceId=");
    expect(html).not.toContain("featured-outing-section");
    expect(html).not.toContain("featured-posts-section");
  });
});
