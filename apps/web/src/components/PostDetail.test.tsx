import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { PostDetail } from "./PostDetail.js";
import type { PostPublicDownload } from "./PostsList.js";

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

/** Get the first element with the given test ID (throws if none). */
function getOne(testId: string): HTMLElement {
  const elements = screen.getAllByTestId(testId);
  return elements[0]!;
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const DOWNLOAD_1: PostPublicDownload = {
  fileUrl: "/files/file-dl-001",
  label: "Guía de estudio",
};

const DOWNLOAD_2: PostPublicDownload = {
  fileUrl: "/files/file-dl-002",
  label: null,
};

const POST_DETAIL = {
  id: "post-1",
  slug: "primer-post",
  title: "Un testimonio de fe",
  description: "Un breve resumen del testimonio",
  coverImageUrl: "/files/img-post-1",
  content:
    "<h2>Introducción</h2><p>Contenido del post con <strong>énfasis</strong> y <em>cursiva</em>.</p><blockquote>Una cita importante</blockquote>",
  status: "PUBLISHED" as const,
  tags: ["fe", "testimonio", "reflexion"],
  publishedAt: "2025-06-15T10:00:00.000Z",
  downloads: [] as PostPublicDownload[],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests — Task 3.2: PostDetail
// ---------------------------------------------------------------------------

describe("PostDetail", () => {
  // -----------------------------------------------------------------------
  // RED 1 — loading state
  // -----------------------------------------------------------------------

  it("shows loading state while fetch is in-flight", () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(
        () => new Promise<Response>(() => {}),
      ) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    expect(screen.getByTestId("post-detail-loading")).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // RED 2 — not found (404)
  // -----------------------------------------------------------------------

  it("shows not found when API returns 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Not Found" }),
    }) as unknown as typeof fetch;

    render(<PostDetail slug="nonexistent" />);

    await waitFor(() => {
      expectSection("post-detail-not-found");
    });

    expect(screen.getByText(/post no encontrado/i)).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // RED 3 — error state
  // -----------------------------------------------------------------------

  it("shows error state when fetch fails", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-error");
    });

    expect(screen.getByText(/no se pudo cargar/i)).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // RED 4 — renders post detail with all fields
  // -----------------------------------------------------------------------

  it("renders post detail with title, description, content, tags, and date", async () => {
    globalThis.fetch = mockFetchOk(POST_DETAIL) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    expect(screen.getByText("Un testimonio de fe")).toBeTruthy();
    expect(screen.getByText("Un breve resumen del testimonio")).toBeTruthy();

    // Tags
    expect(screen.getByText("fe")).toBeTruthy();
    expect(screen.getByText("testimonio")).toBeTruthy();

    // Content is rendered via dangerouslySetInnerHTML
    const contentEl = screen.getByTestId("post-detail-content");
    expect(contentEl.innerHTML).toContain("Contenido del post");
  });

  // -----------------------------------------------------------------------
  // RED 5 — renders cover image when present
  // -----------------------------------------------------------------------

  it("renders cover image when coverImageUrl is present", async () => {
    globalThis.fetch = mockFetchOk(POST_DETAIL) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    const img = screen.getByTestId("post-detail-cover") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/files/img-post-1");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — no cover image when null
  // -----------------------------------------------------------------------

  it("does not render cover image when coverImageUrl is null", async () => {
    const postNoCover = { ...POST_DETAIL, coverImageUrl: null };
    globalThis.fetch = mockFetchOk(postNoCover) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    expectNoSection("post-detail-cover");
  });

  // -----------------------------------------------------------------------
  // RED 6 — sanitizes content, stripping dangerous tags
  // -----------------------------------------------------------------------

  it("sanitizes content, stripping scripts and dangerous tags", async () => {
    const postDangerous = {
      ...POST_DETAIL,
      content:
        '<p>Safe</p><script>alert("xss")</script><img src="x.png" onerror="steal()"><iframe src="evil"></iframe>',
    };
    globalThis.fetch = mockFetchOk(postDangerous) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    const contentEl = screen.getByTestId("post-detail-content");
    expect(contentEl.innerHTML).not.toContain("<script>");
    expect(contentEl.innerHTML).not.toContain("<img");
    expect(contentEl.innerHTML).not.toContain("<iframe");
    expect(contentEl.innerHTML).not.toContain("onerror");

    // Safe content preserved
    expect(contentEl.innerHTML).toContain("Safe");
  });

  // -----------------------------------------------------------------------
  // RED 7 — preserves allowed HTML tags
  // -----------------------------------------------------------------------

  it("preserves allowed tags after sanitization", async () => {
    const postAllowed = {
      ...POST_DETAIL,
      content:
        "<h2>Título</h2><h3>Subtítulo</h3><p>Párrafo con <strong>negrita</strong> y <em>cursiva</em>.</p><ul><li>Item 1</li><li>Item 2</li></ul><ol><li>Paso 1</li></ol><blockquote>Cita</blockquote><br>",
    };
    globalThis.fetch = mockFetchOk(postAllowed) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    const contentEl = screen.getByTestId("post-detail-content");
    expect(contentEl.innerHTML).toContain("<h2>");
    expect(contentEl.innerHTML).toContain("<h3>");
    expect(contentEl.innerHTML).toContain("<p>");
    expect(contentEl.innerHTML).toContain("<strong>");
    expect(contentEl.innerHTML).toContain("<em>");
    expect(contentEl.innerHTML).toContain("<ul>");
    expect(contentEl.innerHTML).toContain("<ol>");
    expect(contentEl.innerHTML).toContain("<li>");
    expect(contentEl.innerHTML).toContain("<blockquote>");
    expect(contentEl.innerHTML).toContain("<br>");
  });

  // -----------------------------------------------------------------------
  // RED 8 — external links get rel="noopener noreferrer" and target="_blank"
  // -----------------------------------------------------------------------

  it("adds target=_blank and rel=noopener noreferrer to links", async () => {
    const postWithLinks = {
      ...POST_DETAIL,
      content:
        '<p>Visita <a href="https://example.com">este link</a> para más info.</p>',
    };
    globalThis.fetch = mockFetchOk(postWithLinks) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    const contentEl = screen.getByTestId("post-detail-content");
    const link = contentEl.querySelector("a");
    expect(link).toBeTruthy();
    expect(link!.getAttribute("target")).toBe("_blank");
    expect(link!.getAttribute("rel")).toBe("noopener noreferrer");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — HREF hook post-processing works for multiple links
  // -----------------------------------------------------------------------

  it("applies safe attributes to multiple links in content", async () => {
    const postWithMultipleLinks = {
      ...POST_DETAIL,
      content:
        '<p><a href="https://a.com">Link A</a> y <a href="https://b.com">Link B</a></p>',
    };
    globalThis.fetch = mockFetchOk(
      postWithMultipleLinks,
    ) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    const contentEl = screen.getByTestId("post-detail-content");
    const links = contentEl.querySelectorAll("a");
    expect(links.length).toBe(2);

    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  // -----------------------------------------------------------------------
  // RED 9 — renders published date
  // -----------------------------------------------------------------------

  it("renders published date", async () => {
    globalThis.fetch = mockFetchOk(POST_DETAIL) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    const dateEl = screen.getByTestId("post-detail-date");
    expect(dateEl.textContent).toBeTruthy();
  });

  it("does not render a date when a transitional API response has null publishedAt", async () => {
    const postWithoutPublicationDate = { ...POST_DETAIL, publishedAt: null };
    globalThis.fetch = mockFetchOk(
      postWithoutPublicationDate,
    ) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    expectNoSection("post-detail-date");
  });

  // -----------------------------------------------------------------------
  // RED 10 — renders download links (Blocker 3 fix)
  // -----------------------------------------------------------------------

  it("renders download links when downloads are present", async () => {
    const postWithDownloads = {
      ...POST_DETAIL,
      downloads: [DOWNLOAD_1, DOWNLOAD_2],
    };
    globalThis.fetch = mockFetchOk(
      postWithDownloads,
    ) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    // Downloads section should be visible
    const downloadsEl = screen.getByTestId("post-detail-downloads");
    expect(downloadsEl).toBeTruthy();

    // Both download links should be rendered
    const links = downloadsEl.querySelectorAll("a");
    expect(links.length).toBe(2);

    // First download with label
    const link1 = links[0]!;
    expect(link1.getAttribute("href")).toBe("/files/file-dl-001");
    expect(link1.textContent).toContain("Guía de estudio");

    // Second download without label (shows file URL as label)
    const link2 = links[1]!;
    expect(link2.getAttribute("href")).toBe("/files/file-dl-002");
  });

  it("does not render downloads section when no downloads", async () => {
    globalThis.fetch = mockFetchOk(POST_DETAIL) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    expectNoSection("post-detail-downloads");
  });

  // -----------------------------------------------------------------------
  // Task 3.2: Public visual system hooks
  // -----------------------------------------------------------------------

  it("applies public-state class to loading branch", () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(
        () => new Promise<Response>(() => {}),
      ) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    const loading = screen.getByTestId("post-detail-loading");
    expect(loading.classList.contains("public-state")).toBe(true);
  });

  it("applies public-state--error class to not-found branch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Not Found" }),
    }) as unknown as typeof fetch;

    render(<PostDetail slug="nonexistent" />);

    await waitFor(() => {
      expectSection("post-detail-not-found");
    });

    const notFound = screen.getByTestId("post-detail-not-found");
    expect(notFound.classList.contains("public-state--error")).toBe(true);
  });

  it("applies public-state--error class to error branch", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-error");
    });

    const errorEl = screen.getByTestId("post-detail-error");
    expect(errorEl.classList.contains("public-state--error")).toBe(true);
  });

  it("applies public-section, public-prose, and public-tags to the detail", async () => {
    globalThis.fetch = mockFetchOk(POST_DETAIL) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    const detail = getOne("post-detail-section");
    expect(detail.classList.contains("public-section")).toBe(true);

    const content = getOne("post-detail-content");
    expect(content.classList.contains("public-prose")).toBe(true);
    // Sanitization still in effect: rich content is preserved.
    expect(content.innerHTML).toContain("Contenido del post");

    const tags = getOne("post-detail-tags");
    expect(tags.classList.contains("public-tags")).toBe(true);

    const cover = getOne("post-detail-cover");
    const mediaWrapper = cover.closest(".public-media");
    expect(mediaWrapper).toBeTruthy();
    expect(mediaWrapper!.classList.contains("public-media--cover")).toBe(true);
  });

  it("applies public-section and public-action classes to download links", async () => {
    const postWithDownloads = {
      ...POST_DETAIL,
      downloads: [DOWNLOAD_1, DOWNLOAD_2],
    };
    globalThis.fetch = mockFetchOk(
      postWithDownloads,
    ) as unknown as typeof fetch;

    render(<PostDetail slug="primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    const downloads = screen.getByTestId("post-detail-downloads");
    expect(downloads.classList.contains("public-section")).toBe(true);

    const actionLinks = downloads.querySelectorAll("a.public-action");
    expect(actionLinks.length).toBe(2);
    // External link behavior is preserved.
    for (const link of actionLinks) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });
});
