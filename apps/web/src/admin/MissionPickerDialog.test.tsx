import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MissionPickerDialog } from "./MissionPickerDialog.js";
import type { MissionAdmin } from "./adminTypes.js";

const mission = (id: string): MissionAdmin => ({
  id,
  slug: id,
  title: `Mission ${id}`,
  heroImageId: "file",
  heroPhrase: "Phrase",
  status: "ACTIVE",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
});

describe("MissionPickerDialog", () => {
  it("lists the active missions supplied by its data contract", () => {
    const onConfirm = vi.fn();
    render(
      <MissionPickerDialog
        open
        missions={[mission("active")]}
        selectedIds={[]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Mission active")).toBeTruthy();
    screen.getByRole("checkbox").click();
    screen.getByRole("button", { name: "Confirmar" }).click();
    expect(onConfirm).toHaveBeenCalledWith(["active"]);
  });

  it("prevents confirmation when there are no active missions", () => {
    render(
      <MissionPickerDialog
        open
        missions={[]}
        selectedIds={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId("mission-picker-empty")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirmar" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});
