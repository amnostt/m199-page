// ---------------------------------------------------------------------------
// Admin type contracts — mirrors API response fields used by the admin web.
//
// LandingSettings will be (re-)added in PR 2 alongside the
// LandingSettingsPage editor form. It is intentionally absent from PR 1
// because no code in this slice references it yet.
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}
