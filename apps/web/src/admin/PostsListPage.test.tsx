// ---------------------------------------------------------------------------
// PostsListPage component tests
//
// Tests:
// - Loading state while fetching
// - Rows render with title/slug/status
// - Status filter dropdown (All / DRAFT / PUBLISHED / ARCHIVED)
// - Empty state when no posts match
// - Load error banner
// - Per-row lifecycle actions (publish/archive/delete) with
//   window.confirm gates and per-row state isolation
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
  within,
} from "@testing-library/react";
import { PostsListPage } from "./PostsListPage.js";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_POSTS = [
  {
    id: "p1",
    slug: "hello-world",
    title: "Hello World",
    status: "PUBLISHED" as const,
    coverImageId: null,
    publishedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "p2",
    slug: "draft-post",
    title: "Draft Post",
    status: "DRAFT" as const,
    coverImageId: null,
    publishedAt: null,
  },
  {
    id: "p3",
    slug: "archived-post",
    title: "Archived Post",
    status: "ARCHIVED" as const,
    coverImageId: null,
    publishedAt: null,
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

async function acceptDialog(label = /continue/i) {
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  // prettier-ignore
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: label }));
}

async function cancelDialog() {
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  // prettier-ignore
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /cancel/i }));
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe("PostsListPage loading", () => {
  it("shows loading state while fetching posts", () => {
    // Hung fetch keeps loading visible
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {}));

    render(<PostsListPage />);

    expect(screen.getByTestId("posts-list-loading")).toBeTruthy();
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Loaded state — rows
// ---------------------------------------------------------------------------

describe("PostsListPage loaded", () => {
  // PostsListPage now calls listPosts + listFeaturedPostIds on mount.
  // Mock both to avoid fetch returning undefined for the second call.
  async function renderWithPosts() {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      });
    render(<PostsListPage />);
    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });
  }

  it("renders a table with post rows showing title, slug, and status", async () => {
    await renderWithPosts();

    // Three rows
    expect(screen.getByText("Hello World")).toBeTruthy();
    expect(screen.getByText("hello-world")).toBeTruthy();

    expect(screen.getByText("Draft Post")).toBeTruthy();
    expect(screen.getByText("draft-post")).toBeTruthy();

    expect(screen.getByText("Archived Post")).toBeTruthy();
    expect(screen.getByText("archived-post")).toBeTruthy();

    // Status values appear both in dropdown options and table cells.
    // getAllByText returns both; at least 2 occurrences proves table rendering.
    const publishedTexts = screen.getAllByText("PUBLISHED");
    expect(publishedTexts.length).toBeGreaterThanOrEqual(2); // dropdown + table cell

    const draftTexts = screen.getAllByText("DRAFT");
    expect(draftTexts.length).toBeGreaterThanOrEqual(2);

    const archivedTexts = screen.getAllByText("ARCHIVED");
    expect(archivedTexts.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Status filter dropdown
// ---------------------------------------------------------------------------

describe("PostsListPage status filter", () => {
  // PostsListPage now calls listPosts + listFeaturedPostIds on mount.
  // Mock both to avoid fetch returning undefined for the second call.
  async function renderWithPosts() {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      });
    render(<PostsListPage />);
    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });
  }

  it("renders a status filter dropdown with All/DRAFT/PUBLISHED/ARCHIVED options", async () => {
    await renderWithPosts();

    const select = screen.getByLabelText(/status/i);
    expect(select).toBeTruthy();

    expect(screen.getByRole("option", { name: /all/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: "DRAFT" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "PUBLISHED" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "ARCHIVED" })).toBeTruthy();
  });

  it("filters rows by status — selecting DRAFT shows only draft posts", async () => {
    await renderWithPosts();

    const select = screen.getByLabelText(/status/i);
    fireEvent.change(select, { target: { value: "DRAFT" } });

    // Only the draft post should be visible
    expect(screen.getByText("Draft Post")).toBeTruthy();
    expect(screen.queryByText("Hello World")).toBeNull();
    expect(screen.queryByText("Archived Post")).toBeNull();
  });

  it("filters rows by status — selecting PUBLISHED shows only published posts", async () => {
    await renderWithPosts();

    const select = screen.getByLabelText(/status/i);
    fireEvent.change(select, { target: { value: "PUBLISHED" } });

    expect(screen.getByText("Hello World")).toBeTruthy();
    expect(screen.queryByText("Draft Post")).toBeNull();
    expect(screen.queryByText("Archived Post")).toBeNull();
  });

  it("shows all posts when All is selected", async () => {
    await renderWithPosts();

    // Default is All — all three visible
    expect(screen.getByText("Hello World")).toBeTruthy();
    expect(screen.getByText("Draft Post")).toBeTruthy();
    expect(screen.getByText("Archived Post")).toBeTruthy();

    // Select PUBLISHED then back to All
    const select = screen.getByLabelText(/status/i);
    fireEvent.change(select, { target: { value: "PUBLISHED" } });
    fireEvent.change(select, { target: { value: "" } });

    expect(screen.getByText("Hello World")).toBeTruthy();
    expect(screen.getByText("Draft Post")).toBeTruthy();
    expect(screen.getByText("Archived Post")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("PostsListPage empty state", () => {
  it("shows empty message when API returns no posts", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-empty")).toBeTruthy();
    });

    expect(screen.getByText(/no posts/i)).toBeTruthy();
  });

  it("shows empty message when filter matches nothing", async () => {
    // Mock returns only PUBLISHED posts; filtering to DRAFT produces empty.
    const publishedOnly = [
      {
        id: "p1",
        slug: "post-a",
        title: "Post A",
        status: "PUBLISHED" as const,
        coverImageId: null,
        publishedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(publishedOnly),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // Filter to DRAFT — no posts match
    const select = screen.getByLabelText(/status/i);
    fireEvent.change(select, { target: { value: "DRAFT" } });

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-empty")).toBeTruthy();
    });

    expect(screen.getByText(/no posts/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe("PostsListPage error", () => {
  it("shows error banner when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-load-error")).toBeTruthy();
    });

    expect(screen.getByText(/failed to load/i)).toBeTruthy();
    expect(screen.queryByTestId("posts-list-table")).toBeNull();
  });

  it("shows error banner when fetch returns non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-load-error")).toBeTruthy();
    });
  });
});

// =========================================================================
// Per-row lifecycle actions (publish / archive / delete)
// =========================================================================

describe("PostsListPage lifecycle actions", () => {
  // PostsListPage now calls listPosts + listFeaturedPostIds on mount.
  // Mock both to avoid fetch returning undefined for the second call.
  async function renderWithPosts() {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      });
    render(<PostsListPage />);
    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------
  // Publish
  // ------------------------------------------------------------------

  it("shows a Publish button for a DRAFT post", async () => {
    await renderWithPosts();

    // p2 is DRAFT — the Publish button should be in its row
    const publishBtn = screen.getByTestId("lifecycle-publish-p2");
    expect(publishBtn).toBeTruthy();
    expect(publishBtn.textContent).toMatch(/publish/i);
  });

  it("publishes a DRAFT post: confirm accepted → POST /publish request sent", async () => {
    const successToast = vi.spyOn(toast, "success");
    globalThis.fetch = vi
      .fn()
      // Initial list load
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      // listFeaturedPostIds
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      })
      // Publish POST response
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("lifecycle-publish-p2"));
    await acceptDialog();

    // POST /posts/admin/p2/publish request was sent (no body — parameterless lifecycle endpoint)
    await waitFor(() => {
      const postCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([url, init]) =>
          (init as RequestInit | undefined)?.method === "POST" &&
          (url as string).includes("/publish"),
      );
      expect(postCall).toBeTruthy();
      expect(postCall![0]).toBe("/posts/admin/p2/publish");
      expect((postCall![1] as RequestInit).body).toBeUndefined();
    });
    // prettier-ignore
    expect(successToast).toHaveBeenCalledWith("Publish completed.", expect.anything());
  });

  // ------------------------------------------------------------------
  // Archive
  // ------------------------------------------------------------------

  it("shows an Archive button for a PUBLISHED post", async () => {
    await renderWithPosts();

    // p1 is PUBLISHED — the Archive button should be in its row
    const archiveBtn = screen.getByTestId("lifecycle-archive-p1");
    expect(archiveBtn).toBeTruthy();
    expect(archiveBtn.textContent).toMatch(/archive/i);
  });

  it("archives a PUBLISHED post: confirm accepted → POST /archive request sent", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("lifecycle-archive-p1"));
    await acceptDialog();

    // POST /posts/admin/p1/archive request was sent (no body — parameterless lifecycle endpoint)
    await waitFor(() => {
      const postCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([url, init]) =>
          (init as RequestInit | undefined)?.method === "POST" &&
          (url as string).includes("/archive"),
      );
      expect(postCall).toBeTruthy();
      expect(postCall![0]).toBe("/posts/admin/p1/archive");
      expect((postCall![1] as RequestInit).body).toBeUndefined();
    });
  });

  it("archives a featured post without requiring a complete API response", async () => {
    // p1 is PUBLISHED and pre-featured from backend
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      // listFeaturedPostIds → p1 is featured
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: ["p1"] }),
      })
      // Archive POST response
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // p1 is featured before archiving — Unfeature button visible
    expect(screen.getByTestId("unfeature-p1")).toBeTruthy();

    // Archive p1
    fireEvent.click(screen.getByTestId("lifecycle-archive-p1"));
    await acceptDialog();

    // After archive succeeds, p1 should no longer be tracked as featured
    await waitFor(() => {
      // p1 is now ARCHIVED — Publish button appears, but NOT Unfeature
      expect(screen.getByTestId("lifecycle-publish-p1")).toBeTruthy();
    });

    // Featured cap display should no longer count p1
    await waitFor(() => {
      const capDisplay = screen.getByTestId("featured-cap");
      expect(capDisplay.textContent).toMatch("0");
    });

    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------

  it("shows a Delete button for each post row", async () => {
    await renderWithPosts();

    expect(screen.getByTestId("lifecycle-delete-p1")).toBeTruthy();
    expect(screen.getByTestId("lifecycle-delete-p2")).toBeTruthy();
    expect(screen.getByTestId("lifecycle-delete-p3")).toBeTruthy();
  });

  it("deletes a post: confirm accepted → DELETE request sent, post removed, no error shown", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      })
      // 204 No Content — no .json() on the response
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("lifecycle-delete-p3"));
    await acceptDialog(/delete/i);

    await waitFor(() => {
      const deleteCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "DELETE",
      );
      expect(deleteCall).toBeTruthy();
      expect(deleteCall![0]).toBe("/posts/admin/p3");
    });

    // After successful delete, the "Action failed" error indicator must NOT appear
    await waitFor(() => {
      expect(screen.queryByTestId("lifecycle-error-p3")).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // Confirm declined → no request
  // ------------------------------------------------------------------

  it("declining confirm does NOT send a request", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // Reset call count after list load
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(screen.getByTestId("lifecycle-delete-p2"));
    await cancelDialog();

    // No additional fetch call after the declined confirm
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // Per-row state isolation
  // ------------------------------------------------------------------

  it("keeps per-row state isolated — clicking one row leaves other rows unchanged", async () => {
    // Hung publish PATCH — keeps row in "pending" state
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      })
      .mockImplementationOnce(() => new Promise<Response>(() => {}));

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // Click publish on p2 (DRAFT)
    fireEvent.click(screen.getByTestId("lifecycle-publish-p2"));
    await acceptDialog();

    // p2's publish button should be disabled (pending)
    await waitFor(() => {
      const p2Btn = screen.getByTestId(
        "lifecycle-publish-p2",
      ) as HTMLButtonElement;
      expect(p2Btn.disabled).toBe(true);
    });

    // Other rows' buttons remain enabled
    const p1DeleteBtn = screen.getByTestId(
      "lifecycle-delete-p1",
    ) as HTMLButtonElement;
    expect(p1DeleteBtn.disabled).toBe(false);

    const p3DeleteBtn = screen.getByTestId(
      "lifecycle-delete-p3",
    ) as HTMLButtonElement;
    expect(p3DeleteBtn.disabled).toBe(false);

    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------
  // Per-row error state
  // ------------------------------------------------------------------

  it("shows an error indicator on a row whose action failed", async () => {
    const errorToast = vi.spyOn(toast, "error");
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("lifecycle-publish-p2"));
    await acceptDialog();

    await waitFor(() => {
      expect(screen.getByTestId("lifecycle-error-p2")).toBeTruthy();
    });

    // Button is re-enabled after error
    const publishBtn = screen.getByTestId(
      "lifecycle-publish-p2",
    ) as HTMLButtonElement;
    expect(publishBtn.disabled).toBe(false);

    // prettier-ignore
    expect(errorToast).toHaveBeenCalledWith("Publish failed.", expect.objectContaining({ description: "Network error" }));
    vi.restoreAllMocks();
  });
});

// =========================================================================
// Feature / unfeature toggle
// =========================================================================

describe("PostsListPage feature toggle", () => {
  // PostsListPage now calls listPosts + listFeaturedPostIds on mount.
  // Mock both to avoid fetch returning undefined for the second call.
  async function renderWithPosts() {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      });
    render(<PostsListPage />);
    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------
  // Feature button visible for PUBLISHED posts
  // ------------------------------------------------------------------

  it("shows Feature button for a PUBLISHED post that is not yet featured", async () => {
    await renderWithPosts();

    // p1 is PUBLISHED — a Feature button should be visible
    const featureBtn = screen.getByTestId("feature-p1");
    expect(featureBtn).toBeTruthy();
    expect(featureBtn.textContent).toMatch(/feature/i);
  });

  it("does NOT show Feature button for DRAFT or ARCHIVED posts", async () => {
    await renderWithPosts();

    // p2 is DRAFT, p3 is ARCHIVED — no feature buttons
    expect(screen.queryByTestId("feature-p2")).toBeNull();
    expect(screen.queryByTestId("feature-p3")).toBeNull();
  });

  // ------------------------------------------------------------------
  // Feature → unfeature cycle
  // ------------------------------------------------------------------

  it("sends POST /posts/admin/:id/feature when Feature is clicked", async () => {
    globalThis.fetch = vi
      .fn()
      // List load
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      // listFeaturedPostIds
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      })
      // Feature call
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("feature-p1"));

    await waitFor(() => {
      const postCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([url, init]) =>
          (init as RequestInit | undefined)?.method === "POST" &&
          (url as string).includes("/feature"),
      );
      expect(postCall).toBeTruthy();
      expect(postCall![0]).toBe("/posts/admin/p1/feature");
    });
  });

  it("shows Unfeature button after a post is featured", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("feature-p1"));

    // After feature succeeds, the Unfeature button appears
    await waitFor(() => {
      expect(screen.getByTestId("unfeature-p1")).toBeTruthy();
      expect(screen.getByTestId("unfeature-p1").textContent).toMatch(
        /unfeature|featured/i,
      );
    });
  });

  it("sends DELETE /posts/admin/:id/feature when Unfeature is clicked", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      })
      // Feature
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      // Unfeature
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // Feature p1 first
    fireEvent.click(screen.getByTestId("feature-p1"));

    await waitFor(() => {
      expect(screen.getByTestId("unfeature-p1")).toBeTruthy();
    });

    // Now unfeature
    fireEvent.click(screen.getByTestId("unfeature-p1"));

    await waitFor(() => {
      const deleteCalls = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.filter(
        ([_url, init]) =>
          (init as RequestInit | undefined)?.method === "DELETE",
      );
      expect(deleteCalls).toHaveLength(1);
      expect(deleteCalls[0]![0]).toBe("/posts/admin/p1/feature");
    });

    // Feature button should be visible again after unfeature
    await waitFor(() => {
      expect(screen.getByTestId("feature-p1")).toBeTruthy();
    });
  });

  // ------------------------------------------------------------------
  // Feature cap
  // ------------------------------------------------------------------

  it("shows featured cap display", async () => {
    await renderWithPosts();

    // Cap display showing "Featured: 0/3" initially
    const capDisplay = screen.getByTestId("featured-cap");
    expect(capDisplay).toBeTruthy();
    expect(capDisplay.textContent).toMatch(/0/);
    expect(capDisplay.textContent).toMatch(/3/);
  });

  it("disables Feature button when 3 posts are already featured", async () => {
    // Mock: list load + 3 feature calls succeed
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            MOCK_POSTS[0]!, // PUBLISHED p1
            MOCK_POSTS[1]!, // DRAFT p2
            {
              ...MOCK_POSTS[0]!,
              id: "p4",
              slug: "post-four",
              title: "Post Four",
              status: "PUBLISHED" as const,
            },
            {
              ...MOCK_POSTS[0]!,
              id: "p5",
              slug: "post-five",
              title: "Post Five",
              status: "PUBLISHED" as const,
            },
          ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // Feature 3 PUBLISHED posts: p1, p4, p5
    fireEvent.click(screen.getByTestId("feature-p1"));
    await waitFor(() => {
      expect(screen.getByTestId("unfeature-p1")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("feature-p4"));
    await waitFor(() => {
      expect(screen.getByTestId("unfeature-p4")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("feature-p5"));
    await waitFor(() => {
      expect(screen.getByTestId("unfeature-p5")).toBeTruthy();
    });

    // Cap display now shows 3/3
    await waitFor(() => {
      const capDisplay = screen.getByTestId("featured-cap");
      expect(capDisplay.textContent).toMatch("3");
    });

    // Feature buttons should no longer exist (cap reached)
    expect(screen.queryByTestId(/^feature-/)).toBeNull();
  });

  it("unfeature frees a slot — re-enables Feature for other PUBLISHED posts", async () => {
    globalThis.fetch = vi
      .fn()
      // List with 3 PUBLISHED posts
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            MOCK_POSTS[0]!, // p1 PUBLISHED
            {
              ...MOCK_POSTS[0]!,
              id: "p4",
              slug: "post-four",
              title: "Post Four",
              status: "PUBLISHED" as const,
            },
            {
              ...MOCK_POSTS[0]!,
              id: "p5",
              slug: "post-five",
              title: "Post Five",
              status: "PUBLISHED" as const,
            },
          ]),
      })
      // listFeaturedPostIds
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: [] }),
      })
      // Feature p1
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      // Feature p4
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      // Feature p5
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      // Unfeature p1
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // Feature all 3
    fireEvent.click(screen.getByTestId("feature-p1"));
    await waitFor(() => {
      expect(screen.getByTestId("unfeature-p1")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("feature-p4"));
    await waitFor(() => {
      expect(screen.getByTestId("unfeature-p4")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("feature-p5"));
    await waitFor(() => {
      expect(screen.getByTestId("unfeature-p5")).toBeTruthy();
    });

    // Cap reached — no feature buttons
    expect(screen.queryByTestId(/^feature-/)).toBeNull();

    // Unfeature p1
    fireEvent.click(screen.getByTestId("unfeature-p1"));

    await waitFor(() => {
      // After unfeature, p1's Feature button reappears (slot freed)
      expect(screen.getByTestId("feature-p1")).toBeTruthy();
    });
  });

  // ------------------------------------------------------------------
  // Pre-existing featured posts from API
  // ------------------------------------------------------------------

  it("initializes featuredPostIds from /posts/admin/featured API response", async () => {
    globalThis.fetch = vi
      .fn()
      // listPosts
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POSTS),
      })
      // listFeaturedPostIds → p1 is already featured
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: ["p1"] }),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // p1 should show "Featured ★" (unfeature button) since it's pre-featured
    expect(screen.getByTestId("unfeature-p1")).toBeTruthy();
    expect(screen.getByTestId("unfeature-p1").textContent).toMatch(/featured/i);

    // Feature button should NOT appear for p1
    expect(screen.queryByTestId("feature-p1")).toBeNull();

    // Cap display shows 1/3
    const capDisplay = screen.getByTestId("featured-cap");
    expect(capDisplay.textContent).toMatch("1");
    expect(capDisplay.textContent).toMatch("3");
  });

  it("disables Feature button when 3 posts are initially featured (cap from backend)", async () => {
    // 4 PUBLISHED posts, but 3 are already featured from backend
    const fourPublishedPosts = [
      MOCK_POSTS[0]!, // p1 PUBLISHED
      {
        ...MOCK_POSTS[0]!,
        id: "p4",
        slug: "post-four",
        title: "Post Four",
        status: "PUBLISHED" as const,
      },
      {
        ...MOCK_POSTS[0]!,
        id: "p5",
        slug: "post-five",
        title: "Post Five",
        status: "PUBLISHED" as const,
      },
      {
        ...MOCK_POSTS[0]!,
        id: "p6",
        slug: "post-six",
        title: "Post Six",
        status: "PUBLISHED" as const,
      },
    ];

    globalThis.fetch = vi
      .fn()
      // listPosts
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fourPublishedPosts),
      })
      // listFeaturedPostIds → p1, p4, p5 already featured (cap reached)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: ["p1", "p4", "p5"] }),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // p1, p4, p5 show Unfeature buttons (already featured)
    expect(screen.getByTestId("unfeature-p1")).toBeTruthy();
    expect(screen.getByTestId("unfeature-p4")).toBeTruthy();
    expect(screen.getByTestId("unfeature-p5")).toBeTruthy();

    // p6 is PUBLISHED but NOT featured — its Feature button should be DISABLED
    // because cap is already at 3/3
    const featureBtnP6 = screen.getByTestId("feature-p6") as HTMLButtonElement;
    expect(featureBtnP6).toBeTruthy();
    expect(featureBtnP6.disabled).toBe(true);

    // Cap display shows 3/3
    const capDisplay = screen.getByTestId("featured-cap");
    expect(capDisplay.textContent).toMatch("3");
    expect(capDisplay.textContent).toMatch("3");

    // Verify no extra fetch calls beyond the two initial ones
    // (disabled Feature button should not send a request)
    const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls;
    expect(fetchCalls).toHaveLength(2); // only listPosts + listFeaturedPostIds
  });

  it("unfeature frees a slot when initial featured state comes from backend", async () => {
    globalThis.fetch = vi
      .fn()
      // listPosts
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            MOCK_POSTS[0]!, // p1 PUBLISHED
            {
              ...MOCK_POSTS[0]!,
              id: "p4",
              slug: "post-four",
              title: "Post Four",
              status: "PUBLISHED" as const,
            },
            {
              ...MOCK_POSTS[0]!,
              id: "p5",
              slug: "post-five",
              title: "Post Five",
              status: "PUBLISHED" as const,
            },
            {
              ...MOCK_POSTS[0]!,
              id: "p6",
              slug: "post-six",
              title: "Post Six",
              status: "PUBLISHED" as const,
            },
          ]),
      })
      // listFeaturedPostIds → all 3 slots full
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: ["p1", "p4", "p5"] }),
      })
      // unfeature p1
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // p6's Feature button is disabled (cap reached)
    expect(
      (screen.getByTestId("feature-p6") as HTMLButtonElement).disabled,
    ).toBe(true);

    // Unfeature p1
    fireEvent.click(screen.getByTestId("unfeature-p1"));

    await waitFor(() => {
      // After unfeature, p1's Feature button reappears
      expect(screen.getByTestId("feature-p1")).toBeTruthy();
    });

    // p6's Feature button should now be ENABLED (cap is now 2/3)
    const featureBtnP6 = screen.getByTestId("feature-p6") as HTMLButtonElement;
    expect(featureBtnP6.disabled).toBe(false);

    // Cap display shows 2/3
    const capDisplay = screen.getByTestId("featured-cap");
    expect(capDisplay.textContent).toMatch("2");
    expect(capDisplay.textContent).toMatch("3");
  });
});

// =========================================================================
// Featured endpoint failure — surfaced visibly and blocks feature actions
// =========================================================================

describe("PostsListPage featured endpoint failure", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const FOUR_PUBLISHED = [
    {
      id: "p1",
      slug: "post-one",
      title: "Post One",
      status: "PUBLISHED" as const,
      coverImageId: null,
      publishedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "p2",
      slug: "post-two",
      title: "Post Two",
      status: "PUBLISHED" as const,
      coverImageId: null,
      publishedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "p3",
      slug: "post-three",
      title: "Post Three",
      status: "PUBLISHED" as const,
      coverImageId: null,
      publishedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "p4",
      slug: "post-four",
      title: "Post Four",
      status: "PUBLISHED" as const,
      coverImageId: null,
      publishedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  it("shows 'unavailable' in featured cap display when featured endpoint fails", async () => {
    globalThis.fetch = vi
      .fn()
      // listPosts succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(FOUR_PUBLISHED),
      })
      // listFeaturedPostIds fails
      .mockRejectedValueOnce(new Error("Network error"));

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    const capDisplay = screen.getByTestId("featured-cap");
    expect(capDisplay.textContent).toMatch(/unavailable/i);
  });

  it("disables Feature buttons when featured endpoint fails (cap state unknown)", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(FOUR_PUBLISHED),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // All PUBLISHED posts have Feature buttons but they must be disabled
    const featureBtnP1 = screen.getByTestId("feature-p1") as HTMLButtonElement;
    expect(featureBtnP1).toBeTruthy();
    expect(featureBtnP1.disabled).toBe(true);

    const featureBtnP2 = screen.getByTestId("feature-p2") as HTMLButtonElement;
    expect(featureBtnP2.disabled).toBe(true);
  });

  it("Unfeature buttons are disabled when featured endpoint fails", async () => {
    // Posts load OK; featured endpoint succeeds first with p1 featured
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(FOUR_PUBLISHED),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ postIds: ["p1"] }),
      });

    const { unmount } = render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // p1 shows Unfeature button (it is featured)
    expect(screen.getByTestId("unfeature-p1")).toBeTruthy();

    unmount();

    // Re-render: this time featured endpoint fails
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(FOUR_PUBLISHED),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    render(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // Feature buttons exist but are disabled (featured state is unknown)
    const featureBtnP1 = screen.getByTestId("feature-p1") as HTMLButtonElement;
    expect(featureBtnP1).toBeTruthy();
    expect(featureBtnP1.disabled).toBe(true);

    // Cap display shows unavailable
    const capDisplay = screen.getByTestId("featured-cap");
    expect(capDisplay.textContent).toMatch(/unavailable/i);
  });
});
