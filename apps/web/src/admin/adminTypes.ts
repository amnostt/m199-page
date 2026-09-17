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
export interface PublicationAdmin {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  imageIds: string[];
  type: PublicationType;
  status: PublicationStatus;
  scope: PublicationScope;
  publishedAt: string | null;
  activityDate: string | null;
  missionIds: string[];
  createdAt: string;
  updatedAt: string;
}
export interface CreatePublicationInput {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  imageIds: string[];
  type: PublicationType;
  status?: PublicationStatus;
  scope?: PublicationScope;
  missionIds?: string[];
  activityDate?: string | null;
}
export type UpdatePublicationInput = Partial<CreatePublicationInput> & {
  confirmTypeChange?: boolean;
};

export interface MissionAdmin {
  id: string;
  slug: string;
  title: string;
  heroImageId: string;
  profileImageId: string | null;
  heroPhrase: string;
  status: MissionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMissionInput {
  title: string;
  slug: string;
  heroImageId: string;
  profileImageId?: string | null;
  heroPhrase: string;
}

export type UpdateMissionInput = Partial<CreateMissionInput>;

/** LP-01 base landing settings fields used by the admin editor. */
export interface LandingSettings {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageId: string | null;
  missionsTitle: string | null;
  missionsDescription: string | null;
  publicationsTitle: string | null;
  publicationsDescription: string | null;
  aboutTitle: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoId: string | null;
  contactTitle: string | null;
  contactDescription: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  verseText: string | null;
  verseReference: string | null;
  visualBreakImageId: string | null;
}

/** Normalized form values — every field is a non-null string. */
export interface LandingSettingsForm {
  heroTitle: string;
  heroSubtitle: string;
  heroImageId: string | null;
  missionsTitle: string;
  missionsDescription: string;
  publicationsTitle: string;
  publicationsDescription: string;
  aboutTitle: string;
  description: string;
  featuredVideoId: string | null;
  contactTitle: string;
  contactDescription: string;
  contactEmail: string;
  contactPhone: string;
  verseText: string;
  verseReference: string;
  visualBreakImageId: string | null;
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
