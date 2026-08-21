// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Page from "./index.astro";

const LANDING_PAYLOAD = {
  heroTitle: "Misión 1-99",
  heroSubtitle: "Transformamos vidas",
  heroImageUrl: "/files/hero",
  mission: "Alcanzar a cada persona",
  vision: "Ver cada vida transformada",
  description: "Somos una comunidad de fe",
  featuredVideoUrl: null,
  contactEmail: "contacto@m199.org",
  contactPhone: "+54 11 1234-5678",
  currentVerse: {
    text: "Id por todo el mundo",
    reference: "Marcos 16:15",
  },
};

const MISSIONS_PAYLOAD = {
  items: [
    {
      id: "m-1",
      slug: "alpha",
      title: "Alpha mission",
      heroImageUrl: "/files/m-1-hero",
      profileImageUrl: "/files/m-1-profile",
      heroPhrase: "Alpha phrase",
      status: "ACTIVE",
    },
    {
      id: "m-2",
      slug: "beta",
      title: "Beta mission",
      heroImageUrl: "/files/m-2-hero",
      profileImageUrl: null,
      heroPhrase: "Beta phrase",
      status: "ACTIVE",
    },
  ],
  page: 1,
  limit: 10,
  total: 2,
  hasMore: false,
};

type Behavior = (
  url: URL,
) => Response | Promise<Response> | Error | Promise<Error>;

function makeFetch(behavior: Behavior): typeof fetch {
  return vi.fn().mockImplementation(async (input) => {
    const url = typeof input === "string" ? new URL(input) : input;
    const result = await behavior(url);
    if (result instanceof Error) throw result;
    return result;
  });
}

function scriptless(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
}

describe("index.astro — independent landing + missions fetch", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("ASTRO_API_BASE_URL", "http://api.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    warnSpy.mockRestore();
  });

  it("returns 200 with the landing root and the missions section when both fetches succeed", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch((url) => {
        if (url.pathname === "/landing/public") {
          return new Response(JSON.stringify(LANDING_PAYLOAD), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.pathname === "/missions/public") {
          return new Response(JSON.stringify(MISSIONS_PAYLOAD), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      request: new Request("http://localhost/"),
    });

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('data-testid="landing-page"');
    expect(html).toContain('data-testid="missions-section"');
    expect(html).toContain("Misión 1-99");
    expect(html).toContain("Transformamos vidas");
    expect(html).toContain('href="/misiones/alpha"');
    expect(html).toContain("Alpha mission");
    expect(html).toContain('href="/misiones"');
    expect(html).toContain("Ver todas las misiones");
    expect(html).not.toContain('data-testid="landing-error"');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["http_error", new Response("down", { status: 503 })],
    ["network", new TypeError("network failure")],
    ["invalid_payload", new Response("{not-json", { status: 200 })],
  ] as const)(
    "isolates a missions-only failure (%s): status 200, missions hidden, non-Mission content preserved, one sanitized server warning",
    async (_label, failure) => {
      vi.stubGlobal(
        "fetch",
        makeFetch((url) => {
          if (url.pathname === "/landing/public") {
            return new Response(JSON.stringify(LANDING_PAYLOAD), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
          if (url.pathname === "/missions/public") {
            if (failure instanceof Error) throw failure;
            return failure;
          }
          return new Response("not found", { status: 404 });
        }),
      );

      const response = await (
        await AstroContainer.create()
      ).renderToResponse(Page, {
        request: new Request("http://localhost/"),
      });

      expect(response.status).toBe(200);
      const html = await response.text();

      expect(html).toContain('data-testid="landing-page"');
      expect(html).toContain("Misión 1-99");
      expect(html).toContain("Transformamos vidas");
      expect(html).toContain("Somos una comunidad de fe");

      expect(html).not.toContain('data-testid="missions-section"');
      expect(html).not.toContain("Alpha mission");
      expect(html).not.toContain("Beta mission");
      expect(html).not.toContain("Ver todas las misiones");
      expect(html).not.toContain('id="misiones"');

      expect(html).not.toContain('data-testid="landing-error"');

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const [firstArg, secondArg] = warnSpy.mock.calls[0] ?? [];
      expect(firstArg).toBe("Landing missions fetch failed");
      const sanitized = JSON.parse(JSON.stringify(secondArg));
      expect(typeof sanitized?.reason).toBe("string");
      expect((sanitized.reason as string).length).toBeGreaterThan(0);
      const reason = sanitized.reason as string;
      for (const leak of [
        "http://",
        "https://",
        "localhost",
        "127.0.0.1",
        "api.test",
        "stack",
        "cause",
        ":3000",
      ]) {
        expect(reason).not.toContain(leak);
      }
    },
  );

  it("preserves the existing 503 landing behavior when the landing payload fails", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch((url) => {
        if (url.pathname === "/landing/public") {
          return new Response("down", { status: 503 });
        }
        if (url.pathname === "/missions/public") {
          return new Response(JSON.stringify(MISSIONS_PAYLOAD), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      request: new Request("http://localhost/"),
    });

    expect(response.status).toBe(503);
    const html = await response.text();
    expect(html).toContain('data-testid="landing-error"');
    expect(html).not.toContain('data-testid="landing-page"');
    expect(html).not.toContain('data-testid="missions-section"');
    expect(html).toContain("La página no se puede cargar en este momento");
  });
});

describe("index.astro — landing SSR boundaries", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("ASTRO_API_BASE_URL", "http://api.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("never echoes the API host, status, stack, or any classified reason into the rendered HTML on a landing failure", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch((url) => {
        if (url.pathname === "/landing/public") {
          return new Response("down", { status: 503 });
        }
        if (url.pathname === "/missions/public") {
          return new Response(JSON.stringify(MISSIONS_PAYLOAD), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const response = await (
      await AstroContainer.create()
    ).renderToResponse(Page, {
      request: new Request("http://localhost/"),
    });

    const html = scriptless(await response.text());
    for (const leak of [
      "api.test",
      "localhost",
      "127.0.0.1",
      "stack",
      "cause",
      "LandingFetchError",
      "MissionsFetchError",
      "http_error",
      "invalid_payload",
      "timeout",
      "network",
    ]) {
      expect(html.toLowerCase()).not.toContain(leak);
    }
  });
});
