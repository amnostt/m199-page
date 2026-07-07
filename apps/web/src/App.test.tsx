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
  payload: unknown,
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
// Outings fixtures
// ---------------------------------------------------------------------------

const OUTING_LIST = [
  {
    id: "outing-1",
    slug: "camp-day",
    title: "Camp Day 2025",
    dateTime: "2025-06-15T10:00:00.000Z",
    location: "Chaco, Argentina",
    description: "A day full of activities",
    status: "PUBLISHED",
    likesCount: 5,
    mainImageUrl: "/files/img-outing",
    croquisUrl: null,
    planUrl: null,
  },
  {
    id: "outing-2",
    slug: "retreat",
    title: "Retiro Espiritual",
    dateTime: "2025-07-20T09:00:00.000Z",
    location: "C\u00f3rdoba, Argentina",
    description: "Un fin de semana de reflexi\u00f3n",
    status: "PUBLISHED",
    likesCount: 12,
    mainImageUrl: null,
    croquisUrl: "/files/img-croquis",
    planUrl: "/files/img-plan",
  },
];

const SINGLE_OUTING = OUTING_LIST[0]!;

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

// ---------------------------------------------------------------------------
// Phase 4: Outings web UI
// ---------------------------------------------------------------------------

describe("Outings list (4.2)", () => {
  it("renders published outings with titles and links", async () => {
    globalThis.fetch = mockFetchOk(OUTING_LIST) as unknown as typeof fetch;

    render(<App pathname="/outings" />);

    await waitFor(() => {
      expectSection("outings-list-section");
    });

    // Both outing titles should be visible
    expect(screen.getByText("Camp Day 2025")).toBeTruthy();
    expect(screen.getByText("Retiro Espiritual")).toBeTruthy();

    // Each outing links to its detail page
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(2);
    expect(links[0]!.getAttribute("href")).toBe("/outings/camp-day");
    expect(links[1]!.getAttribute("href")).toBe("/outings/retreat");
  });

  it("shows empty state when no outings exist", async () => {
    globalThis.fetch = mockFetchOk([]) as unknown as typeof fetch;

    render(<App pathname="/outings" />);

    await waitFor(() => {
      expectSection("outings-list-section");
    });

    expect(screen.getByTestId("outings-empty").textContent).toBe(
      "No hay salidas publicadas.",
    );
  });

  it("shows loading state while outings fetch is in-flight", () => {
    // Never-resolving fetch keeps the component in loading state
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {})) as unknown as typeof fetch;

    render(<App pathname="/outings" />);

    expect(screen.getByTestId("outings-loading")).toBeTruthy();
    expect(
      screen.getByText(/cargando salidas/i),
    ).toBeTruthy();
  });

  it("shows error state when outings fetch fails", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    render(<App pathname="/outings" />);

    await waitFor(() => {
      expectSection("outings-error");
    });

    expect(
      screen.getByText(/no se pudo cargar la lista/i),
    ).toBeTruthy();
  });
});

describe("Outing detail (4.3)", () => {
  it("renders outing detail with title, date, location, description, and assets", async () => {
    globalThis.fetch = mockFetchOk(SINGLE_OUTING) as unknown as typeof fetch;

    render(<App pathname="/outings/camp-day" />);

    await waitFor(() => {
      expectSection("outing-detail-section");
    });

    expect(screen.getByText("Camp Day 2025")).toBeTruthy();
    expect(screen.getByText("Chaco, Argentina")).toBeTruthy();
    expect(screen.getByText("A day full of activities")).toBeTruthy();

    // Main image should be rendered
    const img = screen.getByTestId("outing-main-image") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/files/img-outing");
  });

  it("shows loading state while outing detail fetch is in-flight", () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {})) as unknown as typeof fetch;

    render(<App pathname="/outings/camp-day" />);

    expect(screen.getByTestId("outing-detail-loading")).toBeTruthy();
    expect(
      screen.getByText(/cargando salida/i),
    ).toBeTruthy();
  });

  it("shows not found when API returns 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Not Found" }),
    }) as unknown as typeof fetch;

    render(<App pathname="/outings/nonexistent" />);

    await waitFor(() => {
      expectSection("outing-not-found");
    });

    expect(
      screen.getByText(/salida no encontrada/i),
    ).toBeTruthy();
  });

  it("renders like button with initial count from detail response", async () => {
    globalThis.fetch = mockFetchOk(SINGLE_OUTING) as unknown as typeof fetch;

    render(<App pathname="/outings/camp-day" />);

    await waitFor(() => {
      expectSection("outing-detail-section");
    });

    expect(screen.getByTestId("like-button")).toBeTruthy();
    expect(screen.getByTestId("like-count").textContent).toBe("5");
  });
});

describe("Like button (4.4)", () => {
  it("increments like count on click and disables for idempotency", async () => {
    let likePostCalled = false;
    globalThis.fetch = vi
      .fn()
      .mockImplementation((_url: string, init?: RequestInit) => {
        if (init?.method === "POST" && !likePostCalled) {
          likePostCalled = true;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ likesCount: 6 }),
          });
        }
        if (init?.method === "POST") {
          // Idempotent: second POST returns same count
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ likesCount: 6 }),
          });
        }
        // Detail fetch
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(SINGLE_OUTING),
        });
      }) as unknown as typeof fetch;

    render(<App pathname="/outings/camp-day" />);

    await waitFor(() => {
      expectSection("outing-detail-section");
    });

    const likeButton = screen.getByTestId("like-button");
    expect(screen.getByTestId("like-count").textContent).toBe("5");

    // First click: increments
    likeButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("like-count").textContent).toBe("6");
    });

    // Button should be disabled after click
    expect((likeButton as HTMLButtonElement).disabled).toBe(true);

    // Second click: stays at 6 (button is disabled anyway)
    expect(screen.getByTestId("like-count").textContent).toBe("6");
  });

  it("shows like error state on POST failure", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ message: "Error" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(SINGLE_OUTING),
        });
      }) as unknown as typeof fetch;

    render(<App pathname="/outings/camp-day" />);

    await waitFor(() => {
      expectSection("outing-detail-section");
    });

    const likeButton = screen.getByTestId("like-button");
    likeButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("like-error")).toBeTruthy();
    });
  });
});

describe("Landing featured outing link (4.6)", () => {
  it("links featured outing to its detail page", async () => {
    globalThis.fetch = mockFetchOk({
      ...FULL_PAYLOAD,
      featuredOuting: {
        id: "outing-1",
        slug: "camp-day",
        title: "Salida Misionera 2025",
        location: "Chaco, Argentina",
        mainImageUrl: "/files/img-outing",
      },
    }) as unknown as typeof fetch;

    render(<App pathname="/" />);

    await waitFor(() => {
      expectSection("featured-outing-section");
    });

    const link = screen.getByTestId("featured-outing-link");
    expect(link.getAttribute("href")).toBe("/outings/camp-day");
  });
});

// ---------------------------------------------------------------------------
// TRIANGULATE — edge cases for outings detail
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Manual verification: anchor / direct page load behavior
// ---------------------------------------------------------------------------
//
// The OutingsList and FeaturedOutingSection components render plain <a href>
// links to /outings/:slug. In the Vite dev server, browser page loads with
// Accept: text/html are now bypassed past the /outings proxy (see
// vite.config.ts bypass function), so direct navigation or page reloads at
// /outings/:slug serve the SPA correctly instead of hitting the API.
//
// Manual verification steps (Vite dev server running):
//   1. Start dev:  pnpm -F @m199/web dev
//   2. Start API:  pnpm -F @m199/api dev
//   3. Load http://localhost:5173/ — landing page renders
//   4. Click "Ver salida" link → should navigate to /outings/:slug and render
//      the outing detail page (not raw JSON)
//   5. Reload the page at /outings/:slug → should still render the SPA page
//   6. Navigate to /outings → should render the outings list
//   7. Reload /outings → should still render the SPA list page
//
// All existing unit tests verify the <a href> attributes and page-path
// rendering via the `pathname` prop, which covers the component-level behavior
// independently of the dev-server proxy configuration.
// ---------------------------------------------------------------------------

describe("Outing detail triangulation", () => {
  it("renders croquis and plan images when present", async () => {
    const outingWithAssets = OUTING_LIST[1]!; // has croquisUrl and planUrl
    globalThis.fetch = mockFetchOk(outingWithAssets) as unknown as typeof fetch;

    render(<App pathname="/outings/retreat" />);

    await waitFor(() => {
      expectSection("outing-detail-section");
    });

    expect(screen.getByTestId("outing-croquis")).toBeTruthy();
    expect(screen.getByTestId("outing-plan")).toBeTruthy();
  });

  it("does not render main image when mainImageUrl is null", async () => {
    const outingNoImage = { ...SINGLE_OUTING, mainImageUrl: null };
    globalThis.fetch = mockFetchOk(outingNoImage) as unknown as typeof fetch;

    render(<App pathname="/outings/camp-day" />);

    await waitFor(() => {
      expectSection("outing-detail-section");
    });

    expectNoSection("outing-main-image");
  });
});

// ---------------------------------------------------------------------------
// Task 3.3: Posts web routes integration tests
// ---------------------------------------------------------------------------

const POSTS_LIST = [
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
    slug: "reflexion-semanal",
    title: "Reflexión Semanal",
    description: "Otra reflexión",
    coverImageUrl: null,
    content: "<p>Contenido de reflexión</p>",
    status: "PUBLISHED" as const,
    tags: ["reflexion"],
    publishedAt: "2025-06-10T10:00:00.000Z",
    downloads: [],
  },
];

const POST_DETAIL = {
  id: "post-1",
  slug: "primer-post",
  title: "Un testimonio de fe",
  description: "Un breve resumen del testimonio",
  coverImageUrl: "/files/img-post-1",
  content:
    "<h2>Introducción</h2><p>Contenido del post con <strong>énfasis</strong>.</p>",
  status: "PUBLISHED" as const,
  tags: ["fe", "testimonio", "reflexion"],
  publishedAt: "2025-06-15T10:00:00.000Z",
  downloads: [],
};

describe("Posts list route (3.3)", () => {
  it("renders posts list at /posts pathname", async () => {
    globalThis.fetch = mockFetchOk(POSTS_LIST) as unknown as typeof fetch;

    render(<App pathname="/posts" />);

    await waitFor(() => {
      expectSection("posts-list-section");
    });

    expect(screen.getByText("Un testimonio de fe")).toBeTruthy();
    expect(screen.getByText("Reflexión Semanal")).toBeTruthy();
  });

  it("shows loading state on /posts while fetch is in-flight", () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {})) as unknown as typeof fetch;

    render(<App pathname="/posts" />);

    expect(screen.getByTestId("posts-loading")).toBeTruthy();
  });

  it("shows error state on /posts when fetch fails", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    render(<App pathname="/posts" />);

    await waitFor(() => {
      expectSection("posts-error");
    });

    expect(
      screen.getByText(/no se pudo cargar la lista/i),
    ).toBeTruthy();
  });
});

describe("Post detail route (3.3)", () => {
  it("renders post detail at /posts/:slug pathname", async () => {
    globalThis.fetch = mockFetchOk(POST_DETAIL) as unknown as typeof fetch;

    render(<App pathname="/posts/primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    expect(screen.getByText("Un testimonio de fe")).toBeTruthy();
    expect(screen.getByText("Un breve resumen del testimonio")).toBeTruthy();

    // Content sanitized and rendered
    const contentEl = screen.getByTestId("post-detail-content");
    expect(contentEl.innerHTML).toContain("Contenido del post");
  });

  it("shows not found on /posts/:slug when API returns 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Not Found" }),
    }) as unknown as typeof fetch;

    render(<App pathname="/posts/no-existe" />);

    await waitFor(() => {
      expectSection("post-detail-not-found");
    });

    expect(
      screen.getByText(/post no encontrado/i),
    ).toBeTruthy();
  });

  it("shows loading state on /posts/:slug while fetch is in-flight", () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {})) as unknown as typeof fetch;

    render(<App pathname="/posts/primer-post" />);

    expect(screen.getByTestId("post-detail-loading")).toBeTruthy();
  });

  it("shows error state on /posts/:slug when fetch fails", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    render(<App pathname="/posts/primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-error");
    });

    expect(
      screen.getByText(/no se pudo cargar el post/i),
    ).toBeTruthy();
  });
});

describe("Posts routing precedence (3.3)", () => {
  it("/posts/:slug matches post detail, not posts list", async () => {
    globalThis.fetch = mockFetchOk(POST_DETAIL) as unknown as typeof fetch;

    render(<App pathname="/posts/primer-post" />);

    await waitFor(() => {
      expectSection("post-detail-section");
    });

    // Posts list section should NOT be rendered
    expectNoSection("posts-list-section");
  });

  it("landing still renders at / when posts routes exist", async () => {
    globalThis.fetch = mockFetchOk(FULL_PAYLOAD) as unknown as typeof fetch;

    render(<App pathname="/" />);

    await waitFor(() => {
      expectSection("hero-section");
    });

    // Posts sections should NOT be rendered
    expectNoSection("posts-list-section");
    expectNoSection("post-detail-section");
  });
});
