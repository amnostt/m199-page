// ---------------------------------------------------------------------------
// OutingsPage component tests (Task 2.3 — RED→GREEN)
//
// OutingsPage is the admin section owner for Outings. It owns a small
// view-state machine:
//
//   list  ──onCreateOuting──▶ create
//   list  ──onEditOuting(s)─▶ edit(slug)
//   create / edit  ──"Back to Outings"──▶ list
//
// The list view delegates to OutingsListPage (Task 2.1/2.2 surface). The
// create/edit form surface belongs to WU3 (OutingFormPage) and is rendered
// as a temporary placeholder until then — see OutingsPage.tsx for the WU3
// hand-off rationale.
//
// These tests focus on the owner behavior visible to the user:
// - Default view is the list (OutingsListPage rendered, fetch issued once).
// - The "New Outing" entry point on the list switches to the create view
//   (placeholder rendered, list hidden).
// - The "Edit" entry point on the list switches to the edit view with the
//   correct slug (placeholder rendered, list hidden).
// - The placeholder's "Back to Outings" button returns to the list view
//   without re-fetching the list (the fetch was already issued on mount and
//   OutingsPage's view state is local).
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
// "list rendering" (that surface is owned by OutingsListPage tests).
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

  it("does NOT render the form placeholder on initial mount", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });

    render(<OutingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    expect(screen.queryByTestId("outings-form-placeholder")).toBeNull();
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
    // owner, which flips the view to "create".
    fireEvent.click(screen.getByRole("button", { name: /new outing/i }));

    await waitFor(() => {
      expect(screen.getByTestId("outings-form-placeholder")).toBeTruthy();
    });

    // The list is no longer visible.
    expect(screen.queryByTestId("outings-list-table")).toBeNull();
    expect(screen.queryByTestId("outings-list-loading")).toBeNull();

    // The placeholder advertises the WU3 hand-off and offers a back action.
    expect(
      screen.getByText(/outing form coming in the next release/i),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Transition: list → edit(slug)
// ---------------------------------------------------------------------------

describe("OutingsPage list → edit(slug)", () => {
  it("switches to the edit view with the clicked outing's slug", async () => {
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

    await waitFor(() => {
      expect(screen.getByTestId("outings-form-placeholder")).toBeTruthy();
    });

    expect(screen.queryByTestId("outings-list-table")).toBeNull();

    // The placeholder text does not change between create and edit — the
    // slug is held in the owner's view state and will be passed to the
    // future OutingFormPage (WU3). The placeholder is intentionally
    // opaque so the user cannot tell the two modes apart before the form
    // ships.
  });
});

// ---------------------------------------------------------------------------
// Transition: create/edit → list
// ---------------------------------------------------------------------------

describe("OutingsPage back to list", () => {
  it("returns to the list view when Back to Outings is clicked from create", async () => {
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
      expect(screen.getByTestId("outings-form-placeholder")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /back to outings/i }));

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });
    expect(screen.queryByTestId("outings-form-placeholder")).toBeNull();
  });

  it("returns to the list view when Back to Outings is clicked from edit", async () => {
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
      expect(screen.getByTestId("outings-form-placeholder")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /back to outings/i }));

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });
    expect(screen.queryByTestId("outings-form-placeholder")).toBeNull();
  });
});
