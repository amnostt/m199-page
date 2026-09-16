import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicationList } from "./PublicationList.js";
import type { PublicationAdmin } from "./adminTypes.js";

const publication = (
  status: PublicationAdmin["status"] = "DRAFT",
): PublicationAdmin => ({
  id: "p1",
  slug: "first",
  title: "First",
  excerpt: "Excerpt",
  content: "Content",
  featuredImageId: null,
  type: "POST",
  status,
  scope: "GENERAL",
  publishedAt: null,
  startDate: null,
  endDate: null,
  activityStatus: null,
  documentationStatus: null,
  missionIds: [],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
});

afterEach(cleanup);

describe("PublicationList", () => {
  it("shows an accessible empty state", () => {
    render(
      <PublicationList
        heading="Publicaciones en borrador"
        empty="Todavía no hay borradores."
        publications={[]}
        testId="draft-publications"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onStatus={vi.fn()}
      />,
    );
    expect(screen.getByText("Todavía no hay borradores.")).toBeTruthy();
  });

  it("renders publication metadata and sends row actions to the owner", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onStatus = vi.fn();
    render(
      <PublicationList
        heading="Publicaciones en borrador"
        empty="Todavía no hay borradores."
        publications={[publication()]}
        testId="draft-publications"
        onEdit={onEdit}
        onDelete={onDelete}
        onStatus={onStatus}
      />,
    );
    expect(screen.getByText("First")).toBeTruthy();
    const actions = screen.getByRole("button", { name: "Acciones para First" });
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole("menuitem", { name: "Publicar" }));
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" }));
    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1" }),
    );
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1" }),
    );
  });

  it("opens the row context menu with the same actions and valid table markup", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onStatus = vi.fn();
    render(
      <PublicationList
        heading="Publicaciones en borrador"
        empty="Todavía no hay borradores."
        publications={[publication()]}
        testId="draft-publications"
        onEdit={onEdit}
        onDelete={onDelete}
        onStatus={onStatus}
      />,
    );

    const row = screen.getByTestId("publication-p1");
    expect(row.tagName).toBe("TR");
    expect(row.parentElement?.tagName).toBe("TBODY");
    expect(
      Array.from(row.parentElement?.children ?? []).every(
        (child) => child.tagName === "TR",
      ),
    ).toBe(true);

    fireEvent.contextMenu(row);
    expect(screen.getByRole("menuitem", { name: "Editar" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Publicar" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Eliminar" })).toBeTruthy();

    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));
    fireEvent.contextMenu(row);
    fireEvent.click(screen.getByRole("menuitem", { name: "Publicar" }));
    fireEvent.contextMenu(row);
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" }));
    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1" }),
    );
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1" }),
    );
  });
});
