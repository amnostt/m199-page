import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
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
const mission = (id: string, status: MissionAdmin["status"]): MissionAdmin => ({
  id,
  slug: `mission-${id}`,
  title: `Mission ${id}`,
  heroImageId: `file-${id}`,
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
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: " Nueva " },
    });
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: " nueva " },
    });
    fireEvent.change(screen.getByLabelText("Frase"), {
      target: { value: " Phrase " },
    });
    vi.mocked(adminFetch).mockResolvedValue({ id: "hero-1" });
    fireEvent.change(screen.getByTestId("file-upload-input"), {
      target: {
        files: [new File(["hero"], "hero.png", { type: "image/png" })],
      },
    });
    await waitFor(() =>
      expect(adminFetch).toHaveBeenCalledWith(
        "/files/MISSION_HERO",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Crear misión" }));
    await waitFor(() =>
      expect(createMission).toHaveBeenCalledWith({
        title: "Nueva",
        slug: "nueva",
        heroImageId: "hero-1",
        heroPhrase: "Phrase",
      }),
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
