// ---------------------------------------------------------------------------
// Admin type contracts — mirrors API response fields used by the admin web.
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

/** LP-01 base landing settings fields used by the admin editor. */
export interface LandingSettings {
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

/** Normalized form values — every field is a non-null string. */
export interface LandingSettingsForm {
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
  status: PostStatus;
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
