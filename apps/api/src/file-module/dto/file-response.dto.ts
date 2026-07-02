/**
 * FileAsset response DTO (FU-02, FU-03).
 *
 * Never exposes storagePath or storageProvider — these are internal.
 * url and thumbnailUrl are the public-facing GET paths.
 */
import { FileCategory } from "@prisma/client";

export interface FileAssetResponse {
  /** Unique file identifier. */
  id: string;
  /** Public GET path for the original file, e.g. "/files/<id>". */
  url: string;
  /** Public GET path for the thumbnail, e.g. "/files/<id>/thumb", or null. */
  thumbnailUrl: string | null;
  /** MIME type, e.g. "image/jpeg", "application/pdf". */
  mimeType: string;
  /** File size in bytes. */
  fileSize: number;
  /** Original filename as uploaded by the client. */
  originalFilename: string;
  /** FileCategory at time of upload. */
  category: FileCategory;
  /** ISO timestamp of upload. */
  createdAt: string;
}
