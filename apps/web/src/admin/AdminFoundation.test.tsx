import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminProviders } from "./AdminProviders.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../components/ui/field.js";
import { Input } from "../components/ui/input.js";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "../components/ui/table.js";

describe("admin foundation", () => {
  it("provides the administrative root and toast host", () => {
    // prettier-ignore
    render(<AdminProviders><p>content</p></AdminProviders>);
    expect(screen.getByTestId("admin-ui-root").className).toContain("admin-ui");
  });
  it("contains render failures in the shared feedback boundary", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    function Broken(): never {
      throw new Error("broken");
    }
    // prettier-ignore
    render(<AdminProviders><Broken /></AdminProviders>);
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
  });
  it("renders ConfirmDialog during SSR without document", () => {
    vi.stubGlobal("document", undefined);
    // prettier-ignore
    expect(() => renderToString(<ConfirmDialog open title="Delete" description="Sure?" confirmLabel="Delete" onConfirm={() => {}} onCancel={() => {}} />)).not.toThrow();
    vi.unstubAllGlobals();
  });
  it("supports Escape cancellation and one acceptance", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    // prettier-ignore
    render(<ConfirmDialog open title="Delete" description="Sure?" confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
    const confirm = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("wires field errors and exposes semantic primitive states", () => {
    render(
      <>
        <Field data-invalid="true">
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input id="title" aria-invalid="true" />
          <FieldDescription>Required</FieldDescription>
          <FieldError>Missing</FieldError>
        </Field>
        <div role="status" aria-live="polite">
          Loading…
        </div>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Badge>Draft</Badge>
        <Alert variant="destructive">
          <AlertDescription>Failure</AlertDescription>
        </Alert>
      </>,
    );
    expect(screen.getByLabelText("Title").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByText("Missing")).toBeTruthy();
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("cell").textContent).toContain("Row");
    expect(screen.getByText("Draft").getAttribute("data-slot")).toBe("badge");
    expect(screen.getByText("Failure")).toBeTruthy();
  });
});
