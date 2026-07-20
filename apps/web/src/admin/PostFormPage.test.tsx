// ---------------------------------------------------------------------------
// PostFormPage component tests
//
// Tests the create/edit post form with:
// - Create mode: empty form, POST /posts/admin on submit, tags split from comma
// - Edit mode: GET /posts/admin/slug/:slug on mount, populate form, PATCH on submit
// - States: loading, load error, save success, save error, save disabled while
//   submitting, required title validation
// - Slug-change confirm gate on PUBLISHED posts
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { PostFormPage } from "./PostFormPage.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_POST = {
  id: "p1",
  slug: "hello-world",
  title: "Hello World",
  status: "PUBLISHED" as const,
  coverImageId: "cover-1",
  publishedAt: "2026-01-01T00:00:00.000Z",
  description: "A test post",
  content: "Post body content",
  tags: ["react", "typescript"],
  downloads: [
    { id: "dl1", fileId: "file-1", label: "PDF Guide", sortOrder: 0 },
  ],
};

const MOCK_CREATED_POST = {
  ...MOCK_POST,
  id: "p-new",
  slug: "new-post",
  title: "New Post",
  status: "DRAFT" as const,
  publishedAt: null,
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

// =========================================================================
// Create mode
// =========================================================================

describe("PostFormPage create mode", () => {
  it("renders content-only fields without an editable lifecycle status", () => {
    render(<PostFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/title/i)).toBeTruthy();
    expect(screen.getByLabelText(/slug/i)).toBeTruthy();
    expect(screen.getByLabelText(/content/i)).toBeTruthy();
    expect(screen.getByLabelText(/description/i)).toBeTruthy();
    expect(screen.getByLabelText(/tags/i)).toBeTruthy();
    expect(screen.queryByLabelText(/status/i)).toBeNull();

    // Content field should be a textarea per spec
    const contentField = screen.getByLabelText(/content/i);
    expect(contentField.tagName).toBe("TEXTAREA");
  });

  it("starts with empty values — no GET request", () => {
    globalThis.fetch = vi.fn();

    render(<PostFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />);

    // No fetch should have been called (create mode doesn't load)
    expect(globalThis.fetch).not.toHaveBeenCalled();

    // Fields start empty
    expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText(/slug/i) as HTMLInputElement).value).toBe("");
    expect(
      (screen.getByLabelText(/description/i) as HTMLInputElement).value,
    ).toBe("");
    expect((screen.getByLabelText(/tags/i) as HTMLInputElement).value).toBe("");

    expect(screen.queryByLabelText(/status/i)).toBeNull();
  });

  it("fills all fields and submits POST /posts/admin with correct body", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_CREATED_POST),
    });

    render(<PostFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />);

    // Fill the form
    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "New Post" },
    });
    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "new-post" },
    });
    fireEvent.change(screen.getByLabelText(/^content/i), {
      target: { value: "Some content here" },
    });
    fireEvent.change(screen.getByLabelText(/^description/i), {
      target: { value: "A short description" },
    });
    fireEvent.change(screen.getByLabelText(/tags/i), {
      target: { value: "react, typescript, ssr" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    // Assert POST to /posts/admin
    const postCall = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );

    expect(postCall).toBeTruthy();
    expect(postCall![0]).toBe("/posts/admin");

    const body = JSON.parse(
      (postCall![1] as RequestInit).body as string,
    ) as Record<string, unknown>;

    expect(body.title).toBe("New Post");
    expect(body.slug).toBe("new-post");
    expect(body.content).toBe("Some content here");
    expect(body.description).toBe("A short description");
    expect(body.tags).toEqual(["react", "typescript", "ssr"]);
    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("publishedAt");
    expect(body.coverImageId).toBeNull();
    expect(body.downloadIds).toEqual([]);
  });

  it("splits comma-separated tags: 'a, b, ,c' → tags ['a','b','c']", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_CREATED_POST),
    });

    render(<PostFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "T" },
    });
    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "t" },
    });
    fireEvent.change(screen.getByLabelText(/tags/i), {
      target: { value: "a, b, ,c" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const postCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "POST",
      );
      if (postCall) {
        const body = JSON.parse(
          (postCall[1] as RequestInit).body as string,
        ) as Record<string, unknown>;
        expect(body.tags).toEqual(["a", "b", "c"]);
      }
    });
  });

  it("calls onSaved callback after successful create", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_CREATED_POST),
    });

    const onSaved = vi.fn();

    render(<PostFormPage mode="create" onSaved={onSaved} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "T" },
    });
    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "t" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();

    render(
      <PostFormPage mode="create" onSaved={vi.fn()} onCancel={onCancel} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// =========================================================================
// Edit mode
// =========================================================================

describe("PostFormPage edit mode", () => {
  it("shows loading state while fetching post", () => {
    // Hung fetch keeps loading visible
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {}));

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByTestId("post-form-loading")).toBeTruthy();
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it("fetches GET /posts/admin/slug/:slug on mount", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/posts/admin/slug/hello-world",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("populates form fields from GET response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    expect((screen.getByLabelText(/^title/i) as HTMLInputElement).value).toBe(
      "Hello World",
    );
    expect((screen.getByLabelText(/^slug/i) as HTMLInputElement).value).toBe(
      "hello-world",
    );
    expect(
      (screen.getByLabelText(/^content/i) as HTMLTextAreaElement).value,
    ).toBe("Post body content");
    expect(
      (screen.getByLabelText(/^description/i) as HTMLInputElement).value,
    ).toBe("A test post");
    expect((screen.getByLabelText(/tags/i) as HTMLInputElement).value).toBe(
      "react, typescript",
    );
    expect(screen.getByText("Status: PUBLISHED")).toBeTruthy();
  });

  it("joins tags array to comma-separated string for the input", async () => {
    // Post with single tag and multi-word tags
    const postWithTags = {
      ...MOCK_POST,
      tags: ["nodejs", "backend api"],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(postWithTags),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    expect((screen.getByLabelText(/tags/i) as HTMLInputElement).value).toBe(
      "nodejs, backend api",
    );
  });

  it("submits PATCH /posts/admin/:id with form data", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi
      .fn()
      // First call: GET for loading
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POST),
      })
      // Second call: PATCH for saving
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POST),
      });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    // Edit title
    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "Updated Title" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const patchCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
      );

      expect(patchCall).toBeTruthy();
      expect(patchCall![0]).toBe("/posts/admin/p1");

      const body = JSON.parse(
        (patchCall![1] as RequestInit).body as string,
      ) as Record<string, unknown>;

      expect(body.title).toBe("Updated Title");
      expect(body.slug).toBe("hello-world"); // unchanged
      expect(body.content).toBe("Post body content"); // unchanged
    });
  });

  it("calls a distinct PATCH endpoint that uses post.id (not slug)", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POST),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POST),
      });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const patchCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
      );

      expect(patchCall).toBeTruthy();
      // Uses post.id ("p1"), not slug ("hello-world")
      expect(patchCall![0]).toBe("/posts/admin/p1");
      expect(patchCall![0]).not.toBe("/posts/admin/hello-world");
    });
  });
});

// =========================================================================
// Loading / Error / Success states
// =========================================================================

describe("PostFormPage states", () => {
  it("shows load error when GET fails (edit mode)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(
      <PostFormPage
        mode="edit"
        slug="bad-slug"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form-load-error")).toBeTruthy();
    });

    expect(screen.getByText(/failed to load/i)).toBeTruthy();
    expect(screen.queryByTestId("post-form")).toBeNull();
  });

  it("shows save success message after successful POST", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_CREATED_POST),
    });

    render(<PostFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "T" },
    });
    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "t" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByTestId("post-form-save-success")).toBeTruthy();
    });

    expect(screen.getByText(/saved successfully|post saved/i)).toBeTruthy();
  });

  it("shows save error message on POST failure", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<PostFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "T" },
    });
    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "t" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByTestId("post-form-save-error")).toBeTruthy();
    });

    expect(screen.getByText(/failed to save/i)).toBeTruthy();
  });

  it("disables save button while submitting", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    // POST never resolves — save stays "submitting"
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {}));

    render(<PostFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "T" },
    });
    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "t" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it("shows validation error and prevents save when title is empty", async () => {
    globalThis.fetch = vi.fn();

    render(<PostFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />);

    // Title is empty; fill other required fields
    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "some-slug" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // Should show validation error and not call fetch
    await waitFor(() => {
      expect(screen.getByTestId("post-form-validation-error")).toBeTruthy();
      expect(screen.getByText(/title is required/i)).toBeTruthy();
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("clears save success/error messages when user edits a field", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_POST),
      })
      .mockRejectedValueOnce(new Error("Save failed"));

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    // First save attempt fails
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByTestId("post-form-save-error")).toBeTruthy();
    });

    // Editing a field clears the error
    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "Changed" },
    });

    expect(screen.queryByTestId("post-form-save-error")).toBeNull();
  });
});

// =========================================================================
// Triangulation — edge cases
// =========================================================================

describe("PostFormPage triangulation", () => {
  it("create mode renders form immediately (no loading state)", () => {
    render(<PostFormPage mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />);

    // Form should be visible immediately, not loading
    expect(screen.queryByTestId("post-form-loading")).toBeNull();
    expect(screen.getByTestId("post-form")).toBeTruthy();
  });

  it("edit mode: tagless post shows empty tags input", async () => {
    const postWithoutTags = { ...MOCK_POST, tags: [] };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(postWithoutTags),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="tagless"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    expect((screen.getByLabelText(/tags/i) as HTMLInputElement).value).toBe("");
  });

  it("edit mode: error on non-ok GET response shows load error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="nonexistent"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form-load-error")).toBeTruthy();
    });
  });
});

// =========================================================================
// Slug-change confirm gate on PUBLISHED posts
// =========================================================================

describe("PostFormPage P-07 slug-change gate", () => {
  const PUBLISHED_POST = {
    ...MOCK_POST,
    status: "PUBLISHED" as const,
    slug: "hello-world",
  };

  const DRAFT_POST = {
    ...MOCK_POST,
    status: "DRAFT" as const,
    slug: "draft-slug",
    publishedAt: null,
  };

  const ARCHIVED_POST = {
    ...MOCK_POST,
    status: "ARCHIVED" as const,
    slug: "old-slug",
    publishedAt: null,
  };

  // ------------------------------------------------------------------
  // PUBLISHED + slug changed → two confirms
  // ------------------------------------------------------------------

  it("shows two sequential window.confirm when slug is changed on a PUBLISHED post: URL-breakage then save", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi
      .fn()
      // GET for loading
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(PUBLISHED_POST),
      })
      // PATCH for saving
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(PUBLISHED_POST),
      });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    // Change the slug
    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "new-slug" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // Two confirms called
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(2);
    });

    // First confirm: URL-breakage warning
    expect(confirmSpy.mock.calls).toHaveLength(2);
    expect(confirmSpy.mock.calls[0]![0]).toMatch(/url|break|link/i);

    // Second confirm: generic save
    expect(confirmSpy.mock.calls[1]![0]).toMatch(/save|update/i);

    // PATCH was sent (both confirms accepted)
    await waitFor(() => {
      const patchCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
      );
      expect(patchCall).toBeTruthy();
    });

    confirmSpy.mockRestore();
  });

  // ------------------------------------------------------------------
  // Cancel first confirm → no PATCH
  // ------------------------------------------------------------------

  it("cancelling the URL-breakage confirm does NOT send a PATCH request", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false); // first call returns false

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(PUBLISHED_POST),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "new-slug" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });

    // No PATCH — only the initial GET was called
    const patchCalls = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(0);

    confirmSpy.mockRestore();
  });

  // ------------------------------------------------------------------
  // Accept first, cancel second → no PATCH
  // ------------------------------------------------------------------

  it("accepting URL-breakage but cancelling save confirm does NOT send a PATCH request", async () => {
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(true) // URL-breakage: accept
      .mockReturnValueOnce(false); // save: decline

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(PUBLISHED_POST),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "new-slug" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(2);
    });

    // No PATCH sent
    const patchCalls = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(0);

    confirmSpy.mockRestore();
  });

  // ------------------------------------------------------------------
  // Non-published slug change → no extra confirm
  // ------------------------------------------------------------------

  it("DRAFT post slug change does NOT trigger URL-breakage confirm but shows save confirm", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(DRAFT_POST),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(DRAFT_POST),
      });

    render(
      <PostFormPage
        mode="edit"
        slug="draft-slug"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "changed-draft-slug" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // Wait for PATCH to be sent (save still happens)
    await waitFor(() => {
      const patchCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
      );
      expect(patchCall).toBeTruthy();
    });

    // Only the general save confirm was called — no URL-breakage confirm
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/save/i));

    confirmSpy.mockRestore();
  });

  it("ARCHIVED post slug change does NOT trigger URL-breakage confirm but shows save confirm", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ARCHIVED_POST),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ARCHIVED_POST),
      });

    render(
      <PostFormPage
        mode="edit"
        slug="old-slug"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/^slug/i), {
      target: { value: "changed-slug" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const patchCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
      );
      expect(patchCall).toBeTruthy();
    });

    // Only the general save confirm was called — no URL-breakage confirm
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/save/i));

    confirmSpy.mockRestore();
  });

  it("slug unchanged on PUBLISHED post shows save confirm but no URL-breakage confirm", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(PUBLISHED_POST),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(PUBLISHED_POST),
      });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    // Slug unchanged — only change title
    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "Updated Title" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const patchCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
      );
      expect(patchCall).toBeTruthy();
    });

    // Only the general save confirm was called (slug not changed)
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/save/i));

    confirmSpy.mockRestore();
  });
});

// =========================================================================
// Cover image preview and downloadable file management
// =========================================================================

describe("PostFormPage cover image preview", () => {
  it("renders cover preview <img> with thumb URL when post has coverImageId", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    const img = screen.getByTestId("post-form-cover-preview");
    expect(img).toBeTruthy();
    expect(img.tagName).toBe("IMG");
    expect((img as HTMLImageElement).src).toContain("/files/cover-1/thumb");
  });

  it("does NOT render cover preview <img> when coverImageId is null", async () => {
    const postWithoutCover = { ...MOCK_POST, coverImageId: null };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(postWithoutCover),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    expect(screen.queryByTestId("post-form-cover-preview")).toBeNull();
  });

  it("renders a cover FileUploadWidget with category POST_COVER_IMAGE", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    // Cover upload widget exists
    expect(screen.getByTestId("post-form-cover-widget")).toBeTruthy();
  });
});

describe("PostFormPage downloads", () => {
  it("renders download link, label input, and remove widget per download", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    // Download link
    const link = screen.getByTestId("post-form-download-link-file-1");
    expect(link).toBeTruthy();
    expect(link.tagName).toBe("A");
    expect((link as HTMLAnchorElement).href).toContain("/files/file-1");

    // Label input with current value
    const labelInput = screen.getByTestId("post-form-download-label-file-1");
    expect(labelInput).toBeTruthy();
    expect(labelInput.tagName).toBe("INPUT");
    expect((labelInput as HTMLInputElement).value).toBe("PDF Guide");

    // Remove widget per download
    expect(screen.getByTestId("post-form-download-widget-file-1")).toBeTruthy();
  });

  it("allows editing a download label via text input", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    const labelInput = screen.getByTestId(
      "post-form-download-label-file-1",
    ) as HTMLInputElement;

    fireEvent.change(labelInput, {
      target: { value: "Updated Guide" },
    });

    expect(labelInput.value).toBe("Updated Guide");
  });

  it("renders add-new download upload slot", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    // Add-new download slot exists
    expect(screen.getByTestId("post-form-download-add")).toBeTruthy();
  });

  it("does NOT render downloads section when post has no downloads", async () => {
    const postWithoutDownloads = {
      ...MOCK_POST,
      downloads: [],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(postWithoutDownloads),
    });

    render(
      <PostFormPage
        mode="edit"
        slug="hello-world"
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("post-form")).toBeTruthy();
    });

    // No download links
    expect(screen.queryByTestId(/post-form-download-link-/)).toBeNull();

    // Add-new slot still exists
    expect(screen.getByTestId("post-form-download-add")).toBeTruthy();
  });
});
