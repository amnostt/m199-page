import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PublicationForm } from "./PublicationForm.js";
import type { PublicationAdmin } from "./adminTypes.js";

const imageProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
vi.mock("./PublicationImageField.js", () => ({
  PublicationImageField: (props: Record<string, unknown>) => {
    imageProps.current = props;
    return <div data-testid="publication-images" />;
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
        type="button"
        onClick={() => (props.onConfirm as (ids: string[]) => void)(["m1"])}
      >
        Confirmar misiones
      </button>
    ) : null;
  },
}));

const publication = (
  overrides: Partial<PublicationAdmin> = {},
): PublicationAdmin => ({
  id: "p1",
  slug: "salida",
  title: "Salida",
  excerpt: "Resumen",
  content: "<p>Detalle</p>",
  imageIds: ["image-1", "image-2"],
  type: "OUTING",
  status: "DRAFT",
  scope: "GENERAL",
  publishedAt: null,
  activityDate: "2026-01-02",
  missionIds: [],
  createdAt: "",
  updatedAt: "",
  ...overrides,
});

describe("PublicationForm", () => {
  afterEach(cleanup);

  it("submits a POST with ordered images, null activity date, and editor content", () => {
    const onSubmit = vi.fn();
    render(
      <PublicationForm missions={[]} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "mision-centro-2026" },
    });
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Nueva" },
    });
    act(() => {
      (imageProps.current?.onChange as (ids: string[]) => void)(["image-1"]);
    });
    fireEvent.submit(screen.getByTestId("publication-form"));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "mision-centro-2026",
        title: "Nueva",
        type: "POST",
        imageIds: ["image-1"],
        activityDate: null,
      }),
    );
    expect(screen.getByRole("textbox", { name: "Contenido" })).toBeTruthy();
  });

  it("blocks missing slug, title, and image with visible associated feedback", () => {
    const onSubmit = vi.fn();
    render(
      <PublicationForm missions={[]} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.submit(screen.getByTestId("publication-form"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("El slug es obligatorio.")).toBeTruthy();
    expect(screen.getByText("El título es obligatorio.")).toBeTruthy();
    expect(screen.getByText("Agrega al menos una imagen.")).toBeTruthy();
    expect(screen.getByLabelText("Slug").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });

  it("suggests a normalized slug until a manual override", () => {
    render(
      <PublicationForm missions={[]} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    const title = screen.getByLabelText("Título");
    const slug = screen.getByLabelText("Slug");
    fireEvent.change(title, { target: { value: "Misión Centro 2026" } });
    expect(slug).toHaveProperty("value", "mision-centro-2026");
    fireEvent.change(slug, { target: { value: "manual" } });
    fireEvent.change(title, { target: { value: "Otro título" } });
    expect(slug).toHaveProperty("value", "manual");
  });

  it("hydrates the activity date, ordered images, and editor in edit mode", () => {
    render(
      <PublicationForm
        publication={publication()}
        missions={[]}
        busy
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Fecha de actividad")).toHaveProperty(
      "value",
      "2026-01-02",
    );
    expect(imageProps.current).toMatchObject({
      imageIds: ["image-1", "image-2"],
    });
    expect(screen.getByRole("textbox", { name: "Contenido" })).toBeTruthy();
    fireEvent.submit(screen.getByTestId("publication-form"));
  });

  it("preserves date and images when changing OUTING to EVENT", async () => {
    const onSubmit = vi.fn();
    render(
      <PublicationForm
        publication={publication()}
        missions={[]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Tipo"), {
      target: { value: "EVENT" },
    });
    fireEvent.submit(screen.getByTestId("publication-form"));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar tipo" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "EVENT",
          activityDate: "2026-01-02",
          imageIds: ["image-1", "image-2"],
          confirmTypeChange: true,
        }),
      ),
    );
  });

  it("confirms and clears the date when changing an activity to POST", async () => {
    const onSubmit = vi.fn();
    render(
      <PublicationForm
        publication={publication()}
        missions={[]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Tipo"), {
      target: { value: "POST" },
    });
    fireEvent.submit(screen.getByTestId("publication-form"));
    expect(screen.getByText(/fecha de actividad se eliminará/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar tipo" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "POST",
          activityDate: null,
          imageIds: ["image-1", "image-2"],
          confirmTypeChange: true,
        }),
      ),
    );
  });

  it("passes mission selection through the picker", () => {
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
});
