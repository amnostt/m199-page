import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { MissionsPage } from "./MissionsPage.js";
import {
  createMission,
  listActiveMissions,
  listArchivedMissions,
  updateMission,
  updateMissionStatus,
} from "./missionsApi.js";
import { adminFetch } from "./session.js";
import type { MissionAdmin } from "./adminTypes.js";
vi.mock("./missionsApi.js", () => ({
  listActiveMissions: vi.fn(),
  listArchivedMissions: vi.fn(),
  createMission: vi.fn(),
  updateMission: vi.fn(),
  updateMissionStatus: vi.fn(),
}));
vi.mock("./session.js", () => ({ adminFetch: vi.fn() }));
const mission = (
  id: string,
  status: MissionAdmin["status"],
  profileImageId: string | null = null,
): MissionAdmin => ({
  id,
  slug: `mission-${id}`,
  title: `Mission ${id}`,
  heroImageId: `file-${id}`,
  profileImageId,
  heroPhrase: `Phrase ${id}`,
  status,
  createdAt: "2026-08-11",
  updatedAt: "2026-08-11",
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
describe("MissionsPage", () => {
  it("loads both lists and filters them with status tabs without delete", async () => {
    vi.mocked(listActiveMissions).mockResolvedValue([
      mission("active", "ACTIVE"),
    ]);
    vi.mocked(listArchivedMissions).mockResolvedValue([
      mission("old", "ARCHIVED"),
    ]);
    render(<MissionsPage />);
    expect(screen.getByText("Cargando misiones…")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId("active-missions")).toBeTruthy(),
    );
    expect(screen.getByTestId("active-missions").textContent).toContain(
      "Mission active",
    );
    expect(screen.getByTestId("active-missions").textContent).not.toContain(
      "Mission old",
    );
    fireEvent.click(screen.getByRole("tab", { name: /Archivadas/ }));
    expect(await screen.findByTestId("archived-missions")).toBeTruthy();
    expect(screen.getByTestId("archived-missions").textContent).toContain(
      "Mission old",
    );
    expect(
      screen.queryByRole("button", { name: /eliminar|borrar|delete/i }),
    ).toBeNull();
  });
  it("renders recoverable error and empty states", async () => {
    vi.mocked(listActiveMissions).mockRejectedValueOnce(new Error("failed"));
    vi.mocked(listArchivedMissions).mockResolvedValueOnce([]);
    render(<MissionsPage />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    vi.mocked(listActiveMissions).mockResolvedValueOnce([]);
    vi.mocked(listArchivedMissions).mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() =>
      expect(screen.getByText("Todavía no hay misiones activas.")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("tab", { name: /Archivadas/ }));
    expect(
      screen.getByText("Todavía no hay misiones archivadas."),
    ).toBeTruthy();
  });

  it("creates only after required fields and uploaded hero are present", async () => {
    vi.mocked(listActiveMissions).mockResolvedValue([]);
    vi.mocked(listArchivedMissions).mockResolvedValue([]);
    vi.mocked(createMission).mockResolvedValue(mission("new", "ACTIVE"));
    render(<MissionsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("active-missions")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Nueva misión" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Crear misión" }));
    expect(
      screen.getByText("Completa el título, el slug, la imagen y la frase."),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: " Nueva " },
    });
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "mision-centro-2026" },
    });
    fireEvent.change(screen.getByLabelText("Frase"), {
      target: { value: " Phrase " },
    });
    vi.mocked(adminFetch)
      .mockResolvedValueOnce({ id: "hero-1" })
      .mockResolvedValueOnce({ id: "profile-1" });
    fireEvent.change(
      within(screen.getByTestId("mission-hero-upload")).getByTestId(
        "file-upload-input",
      ),
      {
        target: {
          files: [new File(["hero"], "hero.png", { type: "image/png" })],
        },
      },
    );
    await waitFor(() =>
      expect(adminFetch).toHaveBeenCalledWith(
        "/files/MISSION_HERO",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const heroPreview = within(
      screen.getByTestId("mission-hero-upload"),
    ).getByTestId("file-upload-preview");
    expect(heroPreview).toBeTruthy();
    expect(
      within(screen.getByTestId("mission-hero-upload"))
        .getByAltText("Imagen hero de Nueva")
        .getAttribute("src"),
    ).toBe("/files/hero-1");
    fireEvent.change(
      within(screen.getByTestId("mission-profile-upload")).getByTestId(
        "file-upload-input",
      ),
      {
        target: {
          files: [new File(["profile"], "profile.png", { type: "image/png" })],
        },
      },
    );
    await waitFor(() =>
      expect(adminFetch).toHaveBeenCalledWith(
        "/files/OTHER",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(
      within(screen.getByTestId("mission-profile-upload")).getByTestId(
        "file-upload-preview",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Crear misión" }));
    await waitFor(() =>
      expect(createMission).toHaveBeenCalledWith({
        title: "Nueva",
        slug: "mision-centro-2026",
        heroImageId: "hero-1",
        profileImageId: "profile-1",
        heroPhrase: "Phrase",
      }),
    );
  });

  it.each([
    "",
    "Mision-centro",
    "mision centro",
    "Misión-centro",
    "mision_centro",
    "mision!",
    "-mision",
    "mision-",
    "mision--centro",
  ])("rejects malformed slug %j before submission", async (slug) => {
    vi.mocked(listActiveMissions).mockResolvedValue([]);
    vi.mocked(listArchivedMissions).mockResolvedValue([]);
    render(<MissionsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("active-missions")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Nueva misión" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Nueva" },
    });
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: slug },
    });
    fireEvent.change(screen.getByLabelText("Frase"), {
      target: { value: "Phrase" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear misión" }));
    expect(createMission).not.toHaveBeenCalled();
    if (slug) expect(screen.getByText(/El slug no es válido/)).toBeTruthy();
    else expect(screen.getByText("El slug es obligatorio.")).toBeTruthy();
    expect(screen.getByLabelText("Slug").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByLabelText("Slug").getAttribute("aria-describedby")).toBe(
      "mission-slug-description mission-slug-error",
    );
  });

  it("suggests normalized slugs for consecutive create titles", async () => {
    vi.mocked(listActiveMissions).mockResolvedValue([]);
    vi.mocked(listArchivedMissions).mockResolvedValue([]);
    render(<MissionsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("active-missions")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Nueva misión" }));
    const title = screen.getByLabelText("Título");
    const slug = screen.getByLabelText("Slug");

    fireEvent.change(title, { target: { value: "Misión Centro 2026" } });
    expect(slug.getAttribute("value")).toBe("mision-centro-2026");
    fireEvent.change(title, {
      target: { value: "  ¡Misión,   Centro — 2026!  " },
    });
    expect(slug.getAttribute("value")).toBe("mision-centro-2026");
    fireEvent.change(title, { target: { value: "Segundo   título" } });
    expect(slug.getAttribute("value")).toBe("segundo-titulo");
  });

  it("stops create suggestions after overriding or clearing the slug", async () => {
    vi.mocked(listActiveMissions).mockResolvedValue([]);
    vi.mocked(listArchivedMissions).mockResolvedValue([]);
    render(<MissionsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("active-missions")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Nueva misión" }));
    const title = screen.getByLabelText("Título");
    const slug = screen.getByLabelText("Slug");

    fireEvent.change(title, { target: { value: "Misión Centro 2026" } });
    fireEvent.input(slug, { target: { value: "mision-centro-2026" } });
    fireEvent.change(title, { target: { value: "Nuevo título" } });
    expect(slug.getAttribute("value")).toBe("mision-centro-2026");
    fireEvent.change(slug, { target: { value: "" } });
    fireEvent.change(title, { target: { value: "Otro título" } });
    expect(slug.getAttribute("value")).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Crear misión" }));
    expect(screen.getByText("El slug es obligatorio.")).toBeTruthy();
    expect(createMission).not.toHaveBeenCalled();
  });

  it("re-enables suggestions after closing and reopening a create flow", async () => {
    vi.mocked(listActiveMissions).mockResolvedValue([]);
    vi.mocked(listArchivedMissions).mockResolvedValue([]);
    render(<MissionsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("active-missions")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Nueva misión" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Primer título" },
    });
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "manual" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Nueva misión" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Misión Centro 2026" },
    });
    expect(screen.getByLabelText("Slug").getAttribute("value")).toBe(
      "mision-centro-2026",
    );
  });

  it("prefills, previews, and removes an optional profile image", async () => {
    vi.mocked(listActiveMissions).mockResolvedValue([
      mission("active", "ACTIVE", "profile-old"),
    ]);
    vi.mocked(listArchivedMissions).mockResolvedValue([]);
    vi.mocked(updateMission).mockResolvedValue(mission("active", "ACTIVE"));
    render(<MissionsPage />);
    await waitFor(() =>
      expect(screen.getByText("Mission active")).toBeTruthy(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Acciones para Mission active" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));

    const profileUpload = screen.getByTestId("mission-profile-upload");
    const heroUpload = screen.getByTestId("mission-hero-upload");
    expect(
      within(heroUpload)
        .getByAltText("Imagen hero de Mission active")
        .getAttribute("src"),
    ).toBe("/files/file-active");
    expect(
      within(profileUpload).getByTestId("file-upload-preview"),
    ).toBeTruthy();
    fireEvent.click(
      within(profileUpload).getByRole("button", { name: "Quitar imagen" }),
    );
    expect(
      within(profileUpload).queryByTestId("file-upload-preview"),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateMission).toHaveBeenCalledWith(
        "active",
        expect.objectContaining({ profileImageId: null }),
      ),
    );
  });

  it("prefills edit and confirms status transitions", async () => {
    vi.mocked(listActiveMissions).mockResolvedValue([
      mission("active", "ACTIVE"),
    ]);
    vi.mocked(listArchivedMissions).mockResolvedValue([]);
    vi.mocked(updateMission).mockResolvedValue(mission("active", "ACTIVE"));
    vi.mocked(updateMissionStatus).mockResolvedValue(
      mission("active", "ARCHIVED"),
    );
    render(<MissionsPage />);
    await waitFor(() =>
      expect(screen.getByText("Mission active")).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Acciones para Mission active" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));
    expect(screen.getByDisplayValue("Mission active")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Acciones para Mission active" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Archivar" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Archivar" }));
    await waitFor(() =>
      expect(updateMissionStatus).toHaveBeenCalledWith("active", "ARCHIVED"),
    );
  });

  it("saves edited values and resets the form", async () => {
    vi.mocked(listActiveMissions).mockResolvedValue([
      mission("active", "ACTIVE"),
    ]);
    vi.mocked(listArchivedMissions).mockResolvedValue([]);
    vi.mocked(updateMission).mockResolvedValue(mission("active", "ACTIVE"));
    render(<MissionsPage />);
    await waitFor(() =>
      expect(screen.getByText("Mission active")).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Acciones para Mission active" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(updateMission).toHaveBeenCalledWith(
        "active",
        expect.objectContaining({ title: "Updated" }),
      ),
    );
    expect(screen.getByRole("button", { name: "Nueva misión" })).toBeTruthy();
  });

  it("preserves the stored edit slug and allows a direct slug change", async () => {
    vi.mocked(listActiveMissions).mockResolvedValue([
      mission("active", "ACTIVE"),
    ]);
    vi.mocked(listArchivedMissions).mockResolvedValue([]);
    vi.mocked(updateMission).mockResolvedValue(mission("active", "ACTIVE"));
    render(<MissionsPage />);
    await waitFor(() =>
      expect(screen.getByText("Mission active")).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Acciones para Mission active" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Título actualizado" },
    });
    expect(screen.getByLabelText("Slug").getAttribute("value")).toBe(
      "mission-active",
    );
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "slug-directo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(updateMission).toHaveBeenCalledWith(
        "active",
        expect.objectContaining({
          title: "Título actualizado",
          slug: "slug-directo",
        }),
      ),
    );
  });

  it("rejects confirmation and reactivates an archived mission", async () => {
    vi.mocked(listActiveMissions).mockResolvedValue([]);
    vi.mocked(listArchivedMissions).mockResolvedValue([
      mission("old", "ARCHIVED"),
    ]);
    vi.mocked(updateMissionStatus).mockResolvedValue(mission("old", "ACTIVE"));
    render(<MissionsPage />);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /Archivadas/ })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("tab", { name: /Archivadas/ }));
    await waitFor(() => expect(screen.getByText("Mission old")).toBeTruthy());
    fireEvent.click(
      screen.getByRole("button", { name: "Acciones para Mission old" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Reactivar" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(updateMissionStatus).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    fireEvent.click(
      screen.getByRole("button", { name: "Acciones para Mission old" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Reactivar" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reactivar" }));
    await waitFor(() =>
      expect(updateMissionStatus).toHaveBeenCalledWith("old", "ACTIVE"),
    );
  });

  it("refetches lists after archiving so the mission moves sections", async () => {
    vi.mocked(listActiveMissions)
      .mockResolvedValueOnce([mission("m", "ACTIVE")])
      .mockResolvedValueOnce([]);
    vi.mocked(listArchivedMissions)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mission("m", "ARCHIVED")]);
    vi.mocked(updateMissionStatus).mockResolvedValue(mission("m", "ARCHIVED"));
    render(<MissionsPage />);
    await waitFor(() => expect(screen.getByText("Mission m")).toBeTruthy());
    fireEvent.click(
      screen.getByRole("button", { name: "Acciones para Mission m" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Archivar" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Archivar" }));
    fireEvent.click(screen.getByRole("tab", { name: /Archivadas/ }));
    await waitFor(() =>
      expect(screen.getByTestId("archived-missions").textContent).toContain(
        "Mission m",
      ),
    );
  });
});
