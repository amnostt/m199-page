// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
vi.mock("../../lib/sanitize.js", () => ({
  sanitizeAndMakeSafe: (html: string) =>
    html.replace(/<script[^>]*>.*?<\/script>/gs, ""),
}));
import Page from "./[slug].astro";

const detail = (type: string) => ({
  slug: "demo",
  title: "Demo",
  excerpt: "Intro",
  content: "<p>Body</p><script>bad()</script>",
  type,
  publishedAt: "2026-01-01T00:00:00.000Z",
  featuredImageUrl: null,
  startDate: "2026-02-01T00:00:00.000Z",
  endDate: null,
  activityStatus: "COMPLETED",
  documentationStatus: "DOCUMENTED",
});
describe("publication detail SSR", () => {
  it.each(["POST", "OUTING", "EVENT"])("renders %s", async (type) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(detail(type)))),
    );
    const html = await (
      await AstroContainer.create()
    ).renderToString(Page, {
      params: { slug: "demo" },
      request: new Request("http://localhost/publicaciones/demo"),
    });
    expect(html).toContain("Demo");
    expect(html).toContain("Body");
    expect(html.includes('data-testid="publication-badges"')).toBe(
      type !== "POST",
    );
    expect(html).not.toContain("<script>");
  });
  it("renders a controlled failure", async () => {
    for (const failure of [
      new Response("unavailable", { status: 503 }),
      new TypeError("network failure"),
      new Response(JSON.stringify({ invalid: true })),
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async () => {
          if (failure instanceof Error) throw failure;
          return failure;
        }),
      );
      const response = await (
        await AstroContainer.create()
      ).renderToResponse(Page, {
        params: { slug: "missing" },
        request: new Request("http://localhost/publicaciones/missing"),
      });
      expect(response.status).toBe(503);
      expect(await response.text()).toContain(
        "No pudimos cargar esta publicación.",
      );
    }
  });
});
