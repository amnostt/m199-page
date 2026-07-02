/**
 * FileCategory constants and MIME validation (FU-05).
 *
 * Defines the FileCategory enum (from schema), MIME type allowlists,
 * and the isAllowedMime() guard used by FileService.upload().
 */
import { FileCategory } from "@prisma/client";

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const DOC_MIMES = [...IMAGE_MIMES, "application/pdf"] as const;

const IMAGE_CATS = new Set<FileCategory>([
  FileCategory.OUTING_MAIN_IMAGE,
  FileCategory.POST_COVER_IMAGE,
  FileCategory.LANDING_HERO,
  FileCategory.OTHER,
]);

/**
 * Returns true when the MIME type is allowed for the given FileCategory.
 * - Image categories: only image/*
 * - Document categories: image/* + application/pdf
 */
function isAllowedMime(c: FileCategory, m: string): boolean {
  return (IMAGE_CATS.has(c) ? IMAGE_MIMES : DOC_MIMES).includes(
    m as (typeof IMAGE_MIMES)[number],
  );
}

function isFileCategory(value: string): value is FileCategory {
  return Object.values(FileCategory).includes(value as FileCategory);
}

export {
  FileCategory,
  IMAGE_MIMES,
  DOC_MIMES,
  IMAGE_CATS,
  isAllowedMime,
  isFileCategory,
};
