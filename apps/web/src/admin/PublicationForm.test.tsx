import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PublicationForm } from "./PublicationForm.js";
import type { PublicationAdmin } from "./adminTypes.js";

const uploadProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
vi.mock("./FileUploadWidget.js", () => ({
  FileUploadWidget: (props: Record<string, unknown>) => {
    uploadProps.current = props;
    return <div data-testid="upload-widget" />;
  },
}));
const pickerProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
vi.mock("./MissionPickerDialog.js", () => ({
  MissionPickerDialog: (props: Record<string, unknown>) => {
    pickerProps.current = props;
    return props.open ? (
      <button
        onClick={() => (props.onConfirm as (ids: string[]) => void)(["m1"])}
      >
        Confirmar misiones
      </button>
    ) : null;
  },
}));

describe("PublicationForm", () => {
  afterEach(cleanup);
  it("shows post fields and submits the plain content textarea", () => {
    const onSubmit = vi.fn();
    render(
      <PublicationForm missions={[]} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    expect(screen.getByLabelText("Contenido")).toBeTruthy();
    expect(screen.queryByLabelText("Fecha de inicio")).toBeNull();
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Nueva" },
    });
    fireEvent.submit(screen.getByTestId("publication-form"));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Nueva", type: "POST" }),
    );
    expect(uploadProps.current).toMatchObject({
      category: "PUBLICATION_FEATURED_IMAGE",
    });
  });

  it("passes ACTIVE missions and selected IDs through the mission picker", () => {
    const mission = { id: "m1", status: "ACTIVE" } as never;
    render(
      <PublicationForm
        missions={[mission]}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Misiones"));
    expect(pickerProps.current).toMatchObject({
      missions: [mission],
      selectedIds: [],
    });
    fireEvent.click(screen.getByRole("button", { name: /Elegir misiones/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar misiones" }));
    expect(pickerProps.current).toMatchObject({ selectedIds: ["m1"] });
  });

  it("hydrates activity fields and exposes conditional accessible controls in edit mode", () => {
    const publication = {
      id: "p1",
      slug: "salida",
      title: "Salida",
      excerpt: "Resumen",
      content: "Detalle",
      featuredImageId: "file1",
      type: "OUTING",
      status: "DRAFT",
      scope: "GENERAL",
      publishedAt: null,
      startDate: "2026-01-02T00:00:00.000Z",
      endDate: "2026-01-03T00:00:00.000Z",
      activityStatus: "COMPLETED",
      documentationStatus: "DOCUMENTED",
      missionIds: [],
      createdAt: "",
      updatedAt: "",
    } as PublicationAdmin;
    render(
      <PublicationForm
        publication={publication}
        missions={[]}
        busy
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Título").getAttribute("value")).toBe(
      "Salida",
    );
    expect(screen.getByLabelText("Fecha de inicio").getAttribute("value")).toBe(
      "2026-01-02",
    );
    expect(screen.getByLabelText("Fecha de fin").getAttribute("value")).toBe(
      "2026-01-03",
    );
    expect(screen.getByLabelText("Estado de actividad")).toHaveProperty(
      "value",
      "COMPLETED",
    );
    expect(screen.getByLabelText("Estado de documentación")).toHaveProperty(
      "value",
      "DOCUMENTED",
    );
    expect(
      screen.getByTestId("publication-form").getAttribute("aria-busy"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Guardar publicación" }),
    ).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("Fecha de inicio")).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("requires confirmation before submitting an edited type change", async () => {
    const onSubmit = vi.fn();
    const publication = {
      id: "p1",
      slug: "salida",
      title: "Salida",
      excerpt: "",
      content: "",
      featuredImageId: null,
      type: "OUTING",
      status: "DRAFT",
      scope: "GENERAL",
      publishedAt: null,
      startDate: "2026-01-01",
      endDate: null,
      activityStatus: "UPCOMING",
      documentationStatus: "PENDING_DOCUMENTATION",
      missionIds: [] as string[],
      createdAt: "",
      updatedAt: "",
    } as const;
    render(
      <PublicationForm
        publication={publication}
        missions={[]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Tipo"), {
      target: { value: "POST" },
    });
    const form = screen.getByTestId("publication-form");
    fireEvent.submit(form);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.submit(form);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar tipo" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ confirmTypeChange: true }),
      ),
    );
  });
});
