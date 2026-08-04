// ---------------------------------------------------------------------------
// FileUploadWidget — single-file upload widget
//
// Props:
//   category    — file-module category to POST to (e.g. POST_COVER_IMAGE)
//   fileId      — current file id (null = no file selected)
//   onUploaded  — called with FileAssetResponse after successful upload
//   onRemove    — called when user clicks remove
//   data-testid — forwarded to root element for parent integration testing
//
// State machine: "idle" → (file selected) → "uploading" → "idle" | "error"
//
// Upload builds FormData with "file" key, calls adminFetch without
// Content-Type header (browser sets multipart boundary).
// 401 → refresh → retry handled transparently by adminFetch.
// ---------------------------------------------------------------------------

import { useState, type ChangeEvent } from "react";
import { adminFetch } from "./session.js";
import type { FileAssetResponse } from "./adminTypes.js";
import { useAdminToast } from "./AdminProviders.js";
import { mapAdminError } from "./adminErrors.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileUploadWidgetProps {
  category: string;
  fileId: string | null;
  onUploaded: (asset: FileAssetResponse) => void;
  onRemove: () => void;
  "data-testid"?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileUploadWidget({
  category,
  fileId,
  onUploaded,
  onRemove,
  "data-testid": dataTestId,
}: FileUploadWidgetProps) {
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [lastFile, setLastFile] = useState<File | null>(null);
  const toast = useAdminToast();

  const upload = async (file: File) => {
    setState("uploading");
    setLastFile(file);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const asset = await adminFetch<FileAssetResponse>(`/files/${category}`, {
        method: "POST",
        body: formData,
      });
      setState("idle");
      setLastFile(null);
      toast.success("Archivo cargado correctamente.");
      onUploaded(asset);
    } catch (error) {
      setState("error");
      // prettier-ignore
      const description = mapAdminError(error).root;
      toast.error("No se pudo cargar el archivo.", {
        description,
        retry: () => void upload(file),
      });
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await upload(file);

    // Reset the input value so the same file can be re-uploaded
    e.target.value = "";
  };

  // prettier-ignore
  return (
    <div data-testid={dataTestId}>
      <Input
        type="file"
        data-testid="file-upload-input"
         aria-label="Subir archivo"
        onChange={handleFileChange}
        disabled={state === "uploading"}
      />

      {state === "uploading" && (
         <span data-testid="file-upload-uploading" role="status" aria-live="polite">Cargando…</span>
      )}

      {state === "error" && (
         <span data-testid="file-upload-error" role="alert">No se pudo cargar el archivo.</span>
      )}

      {state === "error" && lastFile && (
         <Button type="button" onClick={() => void upload(lastFile)}>Reintentar carga</Button>
      )}

      {fileId && (
        <Button
          type="button"
          data-testid="file-upload-remove"
          onClick={onRemove}
          disabled={state === "uploading"}
        >
          Quitar
        </Button>
      )}
    </div>
  );
}
