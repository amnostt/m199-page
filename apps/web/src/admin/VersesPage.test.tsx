import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VersesPage } from "./VersesPage.js";
import { createVerse, deleteVerse, listVerses } from "./versesApi.js";
import type { VerseAdmin, VerseStatus } from "./adminTypes.js";

vi.mock("./versesApi.js", () => ({
  createVerse: vi.fn(),
  deleteVerse: vi.fn(),
  listVerses: vi.fn(),
}));

const verse = (id: string, status: VerseStatus, date = "2026-07-15"): VerseAdmin => ({
  id,
  text: `Verse ${id}`,
  reference: `John ${id}:1`,
  date,
  publishedAt: null,
  status,
  createdById: null,
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: "2026-07-15T00:00:00.000Z",
});

beforeEach(() => {
  vi.mocked(listVerses).mockResolvedValue([]);
  vi.mocked(createVerse).mockReset();
  vi.mocked(deleteVerse).mockReset();
  vi.spyOn(window, "confirm");
});

afterEach(() => cleanup());

describe("VersesPage list states", () => {
  it("shows loading, all statuses, and a stable business date", async () => {
    let resolve!: (value: ReturnType<typeof verse>[]) => void;
    vi.mocked(listVerses).mockReturnValue(new Promise((r) => (resolve = r)));
    render(<VersesPage />);

    expect(screen.getByText(/loading verses/i)).toBeTruthy();
    resolve([verse("1", "DRAFT"), verse("2", "PUBLISHED"), verse("3", "ARCHIVED")]);

    await waitFor(() => expect(screen.getByTestId("verses-table")).toBeTruthy());
    expect(screen.getByText("DRAFT")).toBeTruthy();
    expect(screen.getByText("PUBLISHED")).toBeTruthy();
    expect(screen.getByText("ARCHIVED")).toBeTruthy();
    expect(screen.getAllByText(/2026/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/15/).length).toBe(3);
    expect(screen.queryByRole("button", { name: /edit|filter|page|revision/i })).toBeNull();
  });

  it("shows empty and recoverable failure states", async () => {
    vi.mocked(listVerses).mockRejectedValueOnce(new Error("Could not load"));
    render(<VersesPage />);
    await waitFor(() => expect(screen.getByText("Could not load")).toBeTruthy());
    expect(screen.queryByTestId("verses-table")).toBeNull();

    vi.mocked(listVerses).mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText(/no verses yet/i)).toBeTruthy());
  });
});

describe("VersesPage creation", () => {
  it("rejects whitespace-only fields without a request", async () => {
    render(<VersesPage />);
    await waitFor(() => expect(screen.getByText(/no verses yet/i)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /create verse/i }));
    expect(screen.getByText("Text is required.")).toBeTruthy();
    expect(screen.getByText("Reference is required.")).toBeTruthy();
    expect(createVerse).not.toHaveBeenCalled();
  });

  it("trims input, prevents duplicate submission, and prepends the server row", async () => {
    let resolve!: (value: ReturnType<typeof verse>) => void;
    vi.mocked(createVerse).mockReturnValue(new Promise((r) => (resolve = r)));
    render(<VersesPage />);
    await waitFor(() => expect(screen.getByText(/no verses yet/i)).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "  New text  " } });
    fireEvent.change(screen.getByLabelText("Reference"), { target: { value: "  Ps 1:1  " } });
    const submit = screen.getByRole("button", { name: /create verse/i });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(createVerse).toHaveBeenCalledTimes(1);
    expect(createVerse).toHaveBeenCalledWith({ text: "New text", reference: "Ps 1:1" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    resolve(verse("new", "DRAFT"));
    await waitFor(() => expect(screen.getByText("Verse new")).toBeTruthy());
    expect((screen.getByLabelText("Text") as HTMLTextAreaElement).value).toBe("");
  });

  it("retains fields and reports a failed create", async () => {
    vi.mocked(createVerse).mockRejectedValueOnce(new Error("Create failed"));
    render(<VersesPage />);
    await waitFor(() => expect(screen.getByText(/no verses yet/i)).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "Text" } });
    fireEvent.change(screen.getByLabelText("Reference"), { target: { value: "Ref" } });
    fireEvent.click(screen.getByRole("button", { name: /create verse/i }));
    await waitFor(() => expect(screen.getByText("Create failed")).toBeTruthy());
    expect((screen.getByLabelText("Text") as HTMLTextAreaElement).value).toBe("Text");
  });
});

describe("VersesPage deletion", () => {
  it("cancels without a request and confirms with an irreversible warning", async () => {
    vi.mocked(listVerses).mockResolvedValue([verse("1", "DRAFT")]);
    vi.mocked(window.confirm).mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.mocked(deleteVerse).mockResolvedValue(undefined);
    render(<VersesPage />);
    await waitFor(() => expect(screen.getByTestId("verse-row-1")).toBeTruthy());
    const button = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(button);
    expect(deleteVerse).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(window.confirm).toHaveBeenLastCalledWith(expect.stringContaining("permanently"));
    await waitFor(() => expect(screen.queryByTestId("verse-row-1")).toBeNull());
  });

  it("isolates pending rows and preserves a row after failure for retry", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(listVerses).mockResolvedValue([verse("1", "DRAFT"), verse("2", "PUBLISHED")]);
    vi.mocked(window.confirm).mockReturnValue(true);
    vi.mocked(deleteVerse).mockReturnValueOnce(new Promise((_, r) => (reject = r)));
    render(<VersesPage />);
    await waitFor(() => expect(screen.getByTestId("verse-row-1")).toBeTruthy());
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[0]!);
    fireEvent.click(deleteButtons[0]!);
    expect(deleteVerse).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeTruthy();
    reject(new Error("Delete failed"));
    await waitFor(() => expect(screen.getByText("Delete failed")).toBeTruthy());
    expect(screen.getByTestId("verse-row-1")).toBeTruthy();
  });
});
