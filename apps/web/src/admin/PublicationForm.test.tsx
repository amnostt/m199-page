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
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "mision-centro-2026" },
    });
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Nueva" },
    });
    fireEvent.submit(screen.getByTestId("publication-form"));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "mision-centro-2026",
        title: "Nueva",
        type: "POST",
      }),
    );
    expect(uploadProps.current).toMatchObject({
      category: "PUBLICATION_FEATURED_IMAGE",
    });
  });

  it("blocks invalid required fields with associated visible messages", () => {
    const onSubmit = vi.fn();
    render(
      <PublicationForm missions={[]} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.submit(screen.getByTestId("publication-form"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("El slug es obligatorio.")).toBeTruthy();
    expect(screen.getByText("El título es obligatorio.")).toBeTruthy();
    expect(screen.getByLabelText("Slug").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByLabelText("Slug").getAttribute("aria-describedby")).toBe(
      "publication-slug-description publication-slug-error",
    );
  });

  it("suggests a normalized slug while the title remains the source", () => {
    render(
      <PublicationForm missions={[]} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
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

  it("stops suggestions after a manual slug override, including the same value", () => {
    render(
      <PublicationForm missions={[]} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    const title = screen.getByLabelText("Título");
    const slug = screen.getByLabelText("Slug");

    fireEvent.change(title, { target: { value: "Misión Centro 2026" } });
    fireEvent.input(slug, { target: { value: "mision-centro-2026" } });
    fireEvent.change(title, { target: { value: "Nuevo título" } });
    expect(slug.getAttribute("value")).toBe("mision-centro-2026");
    fireEvent.change(slug, { target: { value: "manual" } });
    fireEvent.change(title, { target: { value: "Otro título" } });
    expect(slug.getAttribute("value")).toBe("manual");
  });

  it("keeps a manually cleared slug empty and rejects it on submit", () => {
    const onSubmit = vi.fn();
    render(
      <PublicationForm missions={[]} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    const title = screen.getByLabelText("Título");
    const slug = screen.getByLabelText("Slug");

    fireEvent.change(title, { target: { value: "Misión Centro 2026" } });
    fireEvent.change(slug, { target: { value: "" } });
    fireEvent.change(title, { target: { value: "Nuevo título" } });
    expect(slug.getAttribute("value")).toBe("");
    fireEvent.submit(screen.getByTestId("publication-form"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("El slug es obligatorio.")).toBeTruthy();
  });

  it("re-enables suggestions after resetting a create flow", () => {
    const onCancel = vi.fn();
    render(
      <PublicationForm missions={[]} onSubmit={vi.fn()} onCancel={onCancel} />,
    );
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Primer título" },
    });
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "manual" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Misión Centro 2026" },
    });
    expect(screen.getByLabelText("Slug").getAttribute("value")).toBe(
      "mision-centro-2026",
    );
  });

  it.each([
    "Mision-centro",
    "mision centro",
    "Misión-centro",
    "mision_centro",
    "mision!",
    "-mision",
    "mision-",
    "mision--centro",
  ])("rejects malformed slug %j before submission", (slug) => {
    const onSubmit = vi.fn();
    render(
      <PublicationForm missions={[]} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: slug },
    });
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Nueva" },
    });
    fireEvent.submit(screen.getByTestId("publication-form"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/El slug no es válido/)).toBeTruthy();
    expect(screen.getByLabelText("Slug").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByLabelText("Slug").getAttribute("aria-describedby")).toBe(
      "publication-slug-description publication-slug-error",
    );
  });

  it("groups scope options as one native radio group", () => {
    render(
      <PublicationForm missions={[]} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(
      screen
        .getAllByRole("radio")
        .every((radio) => radio.getAttribute("name") === "publication-scope"),
    ).toBe(true);
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
    const onSubmit = vi.fn();
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
        onSubmit={onSubmit}
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
      screen.getByRole("button", { name: "Guardando publicación…" }),
    ).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("Fecha de inicio")).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.submit(screen.getByTestId("publication-form"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("preserves an edited publication slug until it is directly changed", () => {
    const onSubmit = vi.fn();
    const publication = {
      id: "p1",
      slug: "stored-slug",
      title: "Título guardado",
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
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Título actualizado" },
    });
    expect(screen.getByLabelText("Slug").getAttribute("value")).toBe(
      "stored-slug",
    );
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "slug-directo" },
    });
    fireEvent.submit(screen.getByTestId("publication-form"));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Título actualizado",
        slug: "slug-directo",
      }),
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
    fireEvent.change(screen.getByLabelText("Tipo"), {
      target: { value: "OUTING" },
    });
    expect(screen.getByLabelText("Fecha de inicio").getAttribute("value")).toBe(
      "2026-01-01",
    );
    fireEvent.change(screen.getByLabelText("Tipo"), {
      target: { value: "POST" },
    });
    fireEvent.submit(form);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar tipo" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmTypeChange: true,
          startDate: null,
          endDate: null,
          activityStatus: null,
          documentationStatus: null,
        }),
      ),
    );
  });
});
