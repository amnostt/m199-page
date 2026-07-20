// ---------------------------------------------------------------------------
// LandingSettingsPage — LP-01 base field editor
//
// - GET /landing/admin on mount via adminFetch
// - Normalizes null response to empty string form values
// - Editable form for mission, vision, description, featuredVideoUrl,
//   contactEmail, contactPhone
// - window.confirm gate before every PUT /landing/admin save
// - Loading, error, and success states
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { FileUploadWidget } from "./FileUploadWidget.js";
import type { LandingSettings, LandingSettingsForm } from "./adminTypes.js";
import { adminFetch } from "./session.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY: LandingSettingsForm = {
  heroTitle: "",
  heroSubtitle: "",
  heroImageId: null,
  mission: "",
  vision: "",
  description: "",
  featuredVideoUrl: "",
  contactEmail: "",
  contactPhone: "",
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Normalize an API response (which may be null or have null fields) into
 * a LandingSettings value where every field is a non-null string.
 */
export function normalizeLandingSettings(
  data: LandingSettings | null,
): LandingSettingsForm {
  if (!data) return { ...EMPTY };
  return {
    heroTitle: data.heroTitle ?? "",
    heroSubtitle: data.heroSubtitle ?? "",
    heroImageId: data.heroImageId,
    mission: data.mission ?? "",
    vision: data.vision ?? "",
    description: data.description ?? "",
    featuredVideoUrl: data.featuredVideoUrl ?? "",
    contactEmail: data.contactEmail ?? "",
    contactPhone: data.contactPhone ?? "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LandingSettingsPage() {
  const [settings, setSettings] = useState<LandingSettingsForm | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    adminFetch<LandingSettings | null>("/landing/admin")
      .then((data) => {
        if (!cancelled) setSettings(normalizeLandingSettings(data));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleChange = (
    field: Exclude<keyof LandingSettingsForm, "heroImageId">,
    value: string,
  ) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null));
    setSaveError(false);
    setSaveSuccess(false);
  };

  const handleHeroUploaded = (asset: { id: string }) => {
    setSettings((prev) => (prev ? { ...prev, heroImageId: asset.id } : null));
    setSaveError(false);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!settings || saving) return;
    if (!window.confirm("Save Landing Settings changes?")) return;

    setSaving(true);
    setSaveError(false);
    setSaveSuccess(false);

    try {
      const { heroImageId, ...copySettings } = settings;
      await adminFetch("/landing/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...copySettings,
          ...(heroImageId ? { heroImageId } : {}),
        }),
      });
      setSaveSuccess(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------
  // States
  // ------------------------------------------------------------------

  // Load error
  if (loadError) {
    return (
      <div data-testid="landing-settings-load-error">
        <p>Failed to load landing settings.</p>
      </div>
    );
  }

  // Loading (settings not yet available)
  if (!settings) {
    return (
      <div data-testid="landing-settings-loading">
        <p>Loading…</p>
      </div>
    );
  }

  // Loaded — render editable form
  return (
    <div data-testid="landing-settings-form">
      <h2>Landing Settings</h2>

      <fieldset>
        <legend>Hero</legend>
        <label htmlFor="ls-hero-title">Hero Title</label>
        <input
          id="ls-hero-title"
          type="text"
          value={settings.heroTitle}
          onChange={(e) => handleChange("heroTitle", e.target.value)}
          disabled={saving}
        />

        <label htmlFor="ls-hero-subtitle">Hero Subtitle</label>
        <textarea
          id="ls-hero-subtitle"
          value={settings.heroSubtitle}
          onChange={(e) => handleChange("heroSubtitle", e.target.value)}
          disabled={saving}
        />

        {settings.heroImageId && (
          <a
            href={`/files/${settings.heroImageId}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="landing-hero-asset-link"
          >
            {settings.heroImageId}
          </a>
        )}
        <FileUploadWidget
          category="LANDING_HERO"
          fileId={null}
          onUploaded={handleHeroUploaded}
          onRemove={() => {
            /* no removal control — disassociation is out of scope */
          }}
          data-testid="landing-hero-upload-widget"
        />
      </fieldset>

      <label htmlFor="ls-mission">Mission</label>
      <textarea
        id="ls-mission"
        value={settings.mission}
        onChange={(e) => handleChange("mission", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="ls-vision">Vision</label>
      <textarea
        id="ls-vision"
        value={settings.vision}
        onChange={(e) => handleChange("vision", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="ls-description">Description</label>
      <textarea
        id="ls-description"
        value={settings.description}
        onChange={(e) => handleChange("description", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="ls-video">Featured Video URL</label>
      <input
        id="ls-video"
        type="url"
        value={settings.featuredVideoUrl}
        onChange={(e) => handleChange("featuredVideoUrl", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="ls-email">Contact Email</label>
      <input
        id="ls-email"
        type="email"
        value={settings.contactEmail}
        onChange={(e) => handleChange("contactEmail", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="ls-phone">Contact Phone</label>
      <input
        id="ls-phone"
        type="tel"
        value={settings.contactPhone}
        onChange={(e) => handleChange("contactPhone", e.target.value)}
        disabled={saving}
      />

      <button type="button" onClick={handleSave} disabled={saving}>
        Save Settings
      </button>

      {saveSuccess && (
        <div data-testid="landing-settings-save-success">
          Settings saved successfully.
        </div>
      )}

      {saveError && (
        <div data-testid="landing-settings-save-error">
          Failed to save settings. Please try again.
        </div>
      )}
    </div>
  );
}
