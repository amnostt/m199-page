import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PublicationsPage } from "./PublicationsPage.js";

const api = vi.hoisted(() => ({
  list: vi.fn(),
  missions: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  status: vi.fn(),
  scope: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("./publicationsApi.js", () => ({
  listPublications: api.list,
  createPublication: api.create,
  updatePublication: api.update,
  updatePublicationStatus: api.status,
  updatePublicationScope: api.scope,
  deletePublication: api.remove,
}));
vi.mock("./missionsApi.js", () => ({ listActiveMissions: api.missions }));

const publication = (overrides = {}) => ({
  id: "p1",
  slug: "salida",
  title: "Salida",
  excerpt: "",
  content: "",
  featuredImageId: null,
  type: "POST",
  status: "DRAFT",
  scope: "GENERAL",
  publishedAt: null,
  startDate: null,
  endDate: null,
  activityStatus: null,
  documentationStatus: null,
  missionIds: [],
  createdAt: "",
  updatedAt: "",
  ...overrides,
});

describe("PublicationsPage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue([]);
    api.missions.mockResolvedValue([]);
    api.create.mockResolvedValue(undefined);
    api.update.mockResolvedValue(undefined);
    api.status.mockResolvedValue(undefined);
    api.scope.mockResolvedValue(undefined);
    api.remove.mockResolvedValue(undefined);
  });
  it("loads the list and exposes the empty state", async () => {
    render(<PublicationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("publications-empty")).toBeTruthy(),
    );
    expect(api.list).toHaveBeenCalled();
  });

  it("localizes the initial loading error", async () => {
    api.list.mockRejectedValueOnce(new Error("Network error"));
    render(<PublicationsPage />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Error de red.",
    );
  });

  it("refreshes after editing a publication", async () => {
    const item = publication();
    api.list.mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
    render(<PublicationsPage />);
    await screen.findByTestId("publication-p1");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Actualizada" },
    });
    fireEvent.submit(screen.getByTestId("publication-form"));
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    expect(api.update).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ title: "Actualizada" }),
    );
  });

  it("creates and refreshes from the new-publication action", async () => {
    api.list
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([publication({ title: "Nueva" })]);
    render(<PublicationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("publications-empty")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Nueva publicación" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Nueva" },
    });
    fireEvent.submit(screen.getByTestId("publication-form"));
    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Nueva" }),
      ),
    );
    await waitFor(() => expect(screen.getByText("Nueva")).toBeTruthy());
  });

  it.each([
    ["Publicar", "PUBLISHED"],
    ["Despublicar", "DRAFT"],
  ] as const)(
    "uses the dedicated status client and refreshes when clicking %s",
    async (label, status) => {
      const item = publication({
        status: status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
      });
      api.list.mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
      render(<PublicationsPage />);
      await screen.findByTestId("publication-p1");
      fireEvent.click(screen.getByRole("button", { name: label }));
      fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
      expect(api.status).toHaveBeenCalledWith("p1", status);
      expect(api.update).not.toHaveBeenCalled();
    },
  );

  it("cancels deletion, then confirms deletion and refreshes", async () => {
    api.list.mockResolvedValueOnce([publication()]).mockResolvedValueOnce([]);
    render(<PublicationsPage />);
    await screen.findByTestId("publication-p1");
    fireEvent.click(
      screen.getByTestId("publication-p1").querySelector("button:last-child")!,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(api.remove).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByTestId("publication-p1").querySelector("button:last-child")!,
    );
    fireEvent.click(
      screen.getByRole("dialog").querySelector("button:last-child")!,
    );
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("p1"));
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  });
});
