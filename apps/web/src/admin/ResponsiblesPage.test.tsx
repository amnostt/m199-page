import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { ResponsiblesPage } from "./ResponsiblesPage.js";
import {
  createResponsible,
  listResponsibles,
  updateResponsibleStatus,
} from "./responsiblesApi.js";
import type { Responsible } from "./adminTypes.js";

vi.mock("./responsiblesApi.js", () => ({
  createResponsible: vi.fn(),
  listResponsibles: vi.fn(),
  updateResponsibleStatus: vi.fn(),
}));

const CURRENT = {
  id: "self",
  email: "self@example.com",
  displayName: "Self",
  status: "ACTIVE" as const,
};
const OTHER = {
  id: "other",
  email: "other@example.com",
  displayName: "Other",
  status: "INACTIVE" as const,
};
const THIRD = {
  id: "third",
  email: "third@example.com",
  displayName: "Third",
  status: "ACTIVE" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listResponsibles).mockResolvedValue([CURRENT, OTHER]);
  vi.mocked(createResponsible).mockResolvedValue({
    id: "new",
    email: "new@example.com",
    displayName: "New",
    status: "ACTIVE",
  });
  vi.mocked(updateResponsibleStatus).mockResolvedValue({
    ...OTHER,
    status: "ACTIVE",
  });
});
afterEach(() => cleanup());

describe("ResponsiblesPage", () => {
  it("shows the loading state while the list request is pending", () => {
    vi.mocked(listResponsibles).mockReturnValueOnce(new Promise(() => {}));
    render(<ResponsiblesPage currentUserId="self" />);

    expect(screen.getByText(/cargando personas responsables/i)).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: /crear responsable/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(screen.queryByTestId("responsibles-table")).toBeNull();
  });

  it("validates missing email and display name before sending a request", async () => {
    render(<ResponsiblesPage currentUserId="self" />);
    await waitFor(() =>
      expect(screen.getByTestId("responsibles-table")).toBeTruthy(),
    );

    fireEvent.change(screen.getByLabelText("Contraseña inicial"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear responsable/i }));

    expect(
      screen.getByText("El correo electrónico es obligatorio."),
    ).toBeTruthy();
    expect(screen.getByText("El nombre visible es obligatorio.")).toBeTruthy();
    expect(createResponsible).not.toHaveBeenCalled();
  });

  it("renders server order and blocks self-deactivation in UI and handler", async () => {
    render(<ResponsiblesPage currentUserId="self" />);
    await waitFor(() =>
      expect(screen.getByTestId("responsibles-table")).toBeTruthy(),
    );

    const rows = screen.getAllByRole("row");
    expect(rows[1]!.textContent).toContain("self@example.com");
    expect(rows[2]!.textContent).toContain("other@example.com");
    expect(
      screen.getByText(/no puedes desactivar tu propia cuenta/i),
    ).toBeTruthy();

    const selfButton = screen.getByRole("button", { name: "Desactivar" });
    expect((selfButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(selfButton);
    expect(updateResponsibleStatus).not.toHaveBeenCalled();
  });

  it("validates, creates, and clears the secret without displaying it", async () => {
    render(<ResponsiblesPage currentUserId="self" />);
    await waitFor(() =>
      expect(screen.getByTestId("responsibles-table")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: /crear responsable/i }));
    expect(screen.getByText(/contraseña debe tener al menos/i)).toBeTruthy();
    expect(createResponsible).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "New" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña inicial"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear responsable/i }));
    await waitFor(() => expect(createResponsible).toHaveBeenCalled());
    expect(
      (screen.getByLabelText("Contraseña inicial") as HTMLInputElement).value,
    ).toBe("");
    expect(screen.queryByText("password")).toBeNull();
  });

  it("renders the server-created row and prevents duplicate submission while pending", async () => {
    let resolveCreate!: (value: typeof CURRENT) => void;
    vi.mocked(createResponsible).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    render(<ResponsiblesPage currentUserId="self" />);
    await waitFor(() =>
      expect(screen.getByTestId("responsibles-table")).toBeTruthy(),
    );

    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "New" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña inicial"), {
      target: { value: "password" },
    });
    const submit = screen.getByRole("button", { name: /crear responsable/i });
    fireEvent.click(submit);

    await waitFor(() => expect(createResponsible).toHaveBeenCalledTimes(1));
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText("Correo electrónico")).toHaveProperty(
      "disabled",
      true,
    );

    resolveCreate({
      id: "new",
      email: "new@example.com",
      displayName: "New",
      status: "ACTIVE",
    });
    await waitFor(() =>
      expect(screen.getByTestId("responsible-row-new")).toBeTruthy(),
    );
  });

  it("retains non-secret input and shows a parsed create failure", async () => {
    vi.mocked(createResponsible).mockRejectedValueOnce(
      new Error("Email already exists"),
    );
    render(<ResponsiblesPage currentUserId="self" />);
    await waitFor(() =>
      expect(screen.getByTestId("responsibles-table")).toBeTruthy(),
    );

    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "duplicate@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "Duplicate" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña inicial"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear responsable/i }));

    await waitFor(() =>
      expect(screen.getByText("El correo electrónico ya existe.")).toBeTruthy(),
    );
    expect(screen.getByLabelText("Correo electrónico")).toHaveProperty(
      "value",
      "duplicate@example.com",
    );
    expect(screen.getByLabelText("Nombre visible")).toHaveProperty(
      "value",
      "Duplicate",
    );
    expect(screen.getByLabelText("Contraseña inicial")).toHaveProperty(
      "value",
      "",
    );
    expect(screen.queryByTestId("responsible-row-new")).toBeNull();
  });

  it("shows load failures with a retry action", async () => {
    vi.mocked(listResponsibles)
      .mockRejectedValueOnce(new Error("Unable to load"))
      .mockResolvedValueOnce([]);
    render(<ResponsiblesPage currentUserId="self" />);
    await waitFor(() =>
      expect(
        screen.getByText(
          "No se pudo completar la solicitud. Intenta de nuevo.",
        ),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() =>
      expect(
        screen.getByText(/todavía no hay personas responsables/i),
      ).toBeTruthy(),
    );
  });

  it("keeps a row's confirmed state on status failure", async () => {
    vi.mocked(updateResponsibleStatus).mockRejectedValueOnce(
      new Error("Cannot change"),
    );
    render(<ResponsiblesPage currentUserId="self" />);
    await waitFor(() =>
      expect(screen.getByTestId("responsibles-table")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Activar" }));
    await waitFor(() =>
      expect(screen.getByText("No se pudo cambiar el estado.")).toBeTruthy(),
    );
    expect(screen.getByTestId("responsible-row-other").textContent).toContain(
      "INACTIVE",
    );
  });

  it("reconciles successful status changes with the server response", async () => {
    vi.mocked(listResponsibles).mockResolvedValueOnce([CURRENT, OTHER]);
    vi.mocked(updateResponsibleStatus).mockResolvedValueOnce({
      ...OTHER,
      displayName: "Renamed by server",
      status: "ACTIVE",
    });
    render(<ResponsiblesPage currentUserId="self" />);
    await waitFor(() =>
      expect(screen.getByTestId("responsibles-table")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Activar" }));
    await waitFor(() =>
      expect(screen.getByTestId("responsible-row-other").textContent).toContain(
        "Renamed by server",
      ),
    );
    expect(screen.getByTestId("responsible-row-other").textContent).toContain(
      "ACTIVE",
    );
    expect(
      screen.getByTestId("responsible-row-other").querySelector("button"),
    ).toHaveProperty("textContent", "Desactivar");
  });

  it("keeps pending status isolated to the selected row", async () => {
    let resolveStatus!: (value: Responsible) => void;
    vi.mocked(listResponsibles).mockResolvedValueOnce([CURRENT, OTHER, THIRD]);
    vi.mocked(updateResponsibleStatus).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    render(<ResponsiblesPage currentUserId="self" />);
    await waitFor(() =>
      expect(screen.getByTestId("responsibles-table")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Activar" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Guardando…" })).toBeTruthy(),
    );
    expect(
      (
        screen
          .getByTestId("responsible-row-third")
          .querySelector("button") as HTMLButtonElement
      ).disabled,
    ).toBe(false);

    resolveStatus({ ...OTHER, status: "ACTIVE" });
    await waitFor(() =>
      expect(
        screen.getByTestId("responsible-row-other").querySelector("button"),
      ).toHaveProperty("textContent", "Desactivar"),
    );
  });

  it("supports successful activation and deactivation for another user", async () => {
    vi.mocked(updateResponsibleStatus)
      .mockResolvedValueOnce({ ...OTHER, status: "ACTIVE" })
      .mockResolvedValueOnce({ ...OTHER, status: "INACTIVE" });
    render(<ResponsiblesPage currentUserId="self" />);
    await waitFor(() =>
      expect(screen.getByTestId("responsibles-table")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Activar" }));
    await waitFor(() =>
      expect(screen.getByTestId("responsible-row-other").textContent).toContain(
        "ACTIVE",
      ),
    );
    fireEvent.click(
      screen.getByTestId("responsible-row-other").querySelector("button")!,
    );
    await waitFor(() =>
      expect(screen.getByTestId("responsible-row-other").textContent).toContain(
        "INACTIVE",
      ),
    );
    expect(updateResponsibleStatus).toHaveBeenNthCalledWith(
      1,
      "other",
      "ACTIVE",
    );
    expect(updateResponsibleStatus).toHaveBeenNthCalledWith(
      2,
      "other",
      "INACTIVE",
    );
  });

  it("keeps the established session-expiry outcome visible for an unauthorized load", async () => {
    vi.mocked(listResponsibles).mockRejectedValueOnce(
      new Error("Session expired"),
    );
    render(<ResponsiblesPage currentUserId="self" />);

    await waitFor(() =>
      expect(
        screen.getByText("La sesión expiró. Inicia sesión nuevamente."),
      ).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });
});
