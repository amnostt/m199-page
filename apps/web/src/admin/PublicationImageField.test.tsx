import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { PublicationImageField } from "./PublicationImageField.js";

vi.mock("./FileUploadWidget.js", () => ({
  FileUploadWidget: (props: Record<string, unknown>) => (
    <div data-testid={String(props["data-testid"])}>
      <button
        type="button"
        onClick={() =>
          (props.onUploaded as (asset: { id: string }) => void)({ id: "new" })
        }
      >
        Subir
      </button>
      {Boolean(props.onRemove) && (
        <button type="button" onClick={props.onRemove as () => void}>
          Quitar
        </button>
      )}
    </div>
  ),
}));

describe("PublicationImageField", () => {
  afterEach(cleanup);

  it("treats position zero as featured and reorders image IDs", () => {
    const onChange = vi.fn();
    render(
      <PublicationImageField
        imageIds={["first", "second"]}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Imagen 1")).toBeTruthy();
    expect(screen.getByText("(destacada)")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Mover imagen 1 abajo" }),
    );
    expect(onChange).toHaveBeenCalledWith(["second", "first"]);
  });

  it("removes an image and appends uploads without exceeding five", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PublicationImageField imageIds={["first"]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(onChange).toHaveBeenCalledWith([]);
    fireEvent.click(
      within(screen.getByTestId("publication-image-add")).getByRole("button", {
        name: "Subir",
      }),
    );
    expect(onChange).toHaveBeenCalledWith(["first", "new"]);

    rerender(
      <PublicationImageField
        imageIds={["one", "two", "three", "four", "five"]}
        onChange={onChange}
      />,
    );
    expect(screen.queryByTestId("publication-image-add")).toBeNull();
  });
});
