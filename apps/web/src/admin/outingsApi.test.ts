// ---------------------------------------------------------------------------
// outingsApi unit tests (Task 1.1 — RED)
//
// Covers:
// - listOutings: builds /outings/admin?status=... URL with credentials
// - listOutings: builds /outings/admin URL when no status provided
// - formatOutingDateTime: ISO → datetime-local HTML input format
// - parseOutingDateTime: datetime-local HTML input format → ISO (UTC)
// - buildOutingPayload: form → API body, including ISO dateTime conversion
//   and optional asset IDs (null values omitted from body)
// - updateOuting: PATCH payload OMITS null asset IDs so the server preserves
//   existing asset references (WU1 review follow-up — "Existing assets are
//   retained" scenario). createOuting POST payload keeps the default
//   behavior of including null asset IDs (create semantics preserved).
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listOutings,
  formatOutingDateTime,
  parseOutingDateTime,
  buildOutingPayload,
  createOuting,
  updateOuting,
  featureOuting,
  clearFeaturedOuting,
} from "./outingsApi.js";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// listOutings — server-filtered list
// ---------------------------------------------------------------------------

describe("listOutings", () => {
  it("GETs /outings/admin without status query when no filter provided", async () => {
    const mockRows = [
      {
        id: "out-1",
        slug: "camp-day",
        title: "Camp Day",
        dateTime: "2026-07-15T10:00:00.000Z",
        location: "Barrio Norte",
        description: "A great day",
        status: "DRAFT",
        mainImageId: null,
        croquisId: null,
        planId: null,
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRows),
    });

    const result = await listOutings();

    expect(result).toEqual(mockRows);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/outings/admin",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("GETs /outings/admin?status=PUBLISHED when status is PUBLISHED", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await listOutings("PUBLISHED");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/outings/admin?status=PUBLISHED",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("GETs /outings/admin?status=DRAFT when status is DRAFT", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await listOutings("DRAFT");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/outings/admin?status=DRAFT",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("GETs /outings/admin?status=ARCHIVED when status is ARCHIVED", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await listOutings("ARCHIVED");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/outings/admin?status=ARCHIVED",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("throws AdminRequestError when fetch returns 400 with JSON validation error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      headers: {
        get: (key: string) =>
          key === "content-type" ? "application/json" : null,
      },
      json: () =>
        Promise.resolve({
          message: ["status must be one of: DRAFT, PUBLISHED, ARCHIVED"],
          error: "Bad Request",
          statusCode: 400,
        }),
    });

    await expect(listOutings("DRAFT")).rejects.toThrow(
      "status must be one of: DRAFT, PUBLISHED, ARCHIVED",
    );
  });
});

// ---------------------------------------------------------------------------
// formatOutingDateTime — ISO string → datetime-local input value
// ---------------------------------------------------------------------------

describe("formatOutingDateTime", () => {
  it("formats an ISO string to YYYY-MM-DDTHH:mm (datetime-local)", () => {
    expect(formatOutingDateTime("2026-07-15T10:00:00.000Z")).toBe(
      "2026-07-15T10:00",
    );
  });

  it("formats an ISO string with minutes: 13:45 → 13:45", () => {
    expect(formatOutingDateTime("2026-12-01T13:45:00.000Z")).toBe(
      "2026-12-01T13:45",
    );
  });

  it("returns empty string for null input", () => {
    expect(formatOutingDateTime(null)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(formatOutingDateTime(undefined)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(formatOutingDateTime("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// parseOutingDateTime — datetime-local input value → ISO string (UTC)
// ---------------------------------------------------------------------------

describe("parseOutingDateTime", () => {
  it("parses YYYY-MM-DDTHH:mm to a UTC ISO string", () => {
    expect(parseOutingDateTime("2026-07-15T10:00")).toBe(
      "2026-07-15T10:00:00.000Z",
    );
  });

  it("parses with explicit minutes 13:45", () => {
    expect(parseOutingDateTime("2026-12-01T13:45")).toBe(
      "2026-12-01T13:45:00.000Z",
    );
  });

  it("returns null for null input", () => {
    expect(parseOutingDateTime(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseOutingDateTime(undefined)).toBeNull();
  });

  it("returns null for empty string input", () => {
    expect(parseOutingDateTime("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildOutingPayload — OutingForm → API body
// ---------------------------------------------------------------------------

describe("buildOutingPayload", () => {
  it("builds payload with parsed ISO dateTime and string status", () => {
    const payload = buildOutingPayload({
      title: "Camp Day",
      slug: "camp-day",
      dateTime: "2026-07-15T10:00",
      location: "Barrio Norte",
      description: "A great day",
      mainImageId: null,
      croquisId: null,
      planId: null,
      status: "DRAFT",
    });

    expect(payload).toEqual({
      title: "Camp Day",
      slug: "camp-day",
      dateTime: "2026-07-15T10:00:00.000Z",
      location: "Barrio Norte",
      description: "A great day",
      mainImageId: null,
      croquisId: null,
      planId: null,
      status: "DRAFT",
    });
  });

  it("includes mainImageId, croquisId, planId when set", () => {
    const payload = buildOutingPayload({
      title: "Camp Day",
      slug: "camp-day",
      dateTime: "2026-07-15T10:00",
      location: "Barrio Norte",
      description: "A great day",
      mainImageId: "img-1",
      croquisId: "croq-1",
      planId: "plan-1",
      status: "PUBLISHED",
    });

    expect(payload.mainImageId).toBe("img-1");
    expect(payload.croquisId).toBe("croq-1");
    expect(payload.planId).toBe("plan-1");
    expect(payload.status).toBe("PUBLISHED");
  });

  it("preserves PUBLISHED status verbatim", () => {
    const payload = buildOutingPayload({
      title: "Camp Day",
      slug: "camp-day",
      dateTime: "2026-07-15T10:00",
      location: "Barrio Norte",
      description: "A great day",
      mainImageId: null,
      croquisId: null,
      planId: null,
      status: "PUBLISHED",
    });

    expect(payload.status).toBe("PUBLISHED");
  });
});

// ---------------------------------------------------------------------------
// buildOutingPayload — PATCH (update) omit-null-assets option
//
// WU1 review follow-up: on PATCH, the API's OutingsService.update() uses
// `if (dto.mainImageId !== undefined) data.mainImageId = dto.mainImageId`,
// which means a body that includes `mainImageId: null` CLEARS the asset
// on the server. To satisfy the "Existing assets are retained" spec
// scenario, the PATCH payload must OMIT null asset IDs so the server keeps
// the existing values. The create payload keeps the documented default
// (null is the explicit unset value on create).
// ---------------------------------------------------------------------------

describe("buildOutingPayload (omitNullAssets — PATCH preserve-assets)", () => {
  it("omits all three null asset keys when omitNullAssets is true", () => {
    const payload = buildOutingPayload(
      {
        title: "Camp Day",
        slug: "camp-day",
        dateTime: "2026-07-15T10:00",
        location: "Barrio Norte",
        description: "A great day",
        mainImageId: null,
        croquisId: null,
        planId: null,
        status: "DRAFT",
      },
      { omitNullAssets: true },
    );

    expect("mainImageId" in payload).toBe(false);
    expect("croquisId" in payload).toBe(false);
    expect("planId" in payload).toBe(false);
  });

  it("keeps non-null asset keys when omitNullAssets is true", () => {
    const payload = buildOutingPayload(
      {
        title: "Camp Day",
        slug: "camp-day",
        dateTime: "2026-07-15T10:00",
        location: "Barrio Norte",
        description: "A great day",
        mainImageId: "img-1",
        croquisId: "croq-1",
        planId: "plan-1",
        status: "PUBLISHED",
      },
      { omitNullAssets: true },
    );

    expect(payload.mainImageId).toBe("img-1");
    expect(payload.croquisId).toBe("croq-1");
    expect(payload.planId).toBe("plan-1");
  });

  it("omits only the null asset keys when some are set (mixed)", () => {
    const payload = buildOutingPayload(
      {
        title: "Camp Day",
        slug: "camp-day",
        dateTime: "2026-07-15T10:00",
        location: "Barrio Norte",
        description: "A great day",
        mainImageId: "img-1",
        croquisId: null,
        planId: "plan-1",
        status: "DRAFT",
      },
      { omitNullAssets: true },
    );

    expect(payload.mainImageId).toBe("img-1");
    expect("croquisId" in payload).toBe(false);
    expect(payload.planId).toBe("plan-1");
  });

  it("still includes parsed ISO dateTime, status, and required fields when omitNullAssets is true", () => {
    const payload = buildOutingPayload(
      {
        title: "Camp Day",
        slug: "camp-day",
        dateTime: "2026-07-15T10:00",
        location: "Barrio Norte",
        description: "A great day",
        mainImageId: null,
        croquisId: null,
        planId: null,
        status: "DRAFT",
      },
      { omitNullAssets: true },
    );

    expect(payload.title).toBe("Camp Day");
    expect(payload.slug).toBe("camp-day");
    expect(payload.dateTime).toBe("2026-07-15T10:00:00.000Z");
    expect(payload.location).toBe("Barrio Norte");
    expect(payload.description).toBe("A great day");
    expect(payload.status).toBe("DRAFT");
  });

  it("defaults to including null asset keys (create semantics preserved)", () => {
    const payload = buildOutingPayload({
      title: "Camp Day",
      slug: "camp-day",
      dateTime: "2026-07-15T10:00",
      location: "Barrio Norte",
      description: "A great day",
      mainImageId: null,
      croquisId: null,
      planId: null,
      status: "DRAFT",
    });

    expect(payload).toEqual({
      title: "Camp Day",
      slug: "camp-day",
      dateTime: "2026-07-15T10:00:00.000Z",
      location: "Barrio Norte",
      description: "A great day",
      mainImageId: null,
      croquisId: null,
      planId: null,
      status: "DRAFT",
    });
  });
});

// ---------------------------------------------------------------------------
// updateOuting — PATCH body omits null asset IDs
// ---------------------------------------------------------------------------

describe("updateOuting (PATCH — preserve-assets)", () => {
  it("PATCH body OMITS null asset IDs so the server preserves existing assets", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "out-1",
          slug: "camp-day",
          title: "Camp Day",
          dateTime: "2026-07-15T10:00:00.000Z",
          location: "Barrio Norte",
          description: "A great day",
          status: "DRAFT",
          mainImageId: null,
          croquisId: null,
          planId: null,
        }),
    });

    await updateOuting("out-1", {
      title: "Camp Day — Updated Title",
      slug: "camp-day",
      dateTime: "2026-07-15T10:00",
      location: "Barrio Norte",
      description: "A great day",
      mainImageId: null,
      croquisId: null,
      planId: null,
      status: "DRAFT",
    });

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const body = JSON.parse(fetchCall![1].body as string) as Record<
      string,
      unknown
    >;

    expect("mainImageId" in body).toBe(false);
    expect("croquisId" in body).toBe(false);
    expect("planId" in body).toBe(false);
    expect(body.title).toBe("Camp Day — Updated Title");
    expect(body.slug).toBe("camp-day");
    expect(body.status).toBe("DRAFT");
  });

  it("PATCH body INCLUDES non-null asset IDs so the server updates them", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "out-1",
          slug: "camp-day",
          title: "Camp Day",
          dateTime: "2026-07-15T10:00:00.000Z",
          location: "Barrio Norte",
          description: "A great day",
          status: "DRAFT",
          mainImageId: "img-2",
          croquisId: "croq-1",
          planId: null,
        }),
    });

    await updateOuting("out-1", {
      title: "Camp Day",
      slug: "camp-day",
      dateTime: "2026-07-15T10:00",
      location: "Barrio Norte",
      description: "A great day",
      mainImageId: "img-2",
      croquisId: "croq-1",
      planId: null,
      status: "DRAFT",
    });

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const body = JSON.parse(fetchCall![1].body as string) as Record<
      string,
      unknown
    >;

    expect(body.mainImageId).toBe("img-2");
    expect(body.croquisId).toBe("croq-1");
    expect("planId" in body).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createOuting — POST body keeps null asset IDs (create semantics preserved)
// ---------------------------------------------------------------------------

describe("createOuting (POST — create semantics preserved)", () => {
  it("POST body STILL INCLUDES null asset IDs so create behavior is unchanged", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "out-new",
          slug: "camp-day",
          title: "Camp Day",
          dateTime: "2026-07-15T10:00:00.000Z",
          location: "Barrio Norte",
          description: "A great day",
          status: "DRAFT",
          mainImageId: null,
          croquisId: null,
          planId: null,
        }),
    });

    await createOuting({
      title: "Camp Day",
      slug: "camp-day",
      dateTime: "2026-07-15T10:00",
      location: "Barrio Norte",
      description: "A great day",
      mainImageId: null,
      croquisId: null,
      planId: null,
      status: "DRAFT",
    });

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const body = JSON.parse(fetchCall![1].body as string) as Record<
      string,
      unknown
    >;

    expect(body.mainImageId).toBeNull();
    expect(body.croquisId).toBeNull();
    expect(body.planId).toBeNull();
    expect(body.title).toBe("Camp Day");
    expect(body.status).toBe("DRAFT");
  });
});

describe("featured outing mutations", () => {
  it("POSTs selection and DELETEs clear through the outings endpoints", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ featuredOutingId: "out-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ featuredOutingId: null }),
      });

    await expect(featureOuting("out-1")).resolves.toEqual({
      featuredOutingId: "out-1",
    });
    await expect(clearFeaturedOuting()).resolves.toEqual({
      featuredOutingId: null,
    });

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      "/outings/admin/out-1/feature",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      "/outings/admin/feature",
      expect.objectContaining({ method: "DELETE", credentials: "include" }),
    );
  });
});
