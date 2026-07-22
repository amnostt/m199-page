// ---------------------------------------------------------------------------
// OutingsPage component tests (Task 2.3 — RED→GREEN, WU3 — owner wiring)
//
// OutingsPage is the admin section owner for Outings. It owns a small
// view-state machine:
//
//   list  ──onCreateOuting──▶ create
//   list  ──onEditOuting(s)─▶ edit(slug)
//   create / edit  ──"Cancel"──▶ list
//
// The list view delegates to OutingsListPage. The create/edit form
// surface belongs to WU3 (OutingFormPage) and is rendered as a real
// form (not a placeholder) — see OutingsPage.tsx for the WU3 hand-off
// rationale.
//
// These tests focus on the owner behavior visible to the user:
// - Default view is the list (OutingsListPage rendered, fetch issued once).
// - The "New Outing" entry point on the list switches to the create view
//   (form rendered, list hidden). Create mode issues no GET — the form
//   opens with empty fields.
// - The "Edit" entry point on the list switches to the edit view with the
//   correct slug (form rendered, list hidden). Edit mode triggers a GET
//   /outings/admin; the form locates the row by slug and uses the row's
//   `id` for the eventual PATCH (verified in OutingFormPage tests; here
//   we only assert the owner transitions).
// - The form's "Cancel" button returns to the list view without leaving
//   the form in a half-loaded state.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { OutingsPage } from "./OutingsPage.js";

// ---------------------------------------------------------------------------
// Fixtures — kept minimal; the test layer is "owner state machine", not
// "list rendering" (that surface is owned by OutingsListPage tests) and
// not "form rendering" (that surface is owned by OutingFormPage tests).
// ---------------------------------------------------------------------------

const MOCK_OUTINGS = [
  {
    id: "o1",
    slug: "camp-day",
    title: "Camp Day",
    dateTime: "2026-07-15T10:00:00.000Z",
    location: "Barrio Norte",
    description: "A great day",
    status: "DRAFT" as const,
    mainImageId: null,
    croquisId: null,
    planId: null,
  },
  {
    id: "o2",
    slug: "published-outing",
    title: "Published Outing",
    dateTime: "2026-08-01T14:00:00.000Z",
    location: "Centro",
    description: "Already live",
    status: "PUBLISHED" as const,
    mainImageId: "img-1",
    croquisId: null,
    planId: null,
  },
];

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Default view: list
// ---------------------------------------------------------------------------

describe("OutingsPage default view", () => {
  it("renders the OutingsListPage on mount and issues the initial list fetch", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });
    globalThis.fetch = fetchSpy;

    render(<OutingsPage />);

    // The list view's loading state is the first thing the user sees; the
    // table appears after the fetch resolves.
    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // The list view issued exactly one fetch on mount (no status filter
    // means the unfiltered list endpoint).
    const listCalls = fetchSpy.mock.calls.filter(
      ([url]) => (url as string) === "/outings/admin",
    );
    expect(listCalls.length).toBe(1);
  });

  it("does NOT render the form on initial mount", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });

    render(<OutingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // The form surface is not visible on initial mount — the list is
    // the default view. The WU2 placeholder ("outings-form-placeholder")
    // is gone in WU3; the new wiring renders <OutingFormPage> only when
    // the view state is create/edit.
    expect(screen.queryByTestId("outings-form-placeholder")).toBeNull();
    expect(screen.queryByTestId("outing-form")).toBeNull();
    expect(screen.queryByTestId("outing-form-loading")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Transition: list → create
// ---------------------------------------------------------------------------

describe("OutingsPage list → create", () => {
  it("switches to the create view when OutingsListPage's New Outing is clicked", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });

    render(<OutingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // The list view's "New Outing" button fires onCreateOuting on the
    // owner, which flips the view to "create". The form is rendered with
    // empty fields — no GET is issued in create mode.
    fireEvent.click(screen.getByRole("button", { name: /new outing/i }));

    await waitFor(() => {
      expect(screen.getByTestId("outing-form")).toBeTruthy();
    });

    // The list is no longer visible.
    expect(screen.queryByTestId("outings-list-table")).toBeNull();
    expect(screen.queryByTestId("outings-list-loading")).toBeNull();

    // The form surface advertises a New Outing header and shows empty
    // title/slug fields. Create mode does NOT issue a GET — the form
    // opens empty.
    expect(screen.getByText(/new outing/i)).toBeTruthy();
    expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText(/slug/i) as HTMLInputElement).value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Transition: list → edit(slug)
// ---------------------------------------------------------------------------

describe("OutingsPage list → edit(slug)", () => {
  it("switches to the edit view when OutingsListPage's Edit is clicked", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });

    render(<OutingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // The first Edit button corresponds to the first row (slug: camp-day).
    const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
    fireEvent.click(editButtons[0]!);

    // The owner flips to edit mode. The form issues GET /outings/admin
    // and locates the row by slug; once the row is found the form is
    // rendered with the row's fields populated.
    await waitFor(() => {
      expect(screen.getByTestId("outing-form")).toBeTruthy();
    });

    expect(screen.queryByTestId("outings-list-table")).toBeNull();

    // The form is populated with the row matching the clicked slug —
    // "Camp Day" / "camp-day" comes from MOCK_OUTINGS[0]. The header
    // advertises "Edit Outing" (vs. "New Outing" for create).
    expect(screen.getByText(/edit outing/i)).toBeTruthy();
    expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe(
      "Camp Day",
    );
    expect((screen.getByLabelText(/slug/i) as HTMLInputElement).value).toBe(
      "camp-day",
    );
  });
});

// ---------------------------------------------------------------------------
// Transition: create/edit → list
// ---------------------------------------------------------------------------

describe("OutingsPage back to list", () => {
  it("returns to the list view when Cancel is clicked from create", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });

    render(<OutingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /new outing/i }));
    await waitFor(() => {
      expect(screen.getByTestId("outing-form")).toBeTruthy();
    });

    // Cancel returns the owner to the list view. The form's onCancel
    // flips the view state back to "list".
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });
    expect(screen.queryByTestId("outing-form")).toBeNull();
  });

  it("returns to the list view when Cancel is clicked from edit", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });

    render(<OutingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
    fireEvent.click(editButtons[0]!);
    await waitFor(() => {
      expect(screen.getByTestId("outing-form")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });
    expect(screen.queryByTestId("outing-form")).toBeNull();
  });
});
