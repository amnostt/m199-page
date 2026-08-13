// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Page from "./[slug].astro";

const activeDetail = {
  id: "m-1",
  slug: "one",
  title: "One",
  heroImageUrl: "/files/f-1",
  heroPhrase: "Phrase",
  status: "ACTIVE",
  finished: false,
  publications: [],
  gallery: [],
};

describe("mission detail SSR", () => {
  it("renders the active mission detail with the closed public projection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(activeDetail))),
    );
    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      params: { slug: "one" },
      request: new Request("http://localhost/misiones/one"),
    });
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("One");
    expect(html).toContain("Phrase");
    expect(html).toContain('data-testid="mission-detail"');
    expect(html).not.toContain('data-testid="mission-detail-error"');
  });

  it("returns 503 with the visitor-safe fallback for upstream, network, and invalid payloads", async () => {
    for (const failure of [
      new Response("down", { status: 503 }),
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
        params: { slug: "one" },
        request: new Request("http://localhost/misiones/one"),
      });
      expect(response.status).toBe(503);
      const html = await response.text();
      expect(html).toContain('data-testid="mission-detail-error"');
      expect(html).toContain("No pudimos cargar la misión");
    }
  });

  it("renders an archived mission with the finished badge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...activeDetail,
            status: "ARCHIVED",
            finished: true,
          }),
        ),
      ),
    );
    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      params: { slug: "archived" },
      request: new Request("http://localhost/misiones/archived"),
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Misión finalizada");
  });

  it("returns the visitor-safe 404 for missing slugs", async () => {
    const slug = "missing";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not found", { status: 404 })),
    );
    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      params: { slug },
      request: new Request(`http://localhost/misiones/${slug}`),
    });
    expect(response.status).toBe(404);
    const html = await response.text();
    expect(html).toContain('data-testid="mission-detail-error"');
    expect(html).toContain("Misión no encontrada");
  });
});
