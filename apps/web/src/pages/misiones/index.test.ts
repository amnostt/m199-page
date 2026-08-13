// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Page from "./index.astro";

describe("missions SSR", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the active list and preserves validated pagination parameters", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "m-1",
              slug: "one",
              title: "One",
              heroImageUrl: "/files/f-1",
              heroPhrase: "Phrase",
              status: "ACTIVE",
            },
          ],
          page: 2,
          limit: 2,
          total: 3,
          hasMore: true,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      request: new Request("http://localhost/misiones?page=2&limit=2"),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("One");
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ search: "?page=2&limit=2" }),
    );
  });

  it("renders the controlled 503 state when the list fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("down", { status: 503 })),
    );

    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      request: new Request("http://localhost/misiones"),
    });

    expect(response.status).toBe(503);
    expect(await response.text()).toContain("No pudimos cargar las misiones.");
  });
});
