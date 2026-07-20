// ---------------------------------------------------------------------------
// Admin type contracts — mirrors API response fields used by the admin web.
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export type ResponsibleStatus = "ACTIVE" | "INACTIVE";

export interface Responsible {
  id: string;
  email: string;
  displayName: string;
  status: ResponsibleStatus;
}

export interface CreateResponsibleInput {
  email: string;
  displayName: string;
  password: string;
}

export type VerseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface VerseAdmin {
  id: string;
  text: string;
  reference: string;
  date: string;
  publishedAt: string | null;
  status: VerseStatus;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVerseInput {
  text: string;
  reference: string;
}

/** LP-01 base landing settings fields used by the admin editor. */
export interface LandingSettings {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageId: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  featuredOutingId?: string | null;
}

/** Normalized form values — every field is a non-null string. */
export interface LandingSettingsForm {
  heroTitle: string;
  heroSubtitle: string;
  heroImageId: string | null;
  mission: string;
  vision: string;
  description: string;
  featuredVideoUrl: string;
  contactEmail: string;
  contactPhone: string;
}

// ---------------------------------------------------------------------------
// Posts admin types — mirrors API response shapes
// ---------------------------------------------------------------------------

export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface PostDownload {
  id: string;
  fileId: string;
  label: string | null;
  sortOrder: number;
}

export interface PostListItem {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  coverImageId: string | null;
  publishedAt: string | null;
}

export interface Post extends PostListItem {
  description: string;
  content: string;
  tags: string[];
  downloads: PostDownload[];
}

export interface PostForm {
  title: string;
  slug: string;
  content: string;
  description: string;
  tagsInput: string;
  coverImageId: string | null;
  downloadIds: string[];
}

export interface FileAssetResponse {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileSize: number;
  originalFilename: string;
  category: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Outings admin types — mirrors OutingsAdminController / OutingsService row
// shape. Public OutingResponse projection is intentionally NOT reused here:
// the admin row carries IDs, not URLs, and the admin lifecycle writes the
// status field (PUBLIC always reports "PUBLISHED").
// ---------------------------------------------------------------------------

export type OutingStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Admin-only outing row returned by GET/POST/PATCH /outings/admin and the
 *  archive endpoint. Asset references are file IDs, not URLs — the form
 *  renders previews via /files/{id} and the FileUploadWidget manages IDs. */
export interface OutingAdmin {
  id: string;
  slug: string;
  title: string;
  dateTime: string;
  location: string;
  description: string;
  status: OutingStatus;
  mainImageId: string | null;
  croquisId: string | null;
  planId: string | null;
}

/** Form state for create/edit. dateTime uses the HTML datetime-local format
 *  (YYYY-MM-DDTHH:mm) so it can bind to <input type="datetime-local">; the
 *  buildOutingPayload helper converts to ISO UTC before sending. */
export interface OutingForm {
  title: string;
  slug: string;
  dateTime: string;
  location: string;
  description: string;
  mainImageId: string | null;
  croquisId: string | null;
  planId: string | null;
  status: OutingStatus;
}

/** Alias kept for design parity (OutingMutation == OutingForm in this slice —
 *  every field is editable on create and on update). */
export type OutingMutation = OutingForm;
