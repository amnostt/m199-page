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

const setLists = (published: unknown[], drafts: unknown[]) => {
  api.list.mockImplementation((status: string) =>
    Promise.resolve(status === "PUBLISHED" ? published : drafts),
  );
};

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

  it("loads both status lists and exposes the empty state", async () => {
    render(<PublicationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("published-publications")).toBeTruthy(),
    );
    expect(api.list).toHaveBeenCalledWith("PUBLISHED");
    expect(api.list).toHaveBeenCalledWith("DRAFT");
    expect(
      screen.getByText("Todavía no hay publicaciones publicadas."),
    ).toBeTruthy();
  });

  it("localizes the initial loading error and allows retry", async () => {
    api.list.mockRejectedValueOnce(new Error("Network error"));
    render(<PublicationsPage />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Error de red.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() =>
      expect(screen.getByTestId("published-publications")).toBeTruthy(),
    );
  });

  it("opens the reusable dialog and refreshes after editing a publication", async () => {
    const item = publication();
    setLists([], [item]);
    render(<PublicationsPage />);
    await screen.findByTestId("published-publications");
    fireEvent.click(screen.getByRole("tab", { name: /Borradores/ }));
    await screen.findByTestId("publication-p1");
    fireEvent.click(
      screen.getByRole("button", { name: "Acciones para Salida" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Actualizada" },
    });
    fireEvent.submit(screen.getByTestId("publication-form"));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ title: "Actualizada" }),
      ),
    );
    expect(
      screen.getByRole("button", { name: "Nueva publicación" }),
    ).toBeTruthy();
  });

  it("keeps save failures inside the open publication dialog", async () => {
    const item = publication();
    setLists([], [item]);
    api.update.mockRejectedValueOnce(new Error("Save failed"));
    render(<PublicationsPage />);
    await screen.findByTestId("published-publications");
    fireEvent.click(screen.getByRole("tab", { name: /Borradores/ }));
    await screen.findByTestId("publication-p1");
    fireEvent.click(
      screen.getByRole("button", { name: "Acciones para Salida" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));
    fireEvent.submit(screen.getByTestId("publication-form"));
    await waitFor(() =>
      expect(
        screen.getByTestId("publication-form-error").textContent,
      ).toContain("No se pudo completar la solicitud. Intenta de nuevo."),
    );
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("submits fields and mission scope through one update request", async () => {
    const item = publication({ scope: "MISSION", missionIds: ["m1"] });
    setLists([], [item]);
    api.missions.mockResolvedValue([
      {
        id: "m1",
        slug: "mission-1",
        title: "Mission 1",
        heroImageId: "file",
        profileImageId: null,
        heroPhrase: "Phrase",
        status: "ACTIVE",
        createdAt: "",
        updatedAt: "",
      },
    ]);
    render(<PublicationsPage />);
    await screen.findByTestId("published-publications");
    fireEvent.click(screen.getByRole("tab", { name: /Borradores/ }));
    await screen.findByTestId("publication-p1");
    fireEvent.click(
      screen.getByRole("button", { name: "Acciones para Salida" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Actualizada" },
    });
    fireEvent.submit(screen.getByTestId("publication-form"));

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({
          title: "Actualizada",
          scope: "MISSION",
          missionIds: ["m1"],
        }),
      ),
    );
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.scope).not.toHaveBeenCalled();
  });

  it("creates and refreshes from the new-publication action", async () => {
    setLists([], []);
    render(<PublicationsPage />);
    await screen.findByTestId("published-publications");
    setLists([], [publication({ title: "Nueva" })]);
    fireEvent.click(screen.getByRole("button", { name: "Nueva publicación" }));
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "nueva" },
    });
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Nueva" },
    });
    fireEvent.submit(screen.getByTestId("publication-form"));
    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Nueva" }),
      ),
    );
    fireEvent.click(screen.getByRole("tab", { name: /Borradores/ }));
    expect(await screen.findByText("Nueva")).toBeTruthy();
  });

  it.each([
    ["Publicar", "PUBLISHED", "DRAFT"],
    ["Despublicar", "DRAFT", "PUBLISHED"],
  ] as const)(
    "uses the dedicated status client from the action menu when clicking %s",
    async (label, nextStatus, currentStatus) => {
      const item = publication({
        status: currentStatus,
        title: currentStatus === "DRAFT" ? "Borrador" : "Publicada",
      });
      setLists(
        currentStatus === "PUBLISHED" ? [item] : [],
        currentStatus === "DRAFT" ? [item] : [],
      );
      render(<PublicationsPage />);
      await screen.findByTestId("published-publications");
      if (currentStatus === "DRAFT") {
        fireEvent.click(screen.getByRole("tab", { name: /Borradores/ }));
      }
      await screen.findByTestId("publication-p1");
      fireEvent.click(
        screen.getByRole("button", {
          name: `Acciones para ${item.title}`,
        }),
      );
      fireEvent.click(screen.getByRole("menuitem", { name: label }));
      fireEvent.click(screen.getByRole("button", { name: label }));
      await waitFor(() =>
        expect(api.status).toHaveBeenCalledWith("p1", nextStatus),
      );
      expect(api.update).not.toHaveBeenCalled();
    },
  );

  it("cancels deletion, then confirms it from the action menu", async () => {
    const item = publication();
    setLists([], [item]);
    render(<PublicationsPage />);
    await screen.findByTestId("published-publications");
    fireEvent.click(screen.getByRole("tab", { name: /Borradores/ }));
    await screen.findByTestId("publication-p1");
    const actions = screen.getByRole("button", {
      name: "Acciones para Salida",
    });
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(api.remove).not.toHaveBeenCalled();
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("p1"));
  });
});
