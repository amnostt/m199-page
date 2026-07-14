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
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listOutings,
  formatOutingDateTime,
  parseOutingDateTime,
  buildOutingPayload,
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
