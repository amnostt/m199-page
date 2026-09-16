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
import { useState } from "react";
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
  category: "PUBLICATION_FEATURED_IMAGE",
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
        category="PUBLICATION_FEATURED_IMAGE"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const input = screen.getByTestId("file-upload-input");
    expect(input).toBeTruthy();
    expect(input.tagName).toBe("INPUT");
    expect((input as HTMLInputElement).type).toBe("file");
    expect(screen.getByLabelText("Subir archivo")).toBe(input);
  });

  it("renders no remove button when fileId is null", () => {
    render(
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("file-upload-remove")).toBeNull();
  });

  it("shows the accepted image guidance and preview for an existing asset", () => {
    render(
      <FileUploadWidget
        category="OTHER"
        fileId="profile-1"
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
        preview
        previewAlt="Logotipo de la misión"
        description="Formatos: JPG, PNG, WebP o GIF. Tamaño máximo: 10 MB."
      />,
    );

    expect(screen.getByText(/Formatos: JPG, PNG, WebP o GIF/)).toBeTruthy();
    const preview = screen.getByTestId("file-upload-preview");
    expect(preview).toBeTruthy();
    expect(preview.getAttribute("data-state")).toBe("done");
    expect(
      screen.getByAltText("Logotipo de la misión").getAttribute("src"),
    ).toBe("/files/profile-1");
    const removeButtons = screen.getAllByRole("button", {
      name: "Quitar imagen",
    });
    expect(removeButtons).toHaveLength(1);
    const removeButton = removeButtons[0]!;
    expect(removeButton.getAttribute("data-slot")).toBe("attachment-action");
    const removeIcon = removeButton.querySelector("svg");
    expect(removeIcon).not.toBeNull();
    expect(removeIcon?.getAttribute("aria-hidden")).toBe("true");
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
        category="PUBLICATION_FEATURED_IMAGE"
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
    expect(postCall[0]).toBe("/files/PUBLICATION_FEATURED_IMAGE");

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
        category="PUBLICATION_FEATURED_IMAGE"
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
    expect(successToast).toHaveBeenCalledWith("Archivo cargado correctamente.", expect.anything());

    // Uploading state clears after success
    expect(screen.queryByTestId("file-upload-uploading")).toBeNull();
  });

  it("shows error state on upload failure", async () => {
    const errorToast = vi.spyOn(toast, "error");
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
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
    expect(errorToast).toHaveBeenCalledWith("No se pudo cargar el archivo.", expect.objectContaining({ description: "Error de red." }));

    // Uploading state clears after error
    expect(screen.queryByTestId("file-upload-uploading")).toBeNull();
  });

  it("reflects uploading and error states through the image attachment", async () => {
    let rejectUpload: ((reason?: unknown) => void) | undefined;
    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((_, reject) => {
          rejectUpload = reject;
        }),
    );

    render(
      <FileUploadWidget
        category="OTHER"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
        preview
      />,
    );

    const input = screen.getByTestId("file-upload-input");
    fireEvent.change(input, {
      target: {
        files: [new File(["x"], "profile.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("file-upload-preview")).toBeTruthy();
      expect(
        screen.getByTestId("file-upload-preview").getAttribute("data-state"),
      ).toBe("uploading");
    });
    rejectUpload?.(new Error("Network error"));
    await waitFor(() =>
      expect(screen.getByTestId("file-upload-preview")).toBeTruthy(),
    );
    expect(
      screen.getByTestId("file-upload-preview").getAttribute("data-state"),
    ).toBe("error");
    expect(
      screen.getByRole("button", { name: "Reintentar carga" }),
    ).toBeTruthy();
  });

  it("clears a failed filename when the current file id changes", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { rerender } = render(
      <FileUploadWidget
        category="OTHER"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
        preview
      />,
    );
    fireEvent.change(screen.getByTestId("file-upload-input"), {
      target: {
        files: [new File(["x"], "stale.png", { type: "image/png" })],
      },
    });

    await waitFor(() => expect(screen.getByText("stale.png")).toBeTruthy());
    rerender(
      <FileUploadWidget
        category="OTHER"
        fileId="current-file"
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
        preview
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("stale.png")).toBeNull();
      expect(
        screen.getByTestId("file-upload-preview").getAttribute("data-state"),
      ).toBe("done");
    });
    expect(
      screen.getByAltText("Vista previa del archivo").getAttribute("src"),
    ).toBe("/files/current-file");
  });

  it("shows error state on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    render(
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
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

  it("rejects unsupported MIME types before upload", async () => {
    const errorToast = vi.spyOn(toast, "error");
    globalThis.fetch = vi.fn();

    render(
      <FileUploadWidget
        category="OTHER"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("file-upload-input"), {
      target: {
        files: [new File(["pdf"], "profile.pdf", { type: "application/pdf" })],
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId("file-upload-error")).toBeTruthy(),
    );
    expect(errorToast).toHaveBeenCalledWith(
      "No se pudo cargar el archivo.",
      expect.objectContaining({
        description: expect.stringContaining("JPG, PNG, WebP o GIF"),
      }),
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects oversized files before upload", async () => {
    const errorToast = vi.spyOn(toast, "error");
    globalThis.fetch = vi.fn();

    render(
      <FileUploadWidget
        category="OTHER"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
        maxSizeBytes={1}
      />,
    );

    fireEvent.change(screen.getByTestId("file-upload-input"), {
      target: {
        files: [new File(["xx"], "profile.gif", { type: "image/gif" })],
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId("file-upload-error")).toBeTruthy(),
    );
    expect(errorToast).toHaveBeenCalledWith(
      "No se pudo cargar el archivo.",
      expect.objectContaining({
        description: expect.stringContaining("máximo"),
      }),
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("disables input while uploading", async () => {
    // Hung fetch keeps uploading state visible
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {}));

    render(
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
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
        category="PUBLICATION_FEATURED_IMAGE"
        fileId="existing-file-id"
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const removeBtn = screen.getByTestId("file-upload-remove");
    expect(removeBtn).toBeTruthy();
    expect(removeBtn.textContent).toMatch(/quitar/i);
  });

  it("keeps the current attachment visible while replacing it and reports the new asset", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_ASSET),
    });
    const onUploaded = vi.fn();

    const { rerender } = render(
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
        fileId="existing-file-id"
        onUploaded={onUploaded}
        onRemove={vi.fn()}
        preview
      />,
    );

    fireEvent.change(screen.getByTestId("file-upload-input"), {
      target: {
        files: [new File(["new"], "replacement.png", { type: "image/png" })],
      },
    });

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(MOCK_ASSET));
    expect(
      screen.getByAltText("Vista previa del archivo").getAttribute("src"),
    ).toBe("/files/existing-file-id");

    rerender(
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
        fileId={MOCK_ASSET.id}
        onUploaded={onUploaded}
        onRemove={vi.fn()}
        preview
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByAltText("Vista previa del archivo").getAttribute("src"),
      ).toBe("/files/asset-1"),
    );
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();

    render(
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
        fileId="existing-file-id"
        onUploaded={vi.fn()}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByTestId("file-upload-remove"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("does not render removal UI when onRemove is omitted", () => {
    render(
      <FileUploadWidget
        category="LANDING_HERO"
        fileId="existing-file-id"
        onUploaded={vi.fn()}
        preview
      />,
    );

    expect(screen.getByTestId("file-upload-preview")).toBeTruthy();
    expect(screen.queryByTestId("file-upload-remove")).toBeNull();
  });

  it("reports an intentional clear as the controlled empty value", () => {
    function ControlledUpload() {
      const [fileId, setFileId] = useState<string | null>("existing-file-id");

      return (
        <FileUploadWidget
          category="PUBLICATION_FEATURED_IMAGE"
          fileId={fileId}
          onUploaded={vi.fn()}
          onRemove={() => setFileId(null)}
          preview
        />
      );
    }

    render(<ControlledUpload />);

    fireEvent.click(screen.getByTestId("file-upload-remove"));

    expect(screen.queryByTestId("file-upload-preview")).toBeNull();
  });
});

// =========================================================================
// Canonical primitives and reset
// =========================================================================

describe("FileUploadWidget — canonical primitives and reset", () => {
  it("uses canonical Input and Button data-slot markers", () => {
    render(
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
        fileId="existing-file-id"
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId("file-upload-input").getAttribute("data-slot"),
    ).toBe("input");
    expect(
      screen.getByTestId("file-upload-remove").getAttribute("data-slot"),
    ).toBe("button");
  });

  it("resets the file input value after a successful upload", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_ASSET),
    });

    render(
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const input = screen.getByTestId("file-upload-input") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "c.png", { type: "image/png" })] },
    });

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("renders the retry button as canonical Button after an error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
        fileId={null}
        onUploaded={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("file-upload-input"), {
      target: { files: [new File(["x"], "c.png", { type: "image/png" })] },
    });

    await waitFor(() => {
      expect(screen.getByTestId("file-upload-error")).toBeTruthy();
    });

    expect(
      screen.getByText(/reintentar carga/i).getAttribute("data-slot"),
    ).toBe("button");
  });
});

// =========================================================================
// 401-retry-FormData test
// =========================================================================

describe("FileUploadWidget — 401 retry with FormData", () => {
  it("re-sends the File in the retry body after adminFetch 401→refresh→retry", async () => {
    globalThis.fetch = vi
      .fn()
      // Call 1: POST /files/PUBLICATION_FEATURED_IMAGE → 401
      .mockImplementationOnce((url: string) => {
        if (url === "/files/PUBLICATION_FEATURED_IMAGE") {
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
      // Call 3: POST /files/PUBLICATION_FEATURED_IMAGE (retry) → 200 with asset
      .mockImplementationOnce((url: string) => {
        if (url === "/files/PUBLICATION_FEATURED_IMAGE") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(MOCK_ASSET),
          });
        }
        return Promise.reject(new Error("Unexpected call"));
      });

    render(
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
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
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "/files/PUBLICATION_FEATURED_IMAGE",
    );
    expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe("POST");
    const initialBody = (fetchMock.mock.calls[0]![1] as RequestInit)
      .body as FormData;
    expect(initialBody instanceof FormData).toBe(true);
    expect(initialBody.get("file")).toBe(file);

    // Call 2: refresh
    expect(fetchMock.mock.calls[1]![0]).toBe("/auth/refresh");
    expect((fetchMock.mock.calls[1]![1] as RequestInit).method).toBe("POST");

    // Call 3: retry — must preserve the same file in FormData body
    expect(fetchMock.mock.calls[2]![0]).toBe(
      "/files/PUBLICATION_FEATURED_IMAGE",
    );
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
  it("invokes toast retry with the original File in a second FormData request", async () => { const errorToast = vi.spyOn(toast, "error"); globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_ASSET) }); render(<FileUploadWidget category="PUBLICATION_FEATURED_IMAGE" fileId={null} onUploaded={vi.fn()} onRemove={vi.fn()} />); const file = new File(["image-data"], "cover.png", { type: "image/png" }); fireEvent.change(screen.getByTestId("file-upload-input"), { target: { files: [file] } }); await waitFor(() => expect(errorToast).toHaveBeenCalled()); const retry = (errorToast.mock.calls[0]![1] as unknown as { action: { onClick(): void } }).action.onClick; retry(); await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2)); const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>; expect(fetchMock).toHaveBeenNthCalledWith(2, "/files/PUBLICATION_FEATURED_IMAGE", expect.objectContaining({ method: "POST", body: expect.any(FormData) })); const body = (fetchMock.mock.calls[1]![1] as RequestInit).body; expect(body).toBeInstanceOf(FormData); expect((body as FormData).get("file")).toBe(file); });
});
