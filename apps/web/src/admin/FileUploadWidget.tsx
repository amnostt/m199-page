// ---------------------------------------------------------------------------
// FileUploadWidget — single-file upload widget
//
// Props:
//   category    — file-module category to POST to (e.g. POST_COVER_IMAGE)
//   fileId      — current file id (null = no file selected)
//   onUploaded  — called with FileAssetResponse after successful upload
//   onRemove    — optional callback called when user clicks remove
//   data-testid — forwarded to root element for parent integration testing
//
// State machine: "idle" → (file selected) → "uploading" → "idle" | "error"
//
// Upload builds FormData with "file" key, calls adminFetch without
// Content-Type header (browser sets multipart boundary).
// 401 → refresh → retry handled transparently by adminFetch.
// ---------------------------------------------------------------------------

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { adminFetch } from "./session.js";
import type { FileAssetResponse } from "./adminTypes.js";
import { useAdminToast } from "./AdminProviders.js";
import { mapAdminError } from "./adminErrors.js";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ImageIcon, Music2Icon, RotateCcwIcon, XIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileUploadWidgetProps {
  category: string;
  fileId: string | null;
  onUploaded: (asset: FileAssetResponse) => void;
  onRemove?: () => void;
  accept?: string;
  acceptedFormats?: string;
  maxSizeBytes?: number;
  preview?: boolean;
  previewAlt?: string;
  previewVariant?: "logo" | "hero" | "audio";
  fileLabel?: string;
  inputLabel?: string;
  description?: string;
  "data-testid"?: string;
}

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function isAcceptedMime(mimeType: string, accept: string): boolean {
  return accept.split(",").some((pattern) => {
    const normalized = pattern.trim().toLowerCase();
    return normalized.endsWith("/*")
      ? mimeType.toLowerCase().startsWith(normalized.slice(0, -1))
      : mimeType.toLowerCase() === normalized;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileUploadWidget({
  category,
  fileId,
  onUploaded,
  onRemove,
  accept = DEFAULT_ACCEPT,
  acceptedFormats = "JPG, PNG, WebP o GIF",
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  preview = false,
  previewAlt = "Vista previa del archivo",
  previewVariant = "logo",
  fileLabel = "imagen",
  inputLabel = "archivo",
  description,
  "data-testid": dataTestId,
}: FileUploadWidgetProps) {
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [lastFile, setLastFile] = useState<File | null>(null);
  const previousFileId = useRef(fileId);
  const toast = useAdminToast();
  const descriptionId = useId();

  useEffect(() => {
    if (previousFileId.current === fileId) return;
    previousFileId.current = fileId;
    setState("idle");
    setLastFile(null);
  }, [fileId]);

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
    if (!isAcceptedMime(file.type, accept)) {
      setState("error");
      setLastFile(null);
      toast.error("No se pudo cargar el archivo.", {
        description: `Usa uno de estos formatos: ${acceptedFormats}.`,
      });
      e.target.value = "";
      return;
    }
    if (file.size > maxSizeBytes) {
      setState("error");
      setLastFile(null);
      toast.error("No se pudo cargar el archivo.", {
        description: `El archivo supera el máximo de ${formatFileSize(maxSizeBytes)}.`,
      });
      e.target.value = "";
      return;
    }
    await upload(file);

    // Reset the input value so the same file can be re-uploaded
    e.target.value = "";
  };

  const handleRemove = () => {
    if (!onRemove || state === "uploading") return;
    setState("idle");
    setLastFile(null);
    onRemove();
  };

  const hasAttachment = preview && Boolean(fileId || lastFile);
  const attachmentState =
    fileId || lastFile
      ? state === "idle" && fileId
        ? "done"
        : state
      : undefined;
  const attachmentTitle =
    state !== "idle" && lastFile
      ? lastFile.name
      : `${fileLabel[0]?.toUpperCase() ?? ""}${fileLabel.slice(1)} actual`;
  const errorFileLabel = fileLabel === "imagen" ? "archivo" : fileLabel;
  const attachmentDescription =
    state === "uploading"
      ? `Cargando ${fileLabel}…`
      : state === "error"
        ? `No se pudo cargar el ${errorFileLabel}.`
        : previewVariant === "audio"
          ? "MP3 configurado y listo para guardar."
          : `${fileLabel[0]?.toUpperCase() ?? ""}${fileLabel.slice(1)} cargada y lista para guardar.`;

  // prettier-ignore
  return (
    <div data-testid={dataTestId}>
      {hasAttachment && (
        <Attachment
          state={attachmentState}
          className={cn(
            "mb-3 w-full",
            previewVariant === "hero" && "sm:max-w-xl",
          )}
          data-testid="file-upload-preview"
        >
          <AttachmentMedia
            variant={previewVariant === "audio" ? "icon" : "image"}
            className={cn(
              previewVariant !== "audio" && "[&>img]:!object-contain",
              previewVariant === "hero" &&
                "!aspect-[16/9] !w-40 sm:!w-56",
            )}
          >
            {previewVariant === "audio" ? (
              <Music2Icon aria-hidden="true" />
            ) : fileId ? (
              <img
                src={`/files/${fileId}`}
                alt={previewAlt}
                className="h-full w-full !object-contain"
              />
            ) : (
              <ImageIcon aria-hidden="true" />
            )}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{attachmentTitle}</AttachmentTitle>
            <AttachmentDescription>
              {attachmentDescription}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            {state === "error" && lastFile && (
              <AttachmentAction
                type="button"
                aria-label="Reintentar carga"
                data-testid="file-upload-retry"
                onClick={() => void upload(lastFile)}
              >
                <RotateCcwIcon aria-hidden="true" />
              </AttachmentAction>
            )}
            {fileId && onRemove && (
              <AttachmentAction
                type="button"
                aria-label={`Quitar ${fileLabel}`}
                data-testid="file-upload-remove"
                onClick={handleRemove}
                disabled={state === "uploading"}
              >
                <XIcon aria-hidden="true" />
              </AttachmentAction>
            )}
          </AttachmentActions>
        </Attachment>
      )}
      <Input
        type="file"
        data-testid="file-upload-input"
        accept={accept}
        aria-describedby={descriptionId}
        aria-label={`Subir ${inputLabel}`}
        onChange={handleFileChange}
        disabled={state === "uploading"}
      />

      <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
        {description ??
          `Formatos: ${acceptedFormats}. Tamaño máximo: ${formatFileSize(maxSizeBytes)}.`}
      </p>

      {state === "uploading" && (
        <span
          data-testid="file-upload-uploading"
          role="status"
          aria-live="polite"
        >
          Cargando…
        </span>
      )}

      {state === "error" && (
        <span data-testid="file-upload-error" role="alert">
          No se pudo cargar el {errorFileLabel}.
        </span>
      )}

      {!preview && state === "error" && lastFile && (
        <Button type="button" onClick={() => void upload(lastFile)}>
          Reintentar carga
        </Button>
      )}

      {fileId && !preview && onRemove && (
        <Button
          type="button"
          data-testid="file-upload-remove"
          onClick={handleRemove}
          disabled={state === "uploading"}
        >
          Quitar
        </Button>
      )}
    </div>
  );
}
