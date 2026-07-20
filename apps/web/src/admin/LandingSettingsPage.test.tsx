// ---------------------------------------------------------------------------
// LandingSettingsPage component tests (Task 4.3)
//
// Tests Landing Settings editor behaviour:
// - GET /landing/admin on mount via adminFetch
// - Null response normalizes to empty form values
// - Load error shows error banner
// - Editable fields for all LP-01 base fields
// - window.confirm gate before every PUT save
// - Confirm cancelled → no PUT sent
// - Save success → success message shown
// - Save error → error message shown
// - Loading state prevents form interaction during fetch
// - Form disabled during save submission
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { LandingSettingsPage } from "./LandingSettingsPage.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_SETTINGS = {
  heroTitle: "Welcome to M199",
  heroSubtitle: "Serving the community",
  heroImageId: "existing-hero",
  mission: "Our mission text",
  vision: "Our vision text",
  description: "Our description text",
  featuredVideoUrl: "https://video.example.com/embed",
  contactEmail: "contact@example.com",
  contactPhone: "+54 11 1234-5678",
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

// ---------------------------------------------------------------------------
// Load behaviour — GET /landing/admin on mount
// ---------------------------------------------------------------------------

describe("LandingSettingsPage load", () => {
  it("shows loading state while fetching settings", async () => {
    // Never-resolving fetch keeps loading visible
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {}));

    render(<LandingSettingsPage />);

    expect(screen.getByTestId("landing-settings-loading")).toBeTruthy();
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it("fetches /landing/admin on mount and displays settings", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_SETTINGS),
    });

    render(<LandingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    // Verify fetch was called with credentials
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/landing/admin",
      expect.objectContaining({ credentials: "include" }),
    );

    // All fields are populated with API values
    expect(
      (screen.getByLabelText(/mission/i) as HTMLTextAreaElement).value,
    ).toBe(SAMPLE_SETTINGS.mission);
    expect(
      (screen.getByLabelText(/hero title/i) as HTMLInputElement).value,
    ).toBe(SAMPLE_SETTINGS.heroTitle);
    expect(
      (screen.getByLabelText(/hero subtitle/i) as HTMLTextAreaElement).value,
    ).toBe(SAMPLE_SETTINGS.heroSubtitle);
    expect(screen.getByTestId("landing-hero-asset-link").textContent).toBe(
      SAMPLE_SETTINGS.heroImageId,
    );
    expect(
      (screen.getByLabelText(/vision/i) as HTMLTextAreaElement).value,
    ).toBe(SAMPLE_SETTINGS.vision);
    expect(
      (screen.getByLabelText(/description/i) as HTMLTextAreaElement).value,
    ).toBe(SAMPLE_SETTINGS.description);
    expect((screen.getByLabelText(/video/i) as HTMLInputElement).value).toBe(
      SAMPLE_SETTINGS.featuredVideoUrl,
    );
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe(
      SAMPLE_SETTINGS.contactEmail,
    );
    expect((screen.getByLabelText(/phone/i) as HTMLInputElement).value).toBe(
      SAMPLE_SETTINGS.contactPhone,
    );
  });

  it("normalizes null API response to empty form values", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    });

    render(<LandingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    // All fields must be empty strings, never "null"
    expect(
      (screen.getByLabelText(/mission/i) as HTMLTextAreaElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText(/vision/i) as HTMLTextAreaElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText(/description/i) as HTMLTextAreaElement).value,
    ).toBe("");
    expect((screen.getByLabelText(/video/i) as HTMLInputElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText(/phone/i) as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("shows error banner on GET failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<LandingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-load-error")).toBeTruthy();
    });

    expect(screen.getByText(/failed to load/i)).toBeTruthy();
    // Form should NOT be visible on load failure
    expect(screen.queryByTestId("landing-settings-form")).toBeNull();
  });

  it("shows error banner when GET returns non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: "Server error" }),
    });

    render(<LandingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-load-error")).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — partial data: some fields null, some populated
  // -----------------------------------------------------------------------

  it("handles partial API response — null fields become empty strings", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          mission: "Only mission set",
          vision: null,
          description: null,
          featuredVideoUrl: null,
          contactEmail: null,
          contactPhone: null,
        }),
    });

    render(<LandingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    expect(
      (screen.getByLabelText(/mission/i) as HTMLTextAreaElement).value,
    ).toBe("Only mission set");
    expect(
      (screen.getByLabelText(/vision/i) as HTMLTextAreaElement).value,
    ).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Edit and Save behaviour
// ---------------------------------------------------------------------------

describe("LandingSettingsPage edit and save", () => {
  async function renderWithSettings() {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_SETTINGS),
    });

    render(<LandingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });
  }

  it("allows editing each field", async () => {
    await renderWithSettings();

    // Mission field is editable (textarea)
    const missionField = screen.getByLabelText(/mission/i);
    fireEvent.change(missionField, {
      target: { value: "Updated mission" },
    });
    expect((missionField as HTMLTextAreaElement).value).toBe("Updated mission");

    // Video URL field is editable (input)
    const videoField = screen.getByLabelText(/video/i);
    fireEvent.change(videoField, {
      target: { value: "https://new-video.example.com" },
    });
    expect((videoField as HTMLInputElement).value).toBe(
      "https://new-video.example.com",
    );
  });

  it("calls window.confirm before save", async () => {
    await renderWithSettings();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/save/i));
  });

  it("does NOT send PUT when confirm is cancelled", async () => {
    await renderWithSettings();

    // Clear fetch calls from load so we can assert only on save
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockClear();

    vi.spyOn(window, "confirm").mockReturnValue(false);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // No PUT request should have been made after cancel
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("sends PUT with LP-01 base fields on confirmed save", async () => {
    await renderWithSettings();

    // Set up fetch mock for the PUT response
    const updatedSettings = { ...SAMPLE_SETTINGS, mission: "Saved mission" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updatedSettings),
    } as unknown as Response);

    vi.spyOn(window, "confirm").mockReturnValue(true);

    // Edit the mission field
    fireEvent.change(screen.getByLabelText(/mission/i), {
      target: { value: "Saved mission" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      // PUT should have been called with the LP-01 base fields
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/landing/admin",
        expect.objectContaining({
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    // Verify the body contains only LP-01 base fields with correct values
    const putCall = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "PUT",
    );
    const body = JSON.parse(
      (putCall![1] as RequestInit).body as string,
    ) as Record<string, string | null>;
    expect(body.mission).toBe("Saved mission");
    expect(body.vision).toBe(SAMPLE_SETTINGS.vision);
    expect(body.description).toBe(SAMPLE_SETTINGS.description);
    expect(body.featuredVideoUrl).toBe(SAMPLE_SETTINGS.featuredVideoUrl);
    expect(body.contactEmail).toBe(SAMPLE_SETTINGS.contactEmail);
    expect(body.contactPhone).toBe(SAMPLE_SETTINGS.contactPhone);
  });

  it("stages a LANDING_HERO upload and saves its ID with hero copy", async () => {
    await renderWithSettings();

    const uploadedAsset = {
      id: "new-hero",
      url: "/files/new-hero",
      thumbnailUrl: null,
      mimeType: "image/png",
      fileSize: 1024,
      originalFilename: "hero.png",
      category: "LANDING_HERO",
      createdAt: "2026-07-19T00:00:00.000Z",
    };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(uploadedAsset),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...SAMPLE_SETTINGS, ...uploadedAsset }),
      });

    fireEvent.change(screen.getByLabelText(/hero title/i), {
      target: { value: "Updated hero" },
    });
    fireEvent.change(screen.getByTestId("file-upload-input"), {
      target: {
        files: [new File(["image"], "hero.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/files/LANDING_HERO",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(screen.getByTestId("landing-hero-asset-link").textContent).toBe(
      "new-hero",
    );

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const putCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PUT",
      );
      const body = JSON.parse(
        (putCall![1] as RequestInit).body as string,
      ) as Record<string, string>;
      expect(body.heroTitle).toBe("Updated hero");
      expect(body.heroImageId).toBe("new-hero");
    });
  });

  it("omits an absent hero image ID while retaining hero copy on save failure", async () => {
    const settingsWithoutHeroImage = { ...SAMPLE_SETTINGS, heroImageId: null };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(settingsWithoutHeroImage),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    render(<LandingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/hero subtitle/i), {
      target: { value: "Retry this subtitle" },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-save-error")).toBeTruthy();
    });
    const putCall = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "PUT",
    );
    const body = JSON.parse(
      (putCall![1] as RequestInit).body as string,
    ) as Record<string, string>;
    expect(body).not.toHaveProperty("heroImageId");
    expect(body.heroSubtitle).toBe("Retry this subtitle");
    expect(
      (screen.getByLabelText(/hero subtitle/i) as HTMLInputElement).value,
    ).toBe("Retry this subtitle");
  });

  it("keeps the current hero visible when its replacement upload fails", async () => {
    await renderWithSettings();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Upload failed"));

    fireEvent.change(screen.getByTestId("file-upload-input"), {
      target: {
        files: [new File(["image"], "hero.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("file-upload-error").textContent).toBe(
        "Upload failed",
      );
    });
    expect(screen.getByTestId("landing-hero-asset-link").textContent).toBe(
      "existing-hero",
    );
  });

  it("shows success message after save", async () => {
    await renderWithSettings();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_SETTINGS),
    } as unknown as Response);

    vi.spyOn(window, "confirm").mockReturnValue(true);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-save-success")).toBeTruthy();
    });

    expect(screen.getByText(/settings saved|saved successfully/i)).toBeTruthy();
  });

  it("shows error message on save failure", async () => {
    await renderWithSettings();

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    vi.spyOn(window, "confirm").mockReturnValue(true);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-save-error")).toBeTruthy();
    });

    expect(screen.getByText(/failed to save/i)).toBeTruthy();
  });

  it("disables save button while submitting", async () => {
    await renderWithSettings();

    // PUT never resolves — save stays "submitting"
    globalThis.fetch = vi
      .fn()
      .mockImplementation(
        () => new Promise<Response>(() => {}),
      ) as unknown as typeof globalThis.fetch;

    vi.spyOn(window, "confirm").mockReturnValue(true);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// TRIANGULATE — form disabled during initial load
// ---------------------------------------------------------------------------

describe("LandingSettingsPage triangulation", () => {
  it("does not render editable form while loading", async () => {
    // Hung fetch keeps loading
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {}));

    render(<LandingSettingsPage />);

    expect(screen.getByTestId("landing-settings-loading")).toBeTruthy();
    expect(screen.queryByTestId("landing-settings-form")).toBeNull();
  });

  it("form fields are not disabled after successful load", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_SETTINGS),
    });

    render(<LandingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    // After load, fields should be editable (not disabled)
    expect(
      (screen.getByLabelText(/mission/i) as HTMLTextAreaElement).disabled,
    ).toBe(false);
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).disabled).toBe(
      false,
    );
  });
});

describe("LandingSettingsPage featured selection", () => {
  it("selects a published candidate through outings endpoints and clears it", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ ...SAMPLE_SETTINGS, featuredOutingId: "o1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: "o2", title: "Published Outing", status: "PUBLISHED" },
          ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ featuredOutingId: "o2" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ ...SAMPLE_SETTINGS, featuredOutingId: "o2" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: "o2", title: "Published Outing", status: "PUBLISHED" },
          ]),
      });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<LandingSettingsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("featured-outing-select")).toBeTruthy(),
    );
    fireEvent.change(screen.getByTestId("featured-outing-select"), {
      target: { value: "o2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /feature outing/i }));
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/outings/admin/o2/feature",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("shows a featured-outing error when mutation or authoritative refresh fails", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/landing/admin") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ ...SAMPLE_SETTINGS, featuredOutingId: null }),
          });
        }
        if (url === "/outings/admin?status=PUBLISHED") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { id: "o2", title: "Published Outing", status: "PUBLISHED" },
              ]),
          });
        }
        if (url === "/outings/admin/o2/feature" && init?.method === "POST") {
          return Promise.reject(new Error("Network error"));
        }
        throw new Error(`Unexpected request: ${url}`);
      });

    render(<LandingSettingsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("featured-outing-select")).toBeTruthy(),
    );
    fireEvent.change(screen.getByTestId("featured-outing-select"), {
      target: { value: "o2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /feature outing/i }));

    await waitFor(() => {
      expect(screen.getByTestId("featured-outing-error").textContent).toMatch(
        /failed to update/i,
      );
    });
  });

  it("clears through the outings endpoint and refreshes authoritative state", async () => {
    let featuredOutingId: string | null = "o2";
    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/landing/admin")
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ ...SAMPLE_SETTINGS, featuredOutingId }),
          });
        if (url === "/outings/admin?status=PUBLISHED")
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { id: "o2", title: "Published Outing", status: "PUBLISHED" },
              ]),
          });
        if (url === "/outings/admin/feature" && init?.method === "DELETE") {
          featuredOutingId = null;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ featuredOutingId }),
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      });

    render(<LandingSettingsPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /clear featured outing/i }),
      ).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /clear featured outing/i }),
    );
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/outings/admin/feature",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /clear featured outing/i }),
      ).toBeNull(),
    );
  });
});
