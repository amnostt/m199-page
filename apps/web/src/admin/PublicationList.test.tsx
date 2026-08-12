import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

describe("PublicationList", () => {
  it("shows an accessible empty state", () => {
    render(
      <PublicationList
        publications={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onStatus={vi.fn()}
      />,
    );
    expect(screen.getByTestId("publications-empty").textContent).toContain(
      "Todavía no hay publicaciones.",
    );
  });

  it("renders publication metadata and sends row actions to the owner", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onStatus = vi.fn();
    render(
      <PublicationList
        publications={[publication()]}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatus={onStatus}
      />,
    );
    expect(screen.getByText("First")).toBeTruthy();
    screen.getByRole("button", { name: "Editar" }).click();
    screen.getByRole("button", { name: "Publicar" }).click();
    screen.getByRole("button", { name: "Eliminar" }).click();
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" }));
    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1" }),
    );
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1" }),
    );
  });
});
