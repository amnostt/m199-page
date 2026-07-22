// ---------------------------------------------------------------------------
// OutingFormPage component tests (Task 3.1 — RED)
//
// WU3 / Phase 3 — OutingFormPage tests.
//
// Covers the four spec scenarios from the delta specs and the design's
// OutingFormPage surface:
//
// - "Filtered list and form submission" — create/edit form shows every
//   API-supported field and reflects the server-returned outing state.
//
// - "Lifecycle action succeeds" — confirmed Draft and Publish saves submit
//   status=DRAFT/PUBLISHED through POST /outings/admin (create) or
//   PATCH /outings/admin/:id (edit), and onSaved fires when the server
//   accepts the action.
//
// - "Server rejects a lifecycle or form request" — the form shows the
//   parsed server validation error and does NOT claim success (does not
//   invoke onSaved).
//
// - "Existing assets are retained" — when editing an outing with existing
//   asset references, the references are pre-selected in the form, the
//   PATCH body omits null asset IDs (preserve-assets), and the form
//   exposes no clearing control for existing assets (per the design's
//   decision to defer removal until API clearing semantics are confirmed).
//
// Additional WU3 design surface:
// - Three FileUploadWidget slots (OUTING_MAIN_IMAGE, OUTING_CROQUIS,
//   OUTING_PLAN) — each category routed via the file-module API.
// - ISO dateTime conversion: HTML datetime-local input on the form,
//   ISO 8601 UTC in the request body, no timezone shifts.
// - Status select offers DRAFT and PUBLISHED only — ARCHIVED is reached
//   only via the list page's archive action.
// - Cancel button returns to the list (calls onCancel).
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { OutingFormPage } from "./OutingFormPage.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Existing outing loaded by the edit-mode GET /outings/admin/:id call. */
const MOCK_EXISTING_OUTING = {
  id: "o-existing",
  slug: "camp-day",
  title: "Camp Day",
  dateTime: "2026-07-15T10:00:00.000Z",
  location: "Barrio Norte",
  description: "An existing outing description",
  status: "DRAFT" as const,
  mainImageId: "asset-main-existing",
  croquisId: "asset-croquis-existing",
  planId: null,
};

/** Server-returned row on a successful save (POST or PATCH). */
const MOCK_SAVED_OUTING = {
  ...MOCK_EXISTING_OUTING,
  title: "Camp Day (edited)",
  status: "PUBLISHED" as const,
  updatedAt: "2026-07-14T20:00:00.000Z",
};

/** Minimal file-asset response shape used by FileUploadWidget. */
const MOCK_ASSET = {
  id: "asset-new",
  url: "/files/asset-new",
  thumbnailUrl: "/files/asset-new/thumb",
  mimeType: "image/png",
  fileSize: 1024,
  originalFilename: "cover.png",
  category: "OUTING_MAIN_IMAGE",
  createdAt: "2026-07-14T20:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

// ===========================================================================
// Create mode
// ===========================================================================

describe("OutingFormPage create mode", () => {
  it("renders empty form fields: title, slug, dateTime, location, description, status", () => {
    render(
      <OutingFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByLabelText(/title/i)).toBeTruthy();
    expect(screen.getByLabelText(/slug/i)).toBeTruthy();
    expect(screen.getByLabelText(/date.*time/i)).toBeTruthy();
    expect(screen.getByLabelText(/location/i)).toBeTruthy();
    expect(screen.getByLabelText(/description/i)).toBeTruthy();
    expect(screen.getByLabelText(/status/i)).toBeTruthy();

    // dateTime must be a datetime-local input (HTML semantics bind to ISO)
    const dateField = screen.getByLabelText(/date.*time/i) as HTMLInputElement;
    expect(dateField.type).toBe("datetime-local");
  });

  it("starts with empty values and does NOT issue a GET request", () => {
    globalThis.fetch = vi.fn();

    render(
      <OutingFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText(/slug/i) as HTMLInputElement).value).toBe("");
    expect(
      (screen.getByLabelText(/date.*time/i) as HTMLInputElement).value,
    ).toBe("");
    expect((screen.getByLabelText(/location/i) as HTMLInputElement).value).toBe(
      "",
    );
    expect(
      (screen.getByLabelText(/description/i) as HTMLInputElement).value,
    ).toBe("");

    // Status defaults to DRAFT
    expect((screen.getByLabelText(/status/i) as HTMLSelectElement).value).toBe(
      "DRAFT",
    );
  });

  it("renders three FileUploadWidget slots: main image, croquis, plan", () => {
    render(
      <OutingFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    // Each slot has a file input (no fileId set in create mode).
    const inputs = screen.getAllByTestId("file-upload-input");
    expect(inputs.length).toBe(3);
  });

  it("fills all fields and submits POST /outings/admin with correct body (dateTime → ISO UTC)", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_SAVED_OUTING),
    });

    const onSaved = vi.fn();

    render(
      <OutingFormPage mode="create" onSaved={onSaved} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Camp Day" },
    });
    fireEvent.change(screen.getByLabelText(/slug/i), {
      target: { value: "camp-day" },
    });
    fireEvent.change(screen.getByLabelText(/date.*time/i), {
      target: { value: "2026-07-15T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "Barrio Norte" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "A great day" },
    });
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "DRAFT" },
    });

    // Save Draft
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    const postCall = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );

    expect(postCall).toBeTruthy();
    expect(postCall![0]).toBe("/outings/admin");

    const body = JSON.parse(
      (postCall![1] as RequestInit).body as string,
    ) as Record<string, unknown>;

    expect(body.title).toBe("Camp Day");
    expect(body.slug).toBe("camp-day");
    expect(body.dateTime).toBe("2026-07-15T10:00:00.000Z");
    expect(body.location).toBe("Barrio Norte");
    expect(body.description).toBe("A great day");
    expect(body.status).toBe("DRAFT");
    // No asset IDs uploaded yet — defaults are null on create.
    expect(body.mainImageId).toBeNull();
    expect(body.croquisId).toBeNull();
    expect(body.planId).toBeNull();

    // Server accepted → onSaved fired
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    confirmSpy.mockRestore();
  });

  it("submits status=PUBLISHED when Save Publish is clicked", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_SAVED_OUTING),
    });

    render(
      <OutingFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Camp Day" },
    });
    fireEvent.change(screen.getByLabelText(/slug/i), {
      target: { value: "camp-day" },
    });
    fireEvent.change(screen.getByLabelText(/date.*time/i), {
      target: { value: "2026-07-15T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "Barrio Norte" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "A great day" },
    });
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "PUBLISHED" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save publish/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    const postCall = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );

    const body = JSON.parse(
      (postCall![1] as RequestInit).body as string,
    ) as Record<string, unknown>;

    expect(body.status).toBe("PUBLISHED");

    confirmSpy.mockRestore();
  });

  it("declining the save confirm does NOT submit a request", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    globalThis.fetch = vi.fn();
    const onSaved = vi.fn();

    render(
      <OutingFormPage mode="create" onSaved={onSaved} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Camp Day" },
    });
    fireEvent.change(screen.getByLabelText(/date.*time/i), {
      target: { value: "2026-07-15T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "Barrio Norte" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "A great day" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("shows a validation error and does NOT submit when title is empty", async () => {
    globalThis.fetch = vi.fn();
    const onSaved = vi.fn();

    render(
      <OutingFormPage mode="create" onSaved={onSaved} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/date.*time/i), {
      target: { value: "2026-07-15T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "Barrio Norte" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "A great day" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

    expect(screen.getByTestId("outing-form-validation-error")).toBeTruthy();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("shows the server's parsed validation error and does NOT claim success", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

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
          message: "slug must be unique",
          error: "Bad Request",
          statusCode: 400,
        }),
    });

    const onSaved = vi.fn();

    render(
      <OutingFormPage mode="create" onSaved={onSaved} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Camp Day" },
    });
    fireEvent.change(screen.getByLabelText(/slug/i), {
      target: { value: "duplicate-slug" },
    });
    fireEvent.change(screen.getByLabelText(/date.*time/i), {
      target: { value: "2026-07-15T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "Barrio Norte" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "A great day" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => {
      expect(screen.getByTestId("outing-form-save-error")).toBeTruthy();
    });

    expect(screen.getByText(/slug must be unique/i)).toBeTruthy();
    // onSaved MUST NOT have been called — false success is forbidden.
    expect(onSaved).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});

// ===========================================================================
// Edit mode
// ===========================================================================

describe("OutingFormPage edit mode", () => {
  it("does not expose save actions for an archived outing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([{ ...MOCK_EXISTING_OUTING, status: "ARCHIVED" }]),
    });

    render(
      <OutingFormPage
        mode="edit"
        slug="camp-day"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("outing-form")).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: /save draft/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /save publish/i })).toBeNull();
  });

  it("GETs /outings/admin on mount, finds the row by slug, and populates the form (dateTime → datetime-local)", async () => {
    // The admin read contract is list-only: there is no GET-by-id endpoint
    // for outings. The form fetches GET /outings/admin and locates the
    // target row client-side by matching the supplied slug, then uses that
    // row's `id` for the subsequent PATCH call. We seed the response with
    // MOCK_EXISTING_OUTING (slug "camp-day", id "o-existing") plus an
    // unrelated row to prove the form filters client-side rather than
    // assuming a single-row response.
    const OTHER_OUTING = {
      id: "o-other",
      slug: "another-outing",
      title: "Another Outing",
      dateTime: "2026-09-01T10:00:00.000Z",
      location: "Sur",
      description: "Different row",
      status: "PUBLISHED" as const,
      mainImageId: null,
      croquisId: null,
      planId: null,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([MOCK_EXISTING_OUTING, OTHER_OUTING]),
    });

    render(
      <OutingFormPage
        mode="edit"
        slug="camp-day"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("outing-form")).toBeTruthy();
    });

    expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe(
      "Camp Day",
    );
    expect((screen.getByLabelText(/slug/i) as HTMLInputElement).value).toBe(
      "camp-day",
    );
    // dateTime is converted from ISO UTC to the HTML datetime-local prefix.
    expect(
      (screen.getByLabelText(/date.*time/i) as HTMLInputElement).value,
    ).toBe("2026-07-15T10:00");
    expect((screen.getByLabelText(/location/i) as HTMLInputElement).value).toBe(
      "Barrio Norte",
    );
    expect(
      (screen.getByLabelText(/description/i) as HTMLInputElement).value,
    ).toBe("An existing outing description");
    expect((screen.getByLabelText(/status/i) as HTMLSelectElement).value).toBe(
      "DRAFT",
    );

    // The fetch was the list endpoint — not a get-by-id (which does not
    // exist for /outings/admin in the current API contract).
    const getCall = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      ([url, init]) =>
        (init as RequestInit | undefined)?.method === undefined &&
        (url as string) === "/outings/admin",
    );
    expect(getCall).toBeTruthy();
  });

  it("renders a load-error state when the GET fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const onCancel = vi.fn();

    render(
      <OutingFormPage
        mode="edit"
        slug="missing"
        onSaved={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("outing-form-load-error")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /back to outings/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows existing assets as previews and exposes NO removal control for them", async () => {
    // The form uses GET /outings/admin (list) + client-side filter, so the
    // response is a list, not a single row. The seed list contains
    // MOCK_EXISTING_OUTING (slug "camp-day", id "o-existing") and an
    // unrelated row to make sure the form filters by the supplied slug.
    const OTHER_OUTING = {
      id: "o-other",
      slug: "another-outing",
      title: "Another Outing",
      dateTime: "2026-09-01T10:00:00.000Z",
      location: "Sur",
      description: "Different row",
      status: "PUBLISHED" as const,
      mainImageId: null,
      croquisId: null,
      planId: null,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([MOCK_EXISTING_OUTING, OTHER_OUTING]),
    });

    render(
      <OutingFormPage
        mode="edit"
        slug="camp-day"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("outing-form")).toBeTruthy();
    });

    // The main-image asset is rendered as a preview link (image slot).
    expect(screen.getByTestId("outing-form-main-asset-link")).toBeTruthy();
    // The croquis asset is rendered as a link to /files/{id}.
    expect(screen.getByTestId("outing-form-croquis-asset-link")).toBeTruthy();
    // The plan slot has no existing asset — no link for the plan.
    expect(screen.queryByTestId("outing-form-plan-asset-link")).toBeNull();

    // No "Remove" button is offered for any existing asset — the design
    // explicitly defers clearing controls until the API distinguishes
    // omitted IDs from null-clearing semantics.
    expect(screen.queryByTestId("outing-form-main-remove")).toBeNull();
    expect(screen.queryByTestId("outing-form-croquis-remove")).toBeNull();
  });

  it("submits PATCH /outings/admin/:id with omitNullAssets — preserves existing asset references", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi
      .fn()
      // Initial GET /outings/admin (list) — wraps the single seed row in
      // an array because the admin read contract is list-only.
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([MOCK_EXISTING_OUTING]),
      })
      // PATCH response
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_SAVED_OUTING),
      });

    const onSaved = vi.fn();

    render(
      <OutingFormPage
        mode="edit"
        slug="camp-day"
        onSaved={onSaved}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("outing-form")).toBeTruthy();
    });

    // Edit an unrelated field (title).
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Camp Day (edited)" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save publish/i }));

    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    const patchCall = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
    );

    expect(patchCall).toBeTruthy();
    expect(patchCall![0]).toBe("/outings/admin/o-existing");

    const body = JSON.parse(
      (patchCall![1] as RequestInit).body as string,
    ) as Record<string, unknown>;

    // Required fields + status sent
    expect(body.title).toBe("Camp Day (edited)");
    expect(body.slug).toBe("camp-day");
    expect(body.dateTime).toBe("2026-07-15T10:00:00.000Z");
    expect(body.status).toBe("PUBLISHED");

    // Preserve-assets: existing mainImageId + croquisId sent, planId is
    // absent from the body (omitted because the form has it as null and
    // omitNullAssets is true on PATCH).
    expect(body.mainImageId).toBe("asset-main-existing");
    expect(body.croquisId).toBe("asset-croquis-existing");
    expect("planId" in body).toBe(false);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    confirmSpy.mockRestore();
  });

  it("Cancel button returns to the list (onCancel) without issuing any save request", async () => {
    // The admin read contract is list-only; the response is a list.
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([MOCK_EXISTING_OUTING]),
    });

    const onCancel = vi.fn();

    render(
      <OutingFormPage
        mode="edit"
        slug="camp-day"
        onSaved={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("outing-form")).toBeTruthy();
    });

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// FileUploadWidget integration
// ===========================================================================

describe("OutingFormPage file uploads", () => {
  it("updates the corresponding form asset field after a successful upload", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    // Plan: First call = POST /files/OUTING_MAIN_IMAGE → asset
    //       Second call = POST /outings/admin → saved row
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_ASSET),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_SAVED_OUTING),
      });

    render(
      <OutingFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Camp Day" },
    });
    fireEvent.change(screen.getByLabelText(/slug/i), {
      target: { value: "camp-day" },
    });
    fireEvent.change(screen.getByLabelText(/date.*time/i), {
      target: { value: "2026-07-15T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "Barrio Norte" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "A great day" },
    });

    // Upload an asset to the FIRST slot (main image)
    const fileInputs = screen.getAllByTestId(
      "file-upload-input",
    ) as HTMLInputElement[];
    const file = new File(["img"], "cover.png", { type: "image/png" });
    fireEvent.change(fileInputs[0]!, { target: { files: [file] } });

    // The upload is async; wait for the FileUploadWidget's uploading
    // state to clear so the form's mainImageId has been updated by
    // onUploaded before we click save.
    await waitFor(() => {
      expect(screen.queryByTestId("file-upload-uploading")).toBeNull();
    });

    // Save Draft
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    // The file upload call hit the right category.
    const uploadCall = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      ([url]) => (url as string) === "/files/OUTING_MAIN_IMAGE",
    );
    expect(uploadCall).toBeTruthy();

    // The PATCH/POST body includes the uploaded mainImageId.
    // Filter for the save call specifically (POST to /outings/admin) — the
    // upload call is also a POST but to /files/OUTING_MAIN_IMAGE with a
    // FormData body, which would not parse as JSON.
    const saveCall = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      ([url, init]) =>
        (init as RequestInit | undefined)?.method === "POST" &&
        (url as string) === "/outings/admin",
    );
    expect(saveCall).toBeTruthy();
    const body = JSON.parse(
      (saveCall![1] as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(body.mainImageId).toBe("asset-new");

    confirmSpy.mockRestore();
  });
});
