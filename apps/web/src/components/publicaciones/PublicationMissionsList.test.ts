// @vitest-environment node
import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import PublicationMissionsList from "./PublicationMissionsList.astro";

describe("PublicationMissionsList SSR", () => {
  it("renders no section when the publication has no associated missions", async () => {
    const html = await (
      await AstroContainer.create()
    ).renderToString(PublicationMissionsList, {
      props: { missions: [] },
    });
    expect(html).not.toContain('data-testid="publication-missions"');
    expect(html).not.toContain("Misiones asociadas");
  });

  it("renders a single ACTIVE link without a finished marker", async () => {
    const html = await (
      await AstroContainer.create()
    ).renderToString(PublicationMissionsList, {
      props: {
        missions: [
          {
            slug: "alpha",
            title: "Alpha mission",
            status: "ACTIVE",
            profileImageUrl: null,
          },
        ],
      },
    });
    expect(html).toContain('data-testid="publication-missions"');
    expect(html).toContain('href="/misiones/alpha"');
    expect(html).toContain("Alpha mission");
    expect(html).not.toContain("Misión finalizada");
  });

  it("renders mixed ACTIVE and ARCHIVED links with the finished marker only on ARCHIVED rows", async () => {
    const html = await (
      await AstroContainer.create()
    ).renderToString(PublicationMissionsList, {
      props: {
        missions: [
          {
            slug: "alpha",
            title: "Alpha mission",
            status: "ACTIVE",
            profileImageUrl: "/files/alpha-logo",
          },
          {
            slug: "beta",
            title: "Beta mission",
            status: "ARCHIVED",
            profileImageUrl: null,
          },
        ],
      },
    });
    expect(html).toContain('data-testid="publication-missions"');
    expect(html).toContain('href="/misiones/alpha"');
    expect(html).toContain('href="/misiones/beta"');
    expect(html).toContain("Alpha mission");
    expect(html).toContain("Beta mission");
    const alphaIndex = html.indexOf("Alpha mission");
    const betaIndex = html.indexOf("Beta mission");
    expect(alphaIndex).toBeGreaterThan(-1);
    expect(betaIndex).toBeGreaterThan(-1);
    expect(html.slice(alphaIndex, betaIndex)).not.toContain(
      "Misión finalizada",
    );
    expect(html.slice(betaIndex)).toContain("Misión finalizada");
    expect(html).toContain('data-testid="publication-mission-logo"');
    expect(html).toContain('src="/files/alpha-logo"');
    expect(html).not.toContain('src="/files/beta-logo"');
  });
});
