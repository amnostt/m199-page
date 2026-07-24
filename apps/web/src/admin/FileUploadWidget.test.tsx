// ---------------------------------------------------------------------------
// FileUploadWidget component tests
//
// Tests:
// - Render file input when fileId is null (idle state)
// - Upload: fireEvent.change with File → POST /files/:category with FormData
// - Uploading / success / error states
// - Remove button when fileId is set
// - 401-retry-FormData: adminFetch 401→refresh→retry preserves File in body
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { FileUploadWidget } from "./FileUploadWidget.js";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_ASSET = {
  id: "asset-1",
  url: "/files/asset-1",
  thumbnailUrl: "/files/asset-1/thumb",
  mimeType: "image/png",
  fileSize: 1024,
  originalFilename: "c.png",
  category: "POST_COVER_IMAGE",
  createdAt: "2026-01-01T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

// =========================================================================
// FileUploadWidget — upload tests
// =========================================================================

describe("FileUploadWidget — idle state (no file)", () => {
  it("renders a file input when fileId is null", () => {
    render(
      <FileUploadWidget
        category="POST_COVER_IMAGE"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const input = screen.getByTestId("file-upload-input");
    expect(input).toBeTruthy();
    expect(input.tagName).toBe("INPUT");
    expect((input as HTMLInputElement).type).toBe("file");
    expect(screen.getByLabelText(/upload post cover image/i)).toBe(input);
  });

  it("renders no remove button when fileId is null", () => {
    render(
      <FileUploadWidget
        category="POST_COVER_IMAGE"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("file-upload-remove")).toBeNull();
  });
});

describe("FileUploadWidget — upload flow", () => {
  it("shows uploading state and POSTs /files/:category with FormData", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_ASSET),
    });

    render(
      <FileUploadWidget
        category="POST_COVER_IMAGE"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const file = new File(["x"], "c.png", { type: "image/png" });
    const input = screen.getByTestId("file-upload-input");
    fireEvent.change(input, { target: { files: [file] } });

    // Uploading state appears immediately
    await waitFor(() => {
      expect(screen.getByTestId("file-upload-uploading")).toBeTruthy();
    });

    // Fetch was called with POST to correct URL
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const postCall = fetchMock.mock.calls[0]!;
    expect(postCall[0]).toBe("/files/POST_COVER_IMAGE");

    const init = postCall[1]! as RequestInit;
    expect(init.method).toBe("POST");

    // Body is FormData containing the uploaded file
    const body = init.body as FormData;
    expect(body instanceof FormData).toBe(true);
    expect(body.get("file")).toBe(file);

    // No Content-Type header — browser sets multipart boundary
    expect(init.headers).toBeUndefined();
  });

  it("calls onUploaded with FileAssetResponse on success", async () => {
    const successToast = vi.spyOn(toast, "success");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_ASSET),
    });

    const onUploaded = vi.fn();

    render(
      <FileUploadWidget
        category="POST_COVER_IMAGE"
        fileId={null}
        onUploaded={onUploaded}
        onRemove={vi.fn()}
      />,
    );

    const file = new File(["x"], "c.png", { type: "image/png" });
    const input = screen.getByTestId("file-upload-input");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
      expect(onUploaded).toHaveBeenCalledWith(MOCK_ASSET);
    });
    // prettier-ignore
    expect(successToast).toHaveBeenCalledWith("File uploaded.", expect.anything());

    // Uploading state clears after success
    expect(screen.queryByTestId("file-upload-uploading")).toBeNull();
  });

  it("shows error state on upload failure", async () => {
    const errorToast = vi.spyOn(toast, "error");
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(
      <FileUploadWidget
        category="POST_COVER_IMAGE"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const file = new File(["x"], "c.png", { type: "image/png" });
    const input = screen.getByTestId("file-upload-input");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("file-upload-error")).toBeTruthy();
    });
    // prettier-ignore
    expect(errorToast).toHaveBeenCalledWith("Upload failed.", expect.objectContaining({ description: "Network error" }));

    // Uploading state clears after error
    expect(screen.queryByTestId("file-upload-uploading")).toBeNull();
  });

  it("shows error state on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    render(
      <FileUploadWidget
        category="POST_COVER_IMAGE"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const file = new File(["x"], "c.png", { type: "image/png" });
    const input = screen.getByTestId("file-upload-input");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("file-upload-error")).toBeTruthy();
    });
  });

  it("disables input while uploading", async () => {
    // Hung fetch keeps uploading state visible
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {}));

    render(
      <FileUploadWidget
        category="POST_COVER_IMAGE"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const file = new File(["x"], "c.png", { type: "image/png" });
    const input = screen.getByTestId("file-upload-input");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("file-upload-uploading")).toBeTruthy();
      expect((input as HTMLInputElement).disabled).toBe(true);
    });
  });
});

describe("FileUploadWidget — remove button", () => {
  it("shows remove button when fileId is set", () => {
    render(
      <FileUploadWidget
        category="POST_COVER_IMAGE"
        fileId="existing-file-id"
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const removeBtn = screen.getByTestId("file-upload-remove");
    expect(removeBtn).toBeTruthy();
    expect(removeBtn.textContent).toMatch(/remove/i);
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();

    render(
      <FileUploadWidget
        category="POST_COVER_IMAGE"
        fileId="existing-file-id"
        onUploaded={vi.fn()}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByTestId("file-upload-remove"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

// =========================================================================
// 401-retry-FormData test
// =========================================================================

describe("FileUploadWidget — 401 retry with FormData", () => {
  it("re-sends the File in the retry body after adminFetch 401→refresh→retry", async () => {
    globalThis.fetch = vi
      .fn()
      // Call 1: POST /files/POST_COVER_IMAGE → 401
      .mockImplementationOnce((url: string) => {
        if (url === "/files/POST_COVER_IMAGE") {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () => Promise.resolve({}),
          });
        }
        return Promise.reject(new Error("Unexpected call"));
      })
      // Call 2: POST /auth/refresh → 200 (successful refresh)
      .mockImplementationOnce((url: string) => {
        if (url === "/auth/refresh") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: "u1",
                email: "admin@test.com",
                displayName: "Admin",
              }),
          });
        }
        return Promise.reject(new Error("Unexpected call"));
      })
      // Call 3: POST /files/POST_COVER_IMAGE (retry) → 200 with asset
      .mockImplementationOnce((url: string) => {
        if (url === "/files/POST_COVER_IMAGE") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(MOCK_ASSET),
          });
        }
        return Promise.reject(new Error("Unexpected call"));
      });

    render(
      <FileUploadWidget
        category="POST_COVER_IMAGE"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const file = new File(["image-data"], "cover.png", {
      type: "image/png",
    });
    const input = screen.getByTestId("file-upload-input");
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for the full 401→refresh→retry cycle to complete
    await waitFor(() => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    // Call 1: initial upload → 401
    expect(fetchMock.mock.calls[0]![0]).toBe("/files/POST_COVER_IMAGE");
    expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe("POST");
    const initialBody = (fetchMock.mock.calls[0]![1] as RequestInit)
      .body as FormData;
    expect(initialBody instanceof FormData).toBe(true);
    expect(initialBody.get("file")).toBe(file);

    // Call 2: refresh
    expect(fetchMock.mock.calls[1]![0]).toBe("/auth/refresh");
    expect((fetchMock.mock.calls[1]![1] as RequestInit).method).toBe("POST");

    // Call 3: retry — must preserve the same file in FormData body
    expect(fetchMock.mock.calls[2]![0]).toBe("/files/POST_COVER_IMAGE");
    expect((fetchMock.mock.calls[2]![1] as RequestInit).method).toBe("POST");
    const retryBody = (fetchMock.mock.calls[2]![1] as RequestInit)
      .body as FormData;
    expect(retryBody instanceof FormData).toBe(true);
    expect(retryBody.get("file")).toBe(file);

    // No Content-Type header on retry either
    expect(
      (fetchMock.mock.calls[2]![1] as RequestInit).headers,
    ).toBeUndefined();
  });

  // prettier-ignore
  it("invokes toast retry with the original File in a second FormData request", async () => { const errorToast = vi.spyOn(toast, "error"); globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_ASSET) }); render(<FileUploadWidget category="POST_COVER_IMAGE" fileId={null} onUploaded={vi.fn()} onRemove={vi.fn()} />); const file = new File(["image-data"], "cover.png", { type: "image/png" }); fireEvent.change(screen.getByTestId("file-upload-input"), { target: { files: [file] } }); await waitFor(() => expect(errorToast).toHaveBeenCalled()); const retry = (errorToast.mock.calls[0]![1] as unknown as { action: { onClick(): void } }).action.onClick; retry(); await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2)); const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>; expect(fetchMock).toHaveBeenNthCalledWith(2, "/files/POST_COVER_IMAGE", expect.objectContaining({ method: "POST", body: expect.any(FormData) })); const body = (fetchMock.mock.calls[1]![1] as RequestInit).body; expect(body).toBeInstanceOf(FormData); expect((body as FormData).get("file")).toBe(file); });
});
