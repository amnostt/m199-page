import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { App } from "./App.js";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const FULL_PAYLOAD = {
  heroTitle: "Misión 1-99",
  heroSubtitle: "Transformamos vidas",
  heroImageUrl: "/files/img-1",
  mission: "Alcanzar, discipular, enviar",
  vision: "Ver cada vida transformada",
  description: "Somos una comunidad de fe",
  featuredVideoUrl: "https://youtube.com/embed/abc",
  contactEmail: "contacto@m199.org",
  contactPhone: "+54 11 1234-5678",
  featuredOuting: {
    id: "outing-1",
    slug: "salida-misionera",
    title: "Salida Misionera 2025",
    location: "Chaco, Argentina",
    mainImageUrl: "/files/img-outing",
  },
  featuredPosts: [
    {
      id: "post-1",
      slug: "primer-post",
      title: "Un testimonio de fe",
      coverImageUrl: "/files/img-post",
    },
  ],
  currentVerse: {
    text: "Id por todo el mundo y predicad el evangelio",
    reference: "Marcos 16:15",
    date: "2025-01-01T00:00:00.000Z",
  },
};

function mockFetchOk(
  payload: Record<string, unknown>,
): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(payload),
  });
}

// ---------------------------------------------------------------------------
// Helpers — handle React 19 StrictMode double-render
// ---------------------------------------------------------------------------

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
// Setup / teardown
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("App (landing rendering)", () => {
  it("renders all landing sections when the full payload is returned", async () => {
    globalThis.fetch = mockFetchOk(FULL_PAYLOAD) as unknown as typeof fetch;

    render(<App />);

    await waitFor(() => {
      expectSection("hero-section");
    });

    // Hero
    expect(getOne("hero-title").textContent).toBe("Misión 1-99");
    expect(getOne("hero-subtitle").textContent).toBe("Transformamos vidas");
    expect(getOne("hero-image")).toBeTruthy();

    // Copy sections
    expectSection("mission-section");
    expect(getOne("mission-text").textContent).toBe(
      "Alcanzar, discipular, enviar",
    );

    expectSection("vision-section");
    expect(getOne("vision-text").textContent).toBe(
      "Ver cada vida transformada",
    );

    expectSection("description-section");
    expect(getOne("description-text").textContent).toBe(
      "Somos una comunidad de fe",
    );

    // Video
    expectSection("video-section");
    expect(getOne("featured-video").getAttribute("src")).toBe(
      "https://youtube.com/embed/abc",
    );

    // Contact
    expectSection("contact-section");
    expect(getOne("contact-email").textContent).toBe("contacto@m199.org");
    expect(getOne("contact-phone").textContent).toBe("+54 11 1234-5678");

    // Featured outing
    expectSection("featured-outing-section");
    expect(getOne("outing-location").textContent).toBe("Chaco, Argentina");

    // Featured posts
    expectSection("featured-posts-section");
    expect(getOne("post-post-1")).toBeTruthy();

    // Verse
    expectSection("verse-section");
    expect(getOne("verse-text").textContent).toBe(
      "Id por todo el mundo y predicad el evangelio",
    );
    expect(getOne("verse-reference").textContent).toBe("Marcos 16:15");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — null featuredOuting hides section
  // -----------------------------------------------------------------------

  it("hides the featured-outing section when featuredOuting is null", async () => {
    const payload = { ...FULL_PAYLOAD, featuredOuting: null };
    globalThis.fetch = mockFetchOk(payload) as unknown as typeof fetch;

    render(<App />);

    await waitFor(() => {
      expectSection("hero-section");
    });

    expectNoSection("featured-outing-section");
    expectSection("mission-section");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — empty featuredPosts hides section
  // -----------------------------------------------------------------------

  it("hides the featured-posts section when featuredPosts is empty", async () => {
    const payload = { ...FULL_PAYLOAD, featuredPosts: [] };
    globalThis.fetch = mockFetchOk(payload) as unknown as typeof fetch;

    render(<App />);

    await waitFor(() => {
      expectSection("hero-section");
    });

    expectNoSection("featured-posts-section");
    expectSection("verse-section");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — missing heroImage hides hero section
  // -----------------------------------------------------------------------

  it("hides the hero section when heroImageUrl is null", async () => {
    const payload = {
      ...FULL_PAYLOAD,
      heroImageUrl: null,
      heroTitle: "Still present",
      heroSubtitle: "Also present",
    };
    globalThis.fetch = mockFetchOk(payload) as unknown as typeof fetch;

    render(<App />);

    await waitFor(() => {
      expectSection("mission-section");
    });

    expectNoSection("hero-section");
    expectSection("video-section");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — null copy sections hide themselves
  // -----------------------------------------------------------------------

  it("hides individual copy sections when their value is null", async () => {
    const payload = {
      ...FULL_PAYLOAD,
      mission: null,
      vision: null,
      description: null,
      featuredVideoUrl: null,
      contactEmail: null,
    };
    globalThis.fetch = mockFetchOk(payload) as unknown as typeof fetch;

    render(<App />);

    await waitFor(() => {
      expectSection("hero-section");
    });

    expectNoSection("mission-section");
    expectNoSection("vision-section");
    expectNoSection("description-section");
    expectNoSection("video-section");

    // Contact section still renders (has phone), but email is hidden
    expectSection("contact-section");
    expectNoSection("contact-email");
    expect(getOne("contact-phone").textContent).toBe("+54 11 1234-5678");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — null currentVerse hides section
  // -----------------------------------------------------------------------

  it("hides the verse section when currentVerse is null", async () => {
    const payload = { ...FULL_PAYLOAD, currentVerse: null };
    globalThis.fetch = mockFetchOk(payload) as unknown as typeof fetch;

    render(<App />);

    await waitFor(() => {
      expectSection("hero-section");
    });

    expectNoSection("verse-section");
    expectSection("featured-posts-section");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — fetch failure shows Vite shell fallback
  // -----------------------------------------------------------------------

  it("shows the Vite shell fallback when the fetch fails", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    render(<App />);

    await waitFor(() => {
      expectSection("shell-fallback");
    });

    const shellTexts = screen.getAllByText(/workspace shell is running/i);
    expect(shellTexts.length).toBeGreaterThan(0);
    expectNoSection("hero-section");
  });
});
