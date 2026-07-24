import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminProviders } from "./AdminProviders.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
// prettier-ignore
import { Badge, Field, LoadingFeedback, Table, TableBody, TableCell, TableRow } from "../components/ui/core.js";

describe("admin foundation", () => {
  it("provides an authenticated token and portal root", () => {
    // prettier-ignore
    render(<AdminProviders><p>content</p></AdminProviders>);
    expect(screen.getByTestId("admin-ui-root").className).toBe("admin-ui");
    expect(screen.getByTestId("admin-portal-root")).toBeTruthy();
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
    // prettier-ignore
    render(<><Field name="title" label="Title" description="Required" error="Missing"><input /></Field><LoadingFeedback /><Table><TableBody><TableRow><TableCell>Row</TableCell></TableRow></TableBody></Table><Badge>Draft</Badge></>);
    expect(screen.getByLabelText("Title").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByText("Missing")).toBeTruthy();
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("cell").textContent).toContain("Row");
    expect(screen.getByText("Draft").className).toContain("admin-badge");
  });
});
