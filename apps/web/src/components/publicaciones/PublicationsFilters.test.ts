// @vitest-environment node
import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Filters from "./PublicationsFilters.astro";

describe("PublicationsFilters", () => {
  it("preserves limit and marks the selected type", async () => {
    const html = await (
      await AstroContainer.create()
    ).renderToString(Filters, {
      request: new Request(
        "http://localhost/publicaciones?type=OUTING&limit=25",
      ),
    });
    expect(html).toContain('name="limit" value="25"');
    expect(html).toContain('value="OUTING" aria-pressed="true"');
    expect(html).toContain('value="POST" aria-pressed="false"');
  });
});
