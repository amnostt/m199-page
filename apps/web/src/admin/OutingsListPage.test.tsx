// ---------------------------------------------------------------------------
// OutingsListPage component tests (Task 2.1 — RED)
//
// Tests:
// - Loading state on mount
// - Rows render with title, slug, status, dateTime, location
// - Status filter dropdown (All / DRAFT / PUBLISHED / ARCHIVED)
// - Status filter is server-side: changing status calls listOutings(status)
// - Empty state when API returns no outings
// - Load error banner on fetch failure
// - Archive action: button visible for non-ARCHIVED, hidden for ARCHIVED
// - Archive confirm accepted → POST /outings/admin/:id/archive request sent
// - Archive confirm declined → no request sent
// - Per-row state isolation
// - Per-row error state when archive fails
// - Edit button invokes onEditOuting with the outing's slug
// - New Outing button invokes onCreateOuting
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { OutingsListPage } from "./OutingsListPage.js";

// ---------------------------------------------------------------------------
// Fixtures
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
  {
    id: "o3",
    slug: "archived-outing",
    title: "Archived Outing",
    dateTime: "2026-05-01T09:00:00.000Z",
    location: "Sur",
    description: "Old news",
    status: "ARCHIVED" as const,
    mainImageId: null,
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
// Loading state
// ---------------------------------------------------------------------------

describe("OutingsListPage loading", () => {
  it("shows loading state while fetching outings", () => {
    // Hung fetch keeps loading visible
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {}));

    render(<OutingsListPage />);

    expect(screen.getByTestId("outings-list-loading")).toBeTruthy();
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Loaded state — rows
// ---------------------------------------------------------------------------

describe("OutingsListPage loaded", () => {
  async function renderWithOutings() {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });
    render(<OutingsListPage />);
    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });
  }

  it("renders a table with rows showing title, slug, status, and location", async () => {
    await renderWithOutings();

    // Three rows — title and slug text
    expect(screen.getByText("Camp Day")).toBeTruthy();
    expect(screen.getByText("camp-day")).toBeTruthy();
    expect(screen.getByText("Barrio Norte")).toBeTruthy();

    expect(screen.getByText("Published Outing")).toBeTruthy();
    expect(screen.getByText("published-outing")).toBeTruthy();

    expect(screen.getByText("Archived Outing")).toBeTruthy();
    expect(screen.getByText("archived-outing")).toBeTruthy();

    // Status values appear both in dropdown options and table cells
    const publishedTexts = screen.getAllByText("PUBLISHED");
    expect(publishedTexts.length).toBeGreaterThanOrEqual(2);
    const draftTexts = screen.getAllByText("DRAFT");
    expect(draftTexts.length).toBeGreaterThanOrEqual(2);
    const archivedTexts = screen.getAllByText("ARCHIVED");
    expect(archivedTexts.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Status filter — server-side filter
// ---------------------------------------------------------------------------

describe("OutingsListPage status filter", () => {
  it("renders a status filter dropdown with All/DRAFT/PUBLISHED/ARCHIVED options", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    const select = screen.getByLabelText(/status/i);
    expect(select).toBeTruthy();
    expect(screen.getByRole("option", { name: /all/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: "DRAFT" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "PUBLISHED" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "ARCHIVED" })).toBeTruthy();
  });

  it("calls listOutings('DRAFT') on initial mount with no query (default All)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // The initial fetch should be /outings/admin (no status query for All)
    const initialCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    expect(initialCall[0]).toBe("/outings/admin");
  });

  it("server-side filter: selecting DRAFT re-fetches /outings/admin?status=DRAFT", async () => {
    // First call (initial) returns all; second call (filter) returns DRAFT only
    const draftOnly = [MOCK_OUTINGS[0]!];

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(draftOnly),
      });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // Change filter to DRAFT
    const select = screen.getByLabelText(/status/i);
    fireEvent.change(select, { target: { value: "DRAFT" } });

    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const statusCall = calls.find(
        ([url]) => (url as string) === "/outings/admin?status=DRAFT",
      );
      expect(statusCall).toBeTruthy();
    });

    // Only the draft outing is visible
    await waitFor(() => {
      expect(screen.getByText("Camp Day")).toBeTruthy();
      expect(screen.queryByText("Published Outing")).toBeNull();
      expect(screen.queryByText("Archived Outing")).toBeNull();
    });
  });

  it("server-side filter: selecting PUBLISHED re-fetches with status=PUBLISHED", async () => {
    const publishedOnly = [MOCK_OUTINGS[1]!];

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(publishedOnly),
      });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    const select = screen.getByLabelText(/status/i);
    fireEvent.change(select, { target: { value: "PUBLISHED" } });

    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const statusCall = calls.find(
        ([url]) => (url as string) === "/outings/admin?status=PUBLISHED",
      );
      expect(statusCall).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText("Published Outing")).toBeTruthy();
      expect(screen.queryByText("Camp Day")).toBeNull();
      expect(screen.queryByText("Archived Outing")).toBeNull();
    });
  });

  it("server-side filter: switching back to All re-fetches /outings/admin (no status)", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([MOCK_OUTINGS[0]!]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // Re-query the select on each change because the component re-renders
    // (and replaces the <select> element) on every status-filter change.
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "DRAFT" },
    });

    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(
        calls.find(
          ([url]) => (url as string) === "/outings/admin?status=DRAFT",
        ),
      ).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "" },
    });

    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      // The third call should be the unfiltered list (no query)
      const allCalls = calls.filter(
        ([url]) => (url as string) === "/outings/admin",
      );
      expect(allCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("OutingsListPage empty state", () => {
  it("shows empty message when API returns no outings", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-empty")).toBeTruthy();
    });

    expect(screen.getByText(/no outings/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe("OutingsListPage error", () => {
  it("shows error banner when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-load-error")).toBeTruthy();
    });

    expect(screen.getByText(/failed to load/i)).toBeTruthy();
    expect(screen.queryByTestId("outings-list-table")).toBeNull();
  });

  it("shows error banner when fetch returns non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-load-error")).toBeTruthy();
    });
  });
});

// =========================================================================
// Per-row archive action
// =========================================================================

describe("OutingsListPage archive action", () => {
  async function renderWithOutings() {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });
    render(<OutingsListPage />);
    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });
  }

  it("shows an Archive button for a DRAFT outing", async () => {
    await renderWithOutings();
    // o1 is DRAFT — Archive button should be visible
    const archiveBtn = screen.getByTestId("lifecycle-archive-o1");
    expect(archiveBtn).toBeTruthy();
    expect(archiveBtn.textContent).toMatch(/archive/i);
  });

  it("shows an Archive button for a PUBLISHED outing", async () => {
    await renderWithOutings();
    // o2 is PUBLISHED — Archive button should be visible
    const archiveBtn = screen.getByTestId("lifecycle-archive-o2");
    expect(archiveBtn).toBeTruthy();
  });

  it("does NOT show an Archive button for an ARCHIVED outing", async () => {
    await renderWithOutings();
    // o3 is ARCHIVED — no Archive button
    expect(screen.queryByTestId("lifecycle-archive-o3")).toBeNull();
  });

  it("archives a DRAFT outing: confirm accepted → POST /:id/archive request sent", async () => {
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true);

    globalThis.fetch = vi
      .fn()
      // Initial list load
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      })
      // Archive POST response — server returns the archived row
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...MOCK_OUTINGS[0]!, status: "ARCHIVED" }),
      });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("lifecycle-archive-o1"));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringMatching(/archive/i),
    );

    await waitFor(() => {
      const postCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([url, init]) =>
          (init as RequestInit | undefined)?.method === "POST" &&
          (url as string).includes("/archive"),
      );
      expect(postCall).toBeTruthy();
      expect(postCall![0]).toBe("/outings/admin/o1/archive");
      // No body on the archive endpoint
      expect((postCall![1] as RequestInit).body).toBeUndefined();
    });

    confirmSpy.mockRestore();
  });

  it("declining confirm does NOT send an archive request", async () => {
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(false);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // Reset call count after list load
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(screen.getByTestId("lifecycle-archive-o1"));

    expect(confirmSpy).toHaveBeenCalledTimes(1);

    // No additional fetch call after the declined confirm
    expect(globalThis.fetch).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("updates local list from the server-returned archived row", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const archivedRow = {
      ...MOCK_OUTINGS[0]!,
      status: "ARCHIVED" as const,
    };

    globalThis.fetch = vi
      .fn()
      // Initial list load
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      })
      // Archive POST response
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(archivedRow),
      });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("lifecycle-archive-o1"));

    // After archive, the row's Archive button is replaced (the row is now ARCHIVED,
    // so the Archive button is gone; the row is still visible in the table).
    await waitFor(() => {
      expect(screen.queryByTestId("lifecycle-archive-o1")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // WU2-WARN-1: archive reconciliation against the active status filter.
  //
  // The WU2 review flagged a correctness gap: when an admin archives a
  // DRAFT or PUBLISHED row while that exact status filter is active, the
  // archived row remained in the visible table with status "ARCHIVED" —
  // contradicting the active filter. The fix is to remove the row from the
  // local list when the new server-returned status no longer matches the
  // active filter. The All and ARCHIVED filters must continue to render
  // the archived row with its updated status (no regression).
  // -------------------------------------------------------------------------

  it("WU2-WARN-1: archives a DRAFT row while the DRAFT filter is active — the row is REMOVED from the visible list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const draftRow = MOCK_OUTINGS[0]!;
    const archivedRow = { ...draftRow, status: "ARCHIVED" as const };

    globalThis.fetch = vi
      .fn()
      // Initial list load (default All)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      })
      // Refetch when filter is switched to DRAFT
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([draftRow]),
      })
      // Archive POST response — server returns the archived row
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(archivedRow),
      });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // Switch filter to DRAFT (triggers a refetch).
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "DRAFT" },
    });

    // Wait for the DRAFT-only refetch to land.
    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const statusCall = calls.find(
        ([url]) => (url as string) === "/outings/admin?status=DRAFT",
      );
      expect(statusCall).toBeTruthy();
    });

    // The DRAFT row is the only row visible.
    expect(screen.getByText("Camp Day")).toBeTruthy();
    expect(screen.queryByText("Published Outing")).toBeNull();
    expect(screen.queryByText("Archived Outing")).toBeNull();

    // Archive the DRAFT row.
    fireEvent.click(screen.getByTestId("lifecycle-archive-o1"));

    // The row must be REMOVED from the visible list — the new status
    // (ARCHIVED) no longer matches the active DRAFT filter.
    await waitFor(() => {
      expect(screen.queryByText("Camp Day")).toBeNull();
    });
    // The archive button for the row is gone with the row.
    expect(screen.queryByTestId("lifecycle-archive-o1")).toBeNull();
    // No refetch was triggered (local-state reconciliation, not a server
    // round-trip). The fetch mock only saw 3 calls: initial + DRAFT
    // refetch + archive POST.
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3);
  });

  it("WU2-WARN-1: archives a PUBLISHED row while the PUBLISHED filter is active — the row is REMOVED from the visible list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const publishedRow = MOCK_OUTINGS[1]!;
    const archivedRow = { ...publishedRow, status: "ARCHIVED" as const };

    globalThis.fetch = vi
      .fn()
      // Initial list load (default All)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      })
      // Refetch when filter is switched to PUBLISHED
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([publishedRow]),
      })
      // Archive POST response
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(archivedRow),
      });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // Switch filter to PUBLISHED.
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "PUBLISHED" },
    });

    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const statusCall = calls.find(
        ([url]) => (url as string) === "/outings/admin?status=PUBLISHED",
      );
      expect(statusCall).toBeTruthy();
    });

    // Only the PUBLISHED row is visible.
    expect(screen.getByText("Published Outing")).toBeTruthy();
    expect(screen.queryByText("Camp Day")).toBeNull();

    // Archive the PUBLISHED row.
    fireEvent.click(screen.getByTestId("lifecycle-archive-o2"));

    // The row must be REMOVED — the new status (ARCHIVED) does not match
    // the active PUBLISHED filter.
    await waitFor(() => {
      expect(screen.queryByText("Published Outing")).toBeNull();
    });
    expect(screen.queryByTestId("lifecycle-archive-o2")).toBeNull();
    // No refetch was triggered.
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3);
  });

  it("WU2-WARN-1: archives a DRAFT row while the All filter is active — the row REMAINS in the table with status ARCHIVED (regression: All-filter behavior preserved)", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const draftRow = MOCK_OUTINGS[0]!;
    const archivedRow = { ...draftRow, status: "ARCHIVED" as const };

    globalThis.fetch = vi
      .fn()
      // Initial list load (default All)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      })
      // Archive POST response
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(archivedRow),
      });

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // Filter is the default "All" (no status query).
    const select = screen.getByLabelText(/status/i) as HTMLSelectElement;
    expect(select.value).toBe("");

    // Archive the DRAFT row.
    fireEvent.click(screen.getByTestId("lifecycle-archive-o1"));

    // The row remains in the table (All filter shows every status).
    await waitFor(() => {
      expect(screen.getByText("Camp Day")).toBeTruthy();
    });
    // The row's Archive button is gone (the row is now ARCHIVED).
    expect(screen.queryByTestId("lifecycle-archive-o1")).toBeNull();
    // The row's status cell now shows ARCHIVED (status text in the table
    // cell, distinct from the dropdown option label which also reads
    // ARCHIVED). We assert by counting ARCHIVED texts: dropdown (1) +
    // the archived row's status cell (1) + the pre-existing o3 row's
    // status cell (1) = 3 occurrences. Before archive, only 2 (dropdown
    // + o3 row). The +1 proves the row's status was reconciled.
    await waitFor(() => {
      const archivedCells = screen.getAllByText("ARCHIVED");
      // dropdown option + o3's status cell + o1's status cell (now ARCHIVED)
      expect(archivedCells.length).toBe(3);
    });
    // No refetch was triggered.
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it("keeps per-row state isolated — clicking one row leaves other rows unchanged", async () => {
    // Hung archive POST — keeps o1 in "pending" state
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      })
      .mockImplementationOnce(() => new Promise<Response>(() => {}));

    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("lifecycle-archive-o1"));

    // o1's archive button should be disabled (pending)
    await waitFor(() => {
      const o1Btn = screen.getByTestId(
        "lifecycle-archive-o1",
      ) as HTMLButtonElement;
      expect(o1Btn.disabled).toBe(true);
    });

    // Other rows' buttons remain enabled
    const o2Btn = screen.getByTestId(
      "lifecycle-archive-o2",
    ) as HTMLButtonElement;
    expect(o2Btn.disabled).toBe(false);
  });

  it("shows an error indicator on a row whose archive failed", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("lifecycle-archive-o1"));

    await waitFor(() => {
      expect(screen.getByTestId("lifecycle-error-o1")).toBeTruthy();
    });

    // Button is re-enabled after error
    const archiveBtn = screen.getByTestId(
      "lifecycle-archive-o1",
    ) as HTMLButtonElement;
    expect(archiveBtn.disabled).toBe(false);
  });

  it("renders parsed server validation error text on archive failure", async () => {
    // Server returns 400 with JSON validation message
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_OUTINGS),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        headers: {
          get: (key: string) =>
            key === "content-type" ? "application/json" : null,
        },
        json: () =>
          Promise.resolve({
            message: "Cannot archive an outing that has dependent content",
          }),
      });

    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<OutingsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("lifecycle-archive-o1"));

    await waitFor(() => {
      expect(
        screen.getByText(/cannot archive an outing that has dependent content/i),
      ).toBeTruthy();
    });
  });
});

// =========================================================================
// Edit and New Outing entry points
// =========================================================================

describe("OutingsListPage entry points", () => {
  it("invokes onCreateOuting when the New Outing button is clicked", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });

    const onCreate = vi.fn();
    render(<OutingsListPage onCreateOuting={onCreate} />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    const newBtn = screen.getByRole("button", { name: /new outing/i });
    fireEvent.click(newBtn);

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("invokes onEditOuting with the outing's slug when Edit is clicked", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OUTINGS),
    });

    const onEdit = vi.fn();
    render(<OutingsListPage onEditOuting={onEdit} />);

    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // Click Edit for o1 (slug: camp-day)
    const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
    fireEvent.click(editButtons[0]!);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith("camp-day");
  });
});
