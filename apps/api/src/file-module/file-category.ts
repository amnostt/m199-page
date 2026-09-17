/**
 * FileCategory constants and MIME validation (FU-05, file-categories spec).
 *
 * Defines the FileCategory enum (from schema), MIME type allowlists,
 * and the isAllowedMime() guard used by FileService.upload().
 *
 * The approved vocabulary is the Mission/Publication domain reset
 * subset: MISSION_HERO, PUBLICATION_FEATURED_IMAGE, PUBLICATION_DOWNLOAD,
 * LANDING_HERO, LANDING_VISUAL_BREAK, OTHER. Legacy POST_/OUTING_-only values are not
 * representable in the regenerated Prisma enum.
 */
import { FileCategory } from "@prisma/client";

const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const DOC_MIMES = [...IMAGE_MIMES, "application/pdf"] as const;

/**
 * Image-only categories — Mission hero, Publication featured image,
 * Landing hero, visual break, and Other. PUBLICATION_DOWNLOAD is a document
 * category (allows image/* + application/pdf).
 */
const IMAGE_CATS = new Set<FileCategory>([
  FileCategory.MISSION_HERO,
  FileCategory.PUBLICATION_FEATURED_IMAGE,
  FileCategory.LANDING_HERO,
  FileCategory.LANDING_VISUAL_BREAK,
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
