import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { PostsList } from "./PostsList.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchOk(payload: unknown): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(payload),
  });
}

/** Assert at least one element with the given test ID is in the document. */
function expectSection(testId: string): void {
  const elements = screen.queryAllByTestId(testId);
  expect(
    elements.length,
    `expected at least one element with data-testid="${testId}"`,
  ).toBeGreaterThan(0);
}

/** Assert no element with the given test ID is in the document. */
function expectNoSection(testId: string): void {
  const elements = screen.queryAllByTestId(testId);
  expect(
    elements.length,
    `expected zero elements with data-testid="${testId}"`,
  ).toBe(0);
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const PUBLISHED_POSTS = [
  {
    id: "post-1",
    slug: "primer-post",
    title: "Un testimonio de fe",
    description: "Un breve resumen",
    coverImageUrl: "/files/img-post-1",
    content: "<p>Contenido seguro</p>",
    status: "PUBLISHED" as const,
    tags: ["fe", "testimonio"],
    publishedAt: "2025-06-15T10:00:00.000Z",
    downloads: [],
  },
  {
    id: "post-2",
    slug: "segundo-post",
    title: "Reflexión semanal",
    description: "Otra reflexión",
    coverImageUrl: null,
    content: "<h2>Título</h2><p>Texto con <strong>énfasis</strong></p>",
    status: "PUBLISHED" as const,
    tags: ["reflexion", "semanal"],
    publishedAt: "2025-06-10T10:00:00.000Z",
    downloads: [],
  },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests — Task 3.1: PostsList
// ---------------------------------------------------------------------------

describe("PostsList", () => {
  // -----------------------------------------------------------------------
  // RED 1 — loading state
  // -----------------------------------------------------------------------

  it("shows loading state while fetch is in-flight", () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(
        () => new Promise<Response>(() => {}),
      ) as unknown as typeof fetch;

    render(<PostsList />);

    expect(screen.getByTestId("posts-loading")).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // RED 2 — empty state
  // -----------------------------------------------------------------------

  it("shows empty state when no posts exist", async () => {
    globalThis.fetch = mockFetchOk([]) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    expect(screen.getByTestId("posts-empty").textContent).toContain("No hay");
  });

  // -----------------------------------------------------------------------
  // RED 3 — error state
  // -----------------------------------------------------------------------

  it("shows error state when fetch fails", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-error");
    });

    expect(screen.getByText(/no se pudo cargar/i)).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // RED 4 — renders published posts with titles, descriptions, links
  // -----------------------------------------------------------------------

  it("renders published posts with title, description, and links", async () => {
    globalThis.fetch = mockFetchOk(PUBLISHED_POSTS) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    // Both titles should be visible
    expect(screen.getByText("Un testimonio de fe")).toBeTruthy();
    expect(screen.getByText("Reflexión semanal")).toBeTruthy();

    // Descriptions
    expect(screen.getByText("Un breve resumen")).toBeTruthy();
    expect(screen.getByText("Otra reflexión")).toBeTruthy();

    // Each post links to its detail page
    const links = screen.getAllByRole("link");
    // Each post card has at least a title link; first post has a cover link too
    const detailLinks = links.filter((l) =>
      l.getAttribute("href")?.startsWith("/posts/"),
    );
    expect(detailLinks.length).toBeGreaterThanOrEqual(2);
  });

  // -----------------------------------------------------------------------
  // RED 5 — renders cover image when present
  // -----------------------------------------------------------------------

  it("renders cover image when coverImageUrl is present", async () => {
    globalThis.fetch = mockFetchOk([
      PUBLISHED_POSTS[0]!,
    ]) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    const img = screen.getByTestId("post-cover-post-1") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/files/img-post-1");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — no cover image when null
  // -----------------------------------------------------------------------

  it("does not render cover image when coverImageUrl is null", async () => {
    globalThis.fetch = mockFetchOk([
      PUBLISHED_POSTS[1]!,
    ]) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    expectNoSection("post-cover-post-2");
  });

  // -----------------------------------------------------------------------
  // RED 6 — renders tags
  // -----------------------------------------------------------------------

  it("renders post tags", async () => {
    globalThis.fetch = mockFetchOk([
      PUBLISHED_POSTS[0]!,
    ]) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    expect(screen.getByText("fe")).toBeTruthy();
    expect(screen.getByText("testimonio")).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // RED 7 — sanitizes content with DOMPurify
  // -----------------------------------------------------------------------

  it("sanitizes post content, stripping dangerous tags", async () => {
    const postsWithDangerous = [
      {
        ...PUBLISHED_POSTS[0]!,
        content:
          '<p>Safe text</p><script>alert("xss")</script><img src="evil.png" onerror="alert(1)">',
      },
    ];
    globalThis.fetch = mockFetchOk(
      postsWithDangerous,
    ) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    // Script and img tags are stripped
    const contentEl = screen.getByTestId("post-content-post-1");
    expect(contentEl.innerHTML).not.toContain("<script>");
    expect(contentEl.innerHTML).not.toContain("onerror");
    expect(contentEl.innerHTML).not.toContain("<img");

    // Safe content remains
    expect(contentEl.innerHTML).toContain("Safe text");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — allowed tags remain after sanitization
  // -----------------------------------------------------------------------

  it("preserves allowed HTML tags after sanitization", async () => {
    const postsWithAllowed = [
      {
        ...PUBLISHED_POSTS[0]!,
        content:
          "<h2>Título</h2><p>Un párrafo con <strong>negrita</strong> y <em>cursiva</em>.</p><ul><li>Item 1</li></ul><blockquote>Cita</blockquote>",
      },
    ];
    globalThis.fetch = mockFetchOk(postsWithAllowed) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    const contentEl = screen.getByTestId("post-content-post-1");
    expect(contentEl.innerHTML).toContain("<h2>");
    expect(contentEl.innerHTML).toContain("<p>");
    expect(contentEl.innerHTML).toContain("<strong>");
    expect(contentEl.innerHTML).toContain("<em>");
    expect(contentEl.innerHTML).toContain("<ul>");
    expect(contentEl.innerHTML).toContain("<li>");
    expect(contentEl.innerHTML).toContain("<blockquote>");
  });

  // -----------------------------------------------------------------------
  // RED 8 — renders published date
  // -----------------------------------------------------------------------

  it("renders published date", async () => {
    globalThis.fetch = mockFetchOk([
      PUBLISHED_POSTS[0]!,
    ]) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    // publishedAt is displayed (we use a testid)
    const dateEl = screen.getByTestId("post-date-post-1");
    expect(dateEl.textContent).toBeTruthy();
  });

  it("does not render a date when a transitional API response has null publishedAt", async () => {
    const postWithoutPublicationDate = {
      ...PUBLISHED_POSTS[0]!,
      publishedAt: null,
    };
    globalThis.fetch = mockFetchOk([
      postWithoutPublicationDate,
    ]) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    expectNoSection("post-date-post-1");
  });

  // -----------------------------------------------------------------------
  // RED 9 — safe link attributes in post content (Blocker 1 fix)
  // -----------------------------------------------------------------------

  it("applies target=_blank and rel=noopener noreferrer to links in content", async () => {
    const postsWithLinks = [
      {
        ...PUBLISHED_POSTS[0]!,
        content:
          '<p>Visita <a href="https://example.com">nuestro sitio</a> para más información.</p>',
      },
    ];
    globalThis.fetch = mockFetchOk(postsWithLinks) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    const contentEl = screen.getByTestId("post-content-post-1");
    const links = contentEl.querySelectorAll("a");
    expect(links.length).toBe(1);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — safe link attributes applied to multiple anchors in content
  // -----------------------------------------------------------------------

  it("applies safe attributes to multiple links in content", async () => {
    const postsWithMultiLinks = [
      {
        ...PUBLISHED_POSTS[0]!,
        content:
          '<p><a href="https://a.com">A</a> y <a href="https://b.com">B</a></p>',
      },
    ];
    globalThis.fetch = mockFetchOk(
      postsWithMultiLinks,
    ) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    const contentEl = screen.getByTestId("post-content-post-1");
    const links = contentEl.querySelectorAll("a");
    expect(links.length).toBe(2);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  // -----------------------------------------------------------------------
  // Task 3.1: Public visual system hooks
  // -----------------------------------------------------------------------

  it("applies public-state class to loading branch", () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(
        () => new Promise<Response>(() => {}),
      ) as unknown as typeof fetch;

    render(<PostsList />);

    const loading = screen.getByTestId("posts-loading");
    expect(loading.classList.contains("public-state")).toBe(true);
  });

  it("applies public-state class to empty branch", async () => {
    globalThis.fetch = mockFetchOk([]) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    const empty = screen.getByTestId("posts-empty");
    expect(empty.classList.contains("public-state")).toBe(true);
  });

  it("applies public-state--error class to error branch", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-error");
    });

    const errorEl = screen.getByTestId("posts-error");
    expect(errorEl.classList.contains("public-state")).toBe(true);
    expect(errorEl.classList.contains("public-state--error")).toBe(true);
  });

  it("applies public-card, public-card-list, and public-action to the list", async () => {
    globalThis.fetch = mockFetchOk(PUBLISHED_POSTS) as unknown as typeof fetch;

    const { container } = render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    const list = container.querySelector(".public-card-list");
    expect(list).toBeTruthy();
    const cards = list!.querySelectorAll(".public-card");
    expect(cards.length).toBe(2);

    const titleLinks = list!.querySelectorAll("a.public-action");
    expect(titleLinks.length).toBe(2);
    expect(titleLinks[0]!.getAttribute("href")).toBe("/posts/primer-post");
    expect(titleLinks[1]!.getAttribute("href")).toBe("/posts/segundo-post");
  });

  it("applies public-prose and public-tags hooks without changing sanitization", async () => {
    globalThis.fetch = mockFetchOk(PUBLISHED_POSTS) as unknown as typeof fetch;

    render(<PostsList />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    const contentEl = screen.getByTestId("post-content-post-1");
    expect(contentEl.classList.contains("public-prose")).toBe(true);
    // Sanitization still in effect: safe text is preserved.
    expect(contentEl.innerHTML).toContain("Contenido seguro");

    const tags = screen.getByTestId("post-tags-post-1");
    expect(tags.classList.contains("public-tags")).toBe(true);
    // Tags are still rendered as list items.
    expect(tags.querySelectorAll("li").length).toBe(2);
  });
});
