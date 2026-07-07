// ---------------------------------------------------------------------------
// Admin type contracts — mirrors API response fields used by the admin web.
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface LandingSettings {
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}
