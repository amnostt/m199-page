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
