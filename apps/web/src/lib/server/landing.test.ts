// @vitest-environment node
//
// PR2 safe landing data — focused tests for:
//   - validateFeaturedVideoUrl — local FileAsset URL policy (LFV-2)
//   - fetchLandingPublicPayload — bounded fetch with controlled failure
//     mapping (Task 2.2 / A-007)
//
// The vitest config maps `src/lib/server/**` to the node environment.
import { describe, it, expect, vi } from "vitest";
import { requireHttpUrl } from "./env.js";
import {
  InvalidLandingPayloadError,
  LandingFetchError,
  fetchLandingPublicPayload,
  validateFeaturedVideoUrl,
  validateLandingPublicPayload,
} from "./landing.js";

const API_BASE = requireHttpUrl("http://localhost:3000");

// ---------------------------------------------------------------------------
// validateFeaturedVideoUrl — accept
// ---------------------------------------------------------------------------

describe("validateFeaturedVideoUrl — accept", () => {
  it.each([
    ["local FileAsset URL", "/files/video-001", "/files/video-001"],
    [
      "local UUID URL",
      "/files/550e8400-e29b-41d4-a716-446655440000",
      "/files/550e8400-e29b-41d4-a716-446655440000",
    ],
  ])("accepts %s", (_label, input, expected) => {
    expect(validateFeaturedVideoUrl(input)).toBe(expected);
  });

  it("trims surrounding whitespace", () => {
    expect(validateFeaturedVideoUrl("  /files/video-001  ")).toBe(
      "/files/video-001",
    );
  });
});

// ---------------------------------------------------------------------------
// validateFeaturedVideoUrl — omit
// ---------------------------------------------------------------------------

describe("validateFeaturedVideoUrl — omit", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["whitespace-only", "   "],
    ["non-string number", 123],
    ["non-string object", {}],
    ["non-string array", []],
    ["non-string boolean", true],
  ])("omits %s", (_label, value) => {
    expect(validateFeaturedVideoUrl(value)).toBeNull();
  });

  it.each([
    ["http origin", "http://localhost/files/video-001"],
    ["external https origin", "https://cdn.example.com/video.mp4"],
    ["javascript", "javascript:alert(1)"],
    ["empty local ID", "/files/"],
    ["nested local path", "/files/videos/video-001"],
    ["query", "/files/video-001?download=1"],
    ["fragment", "/files/video-001#fragment"],
    ["traversal", "/files/../video-001"],
    ["protocol-relative", "//files/video-001"],
  ])("omits %s URL", (_label, input) => {
    expect(validateFeaturedVideoUrl(input)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateLandingPublicPayload — video URL sanitization
// ---------------------------------------------------------------------------

const basePayload = () => ({
  heroTitle: "Misión 1-99",
  heroSubtitle: null,
  heroImageUrl: "/files/img-1",
  missionsTitle: null,
  missionsDescription: null,
  publicationsTitle: null,
  publicationsDescription: null,
  aboutTitle: null,
  mission: null,
  vision: null,
  description: null,
  featuredVideoUrl: null,
  contactTitle: null,
  contactDescription: null,
  contactEmail: null,
  contactPhone: null,
  visualBreakImageUrl: null,
  currentVerse: null,
});

describe("validateLandingPublicPayload — video URL sanitization", () => {
  it("keeps a valid local FileAsset URL", () => {
    const payload = validateLandingPublicPayload({
      ...basePayload(),
      featuredVideoUrl: "/files/video-001",
    });
    expect(payload.featuredVideoUrl).toBe("/files/video-001");
  });

  it("omits an external video URL even when the rest of the payload is valid", () => {
    const payload = validateLandingPublicPayload({
      ...basePayload(),
      featuredVideoUrl: "https://evil.example.com/embed",
    });
    expect(payload.featuredVideoUrl).toBeNull();
  });

  it("preserves null featuredVideoUrl and rejects a wrong type", () => {
    const payload = validateLandingPublicPayload({
      ...basePayload(),
      featuredVideoUrl: null,
    });
    expect(payload.featuredVideoUrl).toBeNull();
    expect(() =>
      validateLandingPublicPayload({ ...basePayload(), featuredVideoUrl: 42 }),
    ).toThrow(InvalidLandingPayloadError);
  });
});

// ---------------------------------------------------------------------------
// validateLandingPublicPayload — structural validation
// ---------------------------------------------------------------------------

describe("validateLandingPublicPayload — structural validation", () => {
  const full = () => ({
    ...basePayload(),
    heroSubtitle: "Transformamos vidas",
    mission: "Alcanzar",
    vision: "Ver cada vida transformada",
    description: "Somos una comunidad de fe",
    missionsTitle: "Proyectos reales.",
    missionsDescription: "Cada salida y servicio",
    publicationsTitle: "Lo que estamos viviendo.",
    publicationsDescription: "Historias de la misión",
    aboutTitle: "No esperamos.\nSalimos.",
    contactTitle: "Hablemos.\nVamos juntos.",
    contactDescription: "Hablemos sobre la misión.",
    contactEmail: "contacto@m199.org",
    contactPhone: "+54 11 1234-5678",
    visualBreakImageUrl: "/files/break-1",
    currentVerse: {
      text: "Id por todo el mundo",
      reference: "Marcos 16:15",
    },
  });

  it("accepts a fully-populated payload", () => {
    const payload = validateLandingPublicPayload(full());
    expect(payload.currentVerse?.reference).toBe("Marcos 16:15");
  });

  it.each([
    ["non-object root string", "not a payload"],
    ["non-object root null", null],
    [
      "currentVerse missing fields",
      { ...full(), currentVerse: { text: "Id" } },
    ],
    ["non-nullable field set to number", { ...full(), heroTitle: 42 }],
  ])("rejects %s", (_label, input) => {
    expect(() => validateLandingPublicPayload(input)).toThrow(
      InvalidLandingPayloadError,
    );
  });
});

// ---------------------------------------------------------------------------
// fetchLandingPublicPayload — happy path
// ---------------------------------------------------------------------------

const validPayload = {
  heroTitle: "Misión 1-99",
  heroSubtitle: null,
  heroImageUrl: "/files/img-1",
  missionsTitle: null,
  missionsDescription: null,
  publicationsTitle: null,
  publicationsDescription: null,
  aboutTitle: null,
  mission: "Alcanzar",
  vision: null,
  description: null,
  featuredVideoUrl: "/files/video-001",
  contactTitle: null,
  contactDescription: null,
  contactEmail: null,
  contactPhone: null,
  visualBreakImageUrl: null,
  currentVerse: null,
};

function okJsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  } as unknown as Response;
}

describe("fetchLandingPublicPayload — happy path", () => {
  it("returns the validated payload on 2xx JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okJsonResponse(validPayload));
    const result = await fetchLandingPublicPayload({
      apiBaseUrl: API_BASE,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.featuredVideoUrl).toBe("/files/video-001");
    expect(result.heroTitle).toBe("Misión 1-99");
  });

  it("calls the resolved landing endpoint with Accept JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okJsonResponse(validPayload));
    await fetchLandingPublicPayload({
      apiBaseUrl: API_BASE,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/landing/public",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("sanitizes an external video URL through the local path policy", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      okJsonResponse({
        ...validPayload,
        featuredVideoUrl: "https://evil.example.com/embed",
      }),
    );
    const result = await fetchLandingPublicPayload({
      apiBaseUrl: API_BASE,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.featuredVideoUrl).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchLandingPublicPayload — failure mapping
// ---------------------------------------------------------------------------

describe("fetchLandingPublicPayload — failure mapping", () => {
  it("maps HTTP 500 to http_error with status 500", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(
      fetchLandingPublicPayload({
        apiBaseUrl: API_BASE,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({
      name: "LandingFetchError",
      reason: "http_error",
      status: 500,
    });
  });

  it("maps HTTP 404 to a controlled LandingFetchError", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(
      fetchLandingPublicPayload({
        apiBaseUrl: API_BASE,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(LandingFetchError);
  });

  it("maps a network error to reason 'network'", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new TypeError("connection refused"));
    await expect(
      fetchLandingPublicPayload({
        apiBaseUrl: API_BASE,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ name: "LandingFetchError", reason: "network" });
  });

  it("maps a JSON parse error to reason 'invalid_payload'", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    });
    await expect(
      fetchLandingPublicPayload({
        apiBaseUrl: API_BASE,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({
      name: "LandingFetchError",
      reason: "invalid_payload",
    });
  });

  it("maps a payload missing required structural fields to 'invalid_payload'", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        okJsonResponse({ ...validPayload, currentVerse: { text: "Id" } }),
      );
    await expect(
      fetchLandingPublicPayload({
        apiBaseUrl: API_BASE,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ reason: "invalid_payload" });
  });

  it("maps a non-object payload to 'invalid_payload'", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(okJsonResponse("not a payload"));
    await expect(
      fetchLandingPublicPayload({
        apiBaseUrl: API_BASE,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ reason: "invalid_payload" });
  });
});

// ---------------------------------------------------------------------------
// fetchLandingPublicPayload — timeout and abort
// ---------------------------------------------------------------------------

describe("fetchLandingPublicPayload — timeout and abort", () => {
  it("maps a timeout to reason 'timeout' and aborts the request", async () => {
    // A 5ms real-time timeout is fast and avoids the unhandled-
    // rejection boundary that fake timers leak when the AbortError
    // listener fires after the assertion.
    const fetchImpl = vi.fn().mockImplementation(
      (_url: string, init: { signal: AbortSignal }): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );
    await expect(
      fetchLandingPublicPayload({
        apiBaseUrl: API_BASE,
        timeoutMs: 5,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({
      name: "LandingFetchError",
      reason: "timeout",
    });
  });

  it("clears the internal timer once the request resolves", async () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const fetchImpl = vi.fn().mockResolvedValue(okJsonResponse(validPayload));
    try {
      await fetchLandingPublicPayload({
        apiBaseUrl: API_BASE,
        timeoutMs: 1_000,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(clearSpy).toHaveBeenCalled();
    } finally {
      clearSpy.mockRestore();
    }
  });

  it("rejects an invalid timeoutMs with a controlled failure", async () => {
    await expect(
      fetchLandingPublicPayload({
        apiBaseUrl: API_BASE,
        timeoutMs: 0,
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(LandingFetchError);
  });
});
