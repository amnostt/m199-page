// @vitest-environment node
import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import PublicationBadges from "./PublicationBadges.astro";

const publication = (type: string) => ({
  type,
  startDate: "2026-02-01T00:00:00.000Z",
  endDate: "2026-02-02T00:00:00.000Z",
  activityStatus: "COMPLETED",
  documentationStatus: "DOCUMENTED",
});

describe("PublicationBadges SSR", () => {
  it("renders no badges for POST", async () => {
    const html = await (
      await AstroContainer.create()
    ).renderToString(PublicationBadges, {
      props: { publication: publication("POST") },
    });
    expect(html).not.toContain('data-testid="publication-badges"');
  });

  it.each(["OUTING", "EVENT"])(
    "renders activity/date/documentation badges for %s",
    async (type) => {
      const html = await (
        await AstroContainer.create()
      ).renderToString(PublicationBadges, {
        props: { publication: publication(type) },
      });
      expect(html).toContain('data-testid="publication-badges"');
      expect(html).toContain("Actividad realizada");
      expect(html).toContain("Documentada");
      expect(html).toContain("2026");
    },
  );
});
