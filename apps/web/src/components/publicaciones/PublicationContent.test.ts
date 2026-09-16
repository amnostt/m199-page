// @vitest-environment node
import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import PublicationContent from "./PublicationContent.astro";

const render = (props: Record<string, string>) =>
  AstroContainer.create().then((container) =>
    container.renderToString(PublicationContent, { props }),
  );

describe("PublicationContent SSR", () => {
  it("always renders POST content", async () => {
    const html = await render({ type: "POST", content: "<p>News</p>" });
    expect(html).toContain("News");
  });

  it.each([
    ["OUTING", "COMPLETED"],
    ["EVENT", "COMPLETED"],
  ])("renders completed %s content", async (type, activityStatus) => {
    const html = await render({ type, activityStatus, content: "<p>Done</p>" });
    expect(html).toContain("Done");
    expect(html).not.toContain("publication-content-placeholder");
  });

  it.each(["UPCOMING", "CANCELLED"])(
    "always renders %s content",
    async (activityStatus) => {
      const html = await render({
        type: "OUTING",
        activityStatus,
        content: "<p>Hidden</p>",
      });
      expect(html).toContain("Hidden");
      expect(html).not.toContain("publication-content-placeholder");
    },
  );

  it("sanitizes unsafe markup before rendering", async () => {
    const html = await render({
      type: "POST",
      content:
        '<p>Safe</p><script>alert("x")</script><a href="javascript:bad">Bad</a>',
    });
    expect(html).toContain("Safe");
    expect(html).not.toContain("script");
    expect(html).not.toContain("javascript:");
  });
});
