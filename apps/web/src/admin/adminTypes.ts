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

export type MissionStatus = "ACTIVE" | "ARCHIVED";

export type PublicationStatus = "DRAFT" | "PUBLISHED";
export type PublicationType = "POST" | "OUTING" | "EVENT";
export type PublicationScope = "GENERAL" | "MISSION";
export type ActivityStatus = "UPCOMING" | "COMPLETED" | "CANCELLED";
export type DocumentationStatus = "PENDING_DOCUMENTATION" | "DOCUMENTED";
export interface PublicationAdmin {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImageId: string | null;
  type: PublicationType;
  status: PublicationStatus;
  scope: PublicationScope;
  publishedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  activityStatus: ActivityStatus | null;
  documentationStatus: DocumentationStatus | null;
  missionIds: string[];
  createdAt: string;
  updatedAt: string;
}
export interface CreatePublicationInput {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImageId: string;
  type: PublicationType;
  status?: PublicationStatus;
  scope?: PublicationScope;
  missionIds?: string[];
  startDate?: string | null;
  endDate?: string | null;
  activityStatus?: ActivityStatus | null;
  documentationStatus?: DocumentationStatus | null;
}
export type UpdatePublicationInput = Partial<CreatePublicationInput> & {
  confirmTypeChange?: boolean;
};

export interface MissionAdmin {
  id: string;
  slug: string;
  title: string;
  heroImageId: string;
  heroPhrase: string;
  status: MissionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMissionInput {
  title: string;
  slug: string;
  heroImageId: string;
  heroPhrase: string;
}

export type UpdateMissionInput = Partial<CreateMissionInput>;

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
  verseText: string | null;
  verseReference: string | null;
}

/** Normalized form values — every field is a non-null string. */
export interface LandingSettingsForm {
  heroTitle: string;
  heroSubtitle: string;
  heroImageId: string | null;
  description: string;
  featuredVideoUrl: string;
  contactEmail: string;
  contactPhone: string;
  verseText: string;
  verseReference: string;
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
