// @vitest-environment node

import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, it } from "vitest";
import PostContent from "./PostContent.astro";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe("PostContent", () => {
  it("sanitizes untrusted HTML before rendering the initial response", async () => {
    const html = await container.renderToString(PostContent, {
      props: {
        html: '<p>Safe</p><img src="x" onerror="alert(1)"><a href="javascript:alert(1)" onclick="alert(1)">Link</a>',
        testId: "post-content",
      },
    });

    expect(html).toContain("<p>Safe</p>");
    expect(html).toContain(">Link</a>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("javascript:");
  });
});
