import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MissionsPage } from "./MissionsPage.js";
import { listActiveMissions, listArchivedMissions } from "./missionsApi.js";
import type { MissionAdmin } from "./adminTypes.js";
vi.mock("./missionsApi.js", () => ({
  listActiveMissions: vi.fn(),
  listArchivedMissions: vi.fn(),
}));
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
afterEach(() => cleanup());
describe("MissionsPage", () => {
  it("loads both lists in parallel and keeps separate sections without delete", async () => {
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
    expect(
      screen.getByText("Todavía no hay misiones anteriores."),
    ).toBeTruthy();
  });
});
