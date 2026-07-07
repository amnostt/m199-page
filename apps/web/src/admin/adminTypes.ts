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
