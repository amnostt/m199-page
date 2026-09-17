// ---------------------------------------------------------------------------
// LandingSettingsPage component tests (Task 4.3)
//
// Tests Landing Settings editor behaviour:
// - GET /landing/admin on mount via adminFetch
// - Null response normalizes to empty form values
// - Load error shows error banner
// - Editable fields for the active landing controls
// - shadcn AlertDialog gate before every PUT save
// - Confirm cancelled → no PUT sent
// - Save success → success message shown
// - Save error → error message shown
// - Loading state prevents form interaction during fetch
// - Form disabled during save submission
//
// WU3 / Slice 1 — the legacy featuredOutingId / featured-outing
// selection block was removed. The test group "featured selection"
// was deleted in lockstep; surviving tests cover the LP-01 base
// fields only.
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
import { toast } from "sonner";
import { LandingSettingsPage } from "./LandingSettingsPage.js";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_SETTINGS = {
  heroTitle: "Welcome to M199",
  heroSubtitle: "Serving the community",
  heroImageId: "existing-hero",
  missionsTitle: "Mission projects",
  missionsDescription: "Mission description",
  publicationsTitle: "Publication stories",
  publicationsDescription: "Publication description",
  aboutTitle: "About us",
  mission: "Our mission text",
  vision: "Our vision text",
  description: "Our description text",
  featuredVideoUrl: "https://video.example.com/embed",
  contactTitle: "Contact us",
  contactDescription: "Contact description",
  contactEmail: "contact@example.com",
  contactPhone: "+54 11 1234-5678",
  verseText: "Todo lo puedo en Cristo que me fortalece",
  verseReference: "Filipenses 4:13",
  visualBreakImageId: "existing-break",
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
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
    expect(screen.getByText(/cargando/i)).toBeTruthy();
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

    // Active fields are populated; historical fields are not editable.
    expect(
      (screen.getByLabelText("Título principal") as HTMLInputElement).value,
    ).toBe(SAMPLE_SETTINGS.heroTitle);
    expect(
      (screen.getByLabelText("Subtítulo principal") as HTMLTextAreaElement)
        .value,
    ).toBe(SAMPLE_SETTINGS.heroSubtitle);
    expect(
      screen.getByAltText("Imagen hero de Welcome to M199").getAttribute("src"),
    ).toBe(`/files/${SAMPLE_SETTINGS.heroImageId}`);
    expect(
      within(screen.getByTestId("landing-hero-upload-widget")).getByTestId(
        "file-upload-remove",
      ),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Título de Misiones") as HTMLInputElement).value,
    ).toBe(SAMPLE_SETTINGS.missionsTitle);
    expect(
      (
        screen.getByLabelText("Descripción de Publicaciones", {
          selector: "textarea",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe(SAMPLE_SETTINGS.publicationsDescription);
    expect(
      within(
        screen.getByTestId("landing-visual-break-upload-widget"),
      ).getByTestId("file-upload-remove"),
    ).toBeTruthy();
    expect(screen.queryByLabelText(/^misión$/i)).toBeNull();
    expect(screen.queryByLabelText(/^visión$/i)).toBeNull();
    expect(
      (
        screen.getByLabelText("Descripción", {
          selector: "textarea",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe(SAMPLE_SETTINGS.description);
    expect(
      (screen.getByLabelText(/video destacado/i) as HTMLInputElement).value,
    ).toBe(SAMPLE_SETTINGS.featuredVideoUrl);
    expect(
      (screen.getByLabelText(/correo electrónico/i) as HTMLInputElement).value,
    ).toBe(SAMPLE_SETTINGS.contactEmail);
    expect((screen.getByLabelText(/teléfono/i) as HTMLInputElement).value).toBe(
      SAMPLE_SETTINGS.contactPhone,
    );
    expect(
      (
        screen.getByLabelText("Texto", {
          selector: "textarea",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe(SAMPLE_SETTINGS.verseText);
    expect(
      (screen.getByLabelText("Referencia") as HTMLInputElement).value,
    ).toBe(SAMPLE_SETTINGS.verseReference);
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
      (
        screen.getByLabelText("Descripción", {
          selector: "textarea",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("");
    expect(
      (screen.getByLabelText(/video destacado/i) as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText(/correo electrónico/i) as HTMLInputElement).value,
    ).toBe("");
    expect((screen.getByLabelText(/teléfono/i) as HTMLInputElement).value).toBe(
      "",
    );
    expect(
      (
        screen.getByLabelText("Texto", {
          selector: "textarea",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("");
  });

  it("shows error banner on GET failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<LandingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-load-error")).toBeTruthy();
    });

    expect(screen.getByText(/no se pudo cargar/i)).toBeTruthy();
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

  it("ignores historical fields and normalizes active null fields", async () => {
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

    expect(screen.queryByLabelText(/^misión$/i)).toBeNull();
    expect(screen.queryByLabelText(/^visión$/i)).toBeNull();
    expect(
      (
        screen.getByLabelText("Descripción", {
          selector: "textarea",
        }) as HTMLTextAreaElement
      ).value,
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

  async function confirmSave() {
    const saveButton = screen.getByRole("button", {
      name: "Guardar configuración",
    }) as HTMLButtonElement;
    if (saveButton.disabled) {
      fireEvent.change(screen.getByLabelText("Título principal"), {
        target: { value: `${SAMPLE_SETTINGS.heroTitle} editado` },
      });
    }
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar configuración" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "Guardar configuración",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );
  }

  it("allows editing each field", async () => {
    await renderWithSettings();

    const descriptionField = screen.getByLabelText("Descripción", {
      selector: "textarea",
    });
    fireEvent.change(descriptionField, {
      target: { value: "Updated description" },
    });
    expect((descriptionField as HTMLTextAreaElement).value).toBe(
      "Updated description",
    );

    // Video URL field is editable (input)
    const videoField = screen.getByLabelText(/video destacado/i);
    fireEvent.change(videoField, {
      target: { value: "https://new-video.example.com" },
    });
    expect((videoField as HTMLInputElement).value).toBe(
      "https://new-video.example.com",
    );

    const verseText = screen.getByLabelText("Texto", {
      selector: "textarea",
    });
    fireEvent.change(verseText, { target: { value: "Nuevo texto" } });
    expect((verseText as HTMLTextAreaElement).value).toBe("Nuevo texto");
  });

  it("opens the shadcn confirmation before save", async () => {
    await renderWithSettings();

    fireEvent.change(screen.getByLabelText("Título principal"), {
      target: { value: "Título modificado" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Guardar configuración" }),
    );

    expect(
      await screen.findByRole("alertdialog", { name: "Guardar configuración" }),
    ).toBeTruthy();
  });

  it("does NOT send PUT when confirm is cancelled", async () => {
    await renderWithSettings();

    // Clear fetch calls from load so we can assert only on save
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.change(screen.getByLabelText("Título principal"), {
      target: { value: "Título modificado" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Guardar configuración" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    // No PUT request should have been made after cancel
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("shows a sticky dirty-state toolbar and restores saved values on discard", async () => {
    await renderWithSettings();
    const toolbar = screen.getByTestId("landing-settings-toolbar");
    const save = screen.getByRole("button", { name: "Guardar configuración" });

    expect(toolbar.className).toContain("sticky");
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId("landing-settings-dirty")).toBeNull();

    fireEvent.change(screen.getByLabelText("Título principal"), {
      target: { value: "Título modificado" },
    });
    expect(screen.getByTestId("landing-settings-dirty").textContent).toContain(
      "cambios sin guardar",
    );
    expect((save as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));

    await waitFor(() => {
      expect(
        (screen.getByLabelText("Título principal") as HTMLInputElement).value,
      ).toBe(SAMPLE_SETTINGS.heroTitle);
    });
    expect(screen.queryByTestId("landing-settings-dirty")).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("sends only active fields on confirmed save", async () => {
    await renderWithSettings();

    // Set up fetch mock for the PUT response
    const updatedSettings = {
      ...SAMPLE_SETTINGS,
      description: "Saved description",
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updatedSettings),
    } as unknown as Response);

    fireEvent.change(
      screen.getByLabelText("Descripción", { selector: "textarea" }),
      {
        target: { value: "Saved description" },
      },
    );

    await confirmSave();

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
    expect(body).not.toHaveProperty("mission");
    expect(body).not.toHaveProperty("vision");
    expect(body.description).toBe("Saved description");
    expect(body.heroImageId).toBe(SAMPLE_SETTINGS.heroImageId);
    expect(body.missionsTitle).toBe(SAMPLE_SETTINGS.missionsTitle);
    expect(body.missionsDescription).toBe(SAMPLE_SETTINGS.missionsDescription);
    expect(body.publicationsTitle).toBe(SAMPLE_SETTINGS.publicationsTitle);
    expect(body.publicationsDescription).toBe(
      SAMPLE_SETTINGS.publicationsDescription,
    );
    expect(body.aboutTitle).toBe(SAMPLE_SETTINGS.aboutTitle);
    expect(body.featuredVideoUrl).toBe(SAMPLE_SETTINGS.featuredVideoUrl);
    expect(body.contactTitle).toBe(SAMPLE_SETTINGS.contactTitle);
    expect(body.contactDescription).toBe(SAMPLE_SETTINGS.contactDescription);
    expect(body.contactEmail).toBe(SAMPLE_SETTINGS.contactEmail);
    expect(body.contactPhone).toBe(SAMPLE_SETTINGS.contactPhone);
    expect(body.verseText).toBe(SAMPLE_SETTINGS.verseText);
    expect(body.verseReference).toBe(SAMPLE_SETTINGS.verseReference);
    expect(body.visualBreakImageId).toBe(SAMPLE_SETTINGS.visualBreakImageId);
  });

  it("sends an empty featured video URL as null", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ ...SAMPLE_SETTINGS, featuredVideoUrl: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(SAMPLE_SETTINGS),
      });
    render(<LandingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    await confirmSave();

    await waitFor(() => {
      const putCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PUT",
      );
      const body = JSON.parse(
        (putCall![1] as RequestInit).body as string,
      ) as Record<string, unknown>;
      expect(body.featuredVideoUrl).toBeNull();
    });
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

    fireEvent.change(screen.getByLabelText("Título principal"), {
      target: { value: "Updated hero" },
    });
    fireEvent.change(
      within(screen.getByTestId("landing-hero-upload-widget")).getByTestId(
        "file-upload-input",
      ),
      {
        target: {
          files: [new File(["image"], "hero.png", { type: "image/png" })],
        },
      },
    );

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/files/LANDING_HERO",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(
      screen.getByAltText("Imagen hero de Updated hero").getAttribute("src"),
    ).toBe("/files/new-hero");
    expect(
      within(screen.getByTestId("landing-hero-upload-widget")).getByTestId(
        "file-upload-remove",
      ),
    ).toBeTruthy();

    await confirmSave();

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

  it("sends a null hero image ID while retaining hero copy on save failure", async () => {
    const settingsWithoutHeroImage = { ...SAMPLE_SETTINGS, heroImageId: null };
    // WU3 — LandingSettingsPage no longer issues the /outings/admin
    // lookup that was previously chained to the load, so the mock is
    // reduced to GET /landing/admin (success) + PUT /landing/admin
    // (rejected with Network error).
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(settingsWithoutHeroImage),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    render(<LandingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Subtítulo principal"), {
      target: { value: "Retry this subtitle" },
    });
    await confirmSave();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "No se pudo guardar la configuración.",
        expect.objectContaining({ description: "Error de red." }),
      );
    });
    const putCall = (
      globalThis.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "PUT",
    );
    const body = JSON.parse(
      (putCall![1] as RequestInit).body as string,
    ) as Record<string, string>;
    expect(body.heroImageId).toBeNull();
    expect(body.heroSubtitle).toBe("Retry this subtitle");
    expect(
      (screen.getByLabelText("Subtítulo principal") as HTMLInputElement).value,
    ).toBe("Retry this subtitle");
  });

  it("stages a LANDING_VISUAL_BREAK upload and saves its ID", async () => {
    await renderWithSettings();

    const uploadedAsset = {
      id: "new-break",
      url: "/files/new-break",
      thumbnailUrl: null,
      mimeType: "image/png",
      fileSize: 1024,
      originalFilename: "break.png",
      category: "LANDING_VISUAL_BREAK",
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
        json: () =>
          Promise.resolve({
            ...SAMPLE_SETTINGS,
            visualBreakImageId: "new-break",
          }),
      });

    const widget = screen.getByTestId("landing-visual-break-upload-widget");
    fireEvent.change(within(widget).getByTestId("file-upload-input"), {
      target: {
        files: [new File(["image"], "break.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/files/LANDING_VISUAL_BREAK",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(
      within(widget)
        .getByAltText("Imagen de descanso de la página de inicio")
        .getAttribute("src"),
    ).toBe("/files/new-break");

    await confirmSave();

    await waitFor(() => {
      const putCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PUT",
      );
      const body = JSON.parse(
        (putCall![1] as RequestInit).body as string,
      ) as Record<string, unknown>;
      expect(body.visualBreakImageId).toBe("new-break");
    });
  });

  it("explicitly clears both landing images before saving", async () => {
    await renderWithSettings();
    fireEvent.click(
      within(screen.getByTestId("landing-hero-upload-widget")).getByTestId(
        "file-upload-remove",
      ),
    );
    fireEvent.click(
      within(
        screen.getByTestId("landing-visual-break-upload-widget"),
      ).getByTestId("file-upload-remove"),
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ...SAMPLE_SETTINGS,
          heroImageId: null,
          visualBreakImageId: null,
        }),
    });
    await confirmSave();

    await waitFor(() => {
      const putCall = (
        globalThis.fetch as ReturnType<typeof vi.fn>
      ).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PUT",
      );
      const body = JSON.parse(
        (putCall![1] as RequestInit).body as string,
      ) as Record<string, unknown>;
      expect(body.heroImageId).toBeNull();
      expect(body.visualBreakImageId).toBeNull();
    });
  });

  it("keeps the current hero visible when its replacement upload fails", async () => {
    await renderWithSettings();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Upload failed"));

    fireEvent.change(
      within(screen.getByTestId("landing-hero-upload-widget")).getByTestId(
        "file-upload-input",
      ),
      {
        target: {
          files: [new File(["image"], "hero.png", { type: "image/png" })],
        },
      },
    );

    await waitFor(() => {
      expect(screen.getByTestId("file-upload-error").textContent).toBe(
        "No se pudo cargar el archivo.",
      );
    });
    expect(
      screen.getByAltText("Imagen hero de Welcome to M199").getAttribute("src"),
    ).toBe("/files/existing-hero");
  });

  it("shows a success toast after save", async () => {
    await renderWithSettings();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_SETTINGS),
    } as unknown as Response);

    await confirmSave();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Configuración guardada correctamente.",
        { toasterId: "admin" },
      );
    });
    expect(screen.queryByTestId("landing-settings-dirty")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Guardar configuración",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("shows an error toast with retry on save failure", async () => {
    await renderWithSettings();

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await confirmSave();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "No se pudo guardar la configuración.",
        expect.objectContaining({
          toasterId: "admin",
          description: "Error de red.",
          action: expect.objectContaining({ label: "Reintentar" }),
        }),
      );
    });
  });

  it("disables save button while submitting", async () => {
    await renderWithSettings();

    // PUT never resolves — save stays "submitting"
    globalThis.fetch = vi
      .fn()
      .mockImplementation(
        () => new Promise<Response>(() => {}),
      ) as unknown as typeof globalThis.fetch;

    await confirmSave();

    await waitFor(() => {
      const confirmButton = screen.getByRole("button", {
        name: "Procesando…",
      });
      expect((confirmButton as HTMLButtonElement).disabled).toBe(true);
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
      (
        screen.getByLabelText("Descripción", {
          selector: "textarea",
        }) as HTMLTextAreaElement
      ).disabled,
    ).toBe(false);
    expect(
      (screen.getByLabelText(/correo electrónico/i) as HTMLInputElement)
        .disabled,
    ).toBe(false);
  });
});

describe("LandingSettingsPage — legacy featured-outing removal (WU3)", () => {
  it("does not render the legacy featured-outing select or controls", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_SETTINGS),
    });

    render(<LandingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    expect(screen.queryByTestId("featured-outing-select")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /destacar salida/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /quitar salida destacada/i }),
    ).toBeNull();
  });

  it("does not call /outings/admin endpoints on mount or save", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_SETTINGS),
    });
    globalThis.fetch = fetchSpy;

    render(<LandingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    // No /outings/admin calls — the legacy featuredOutingId wiring is gone.
    const outingCalls = fetchSpy.mock.calls.filter(
      ([url]) => typeof url === "string" && url.startsWith("/outings/admin"),
    );
    expect(outingCalls).toHaveLength(0);
  });
});
