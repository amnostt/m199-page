// ---------------------------------------------------------------------------
// LandingSettingsPage — LP-01 base field editor
//
// - GET /landing/admin on mount via adminFetch
// - Normalizes null response to empty string form values
// - Editable form for mission, vision, description, featuredVideoUrl,
//   contactEmail, contactPhone
// - window.confirm gate before every PUT /landing/admin save
// - Loading, error, and success states
//
// WU3 / Slice 1 — the legacy featured-outing wiring was removed. The
// admin no longer issues `/outings/admin?status=PUBLISHED` lookups,
// no longer calls `featureOuting`/`clearFeaturedOuting`, and no longer
// carries `featuredOutingId` on the editor state. The featured-posts
// slots were already removed in earlier work.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { FileUploadWidget } from "./FileUploadWidget.js";
import type { LandingSettings, LandingSettingsForm } from "./adminTypes.js";
import { adminFetch } from "./session.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent } from "../components/ui/card.js";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "../components/ui/field.js";
import { Input } from "../components/ui/input.js";
import { Textarea } from "../components/ui/textarea.js";

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
    if (
      !window.confirm(
        "¿Guardar los cambios de la configuración de la página de inicio?",
      )
    )
      return;

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
      <div
        className="mx-auto w-full max-w-3xl"
        data-testid="landing-settings-load-error"
      >
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar la configuración de la página de inicio.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading (settings not yet available)
  if (!settings) {
    return (
      <div
        className="mx-auto w-full max-w-3xl"
        data-testid="landing-settings-loading"
        role="status"
        aria-live="polite"
      >
        Cargando…
      </div>
    );
  }

  // Loaded — render editable form
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6"
      data-testid="landing-settings-form"
    >
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          Configuración de la página de inicio
        </h2>
        <p className="text-sm text-muted-foreground">
          Editá el contenido que se muestra en la landing pública.
        </p>
      </header>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
        aria-busy={saving}
      >
        <div className="flex flex-col gap-6">
          <Card className="shadow-none">
            <CardContent className="pt-6">
              <FieldSet>
                <FieldLegend>Encabezado principal</FieldLegend>
                <FieldDescription>
                  Presentá la misión desde el primer vistazo de la landing.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="ls-hero-title">
                      Título principal
                    </FieldLabel>
                    <Input
                      id="ls-hero-title"
                      type="text"
                      className="min-h-10"
                      value={settings.heroTitle}
                      onChange={(e) =>
                        handleChange("heroTitle", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ls-hero-subtitle">
                      Subtítulo principal
                    </FieldLabel>
                    <Textarea
                      id="ls-hero-subtitle"
                      value={settings.heroSubtitle}
                      onChange={(e) =>
                        handleChange("heroSubtitle", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
                  <Field>
                    <FieldTitle>Imagen principal</FieldTitle>
                    {settings.heroImageId && (
                      <FieldDescription>
                        Archivo actual:{" "}
                        <a
                          className="underline underline-offset-4 hover:text-primary"
                          href={`/files/${settings.heroImageId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="landing-hero-asset-link"
                        >
                          {settings.heroImageId}
                        </a>
                      </FieldDescription>
                    )}
                    <FileUploadWidget
                      category="LANDING_HERO"
                      fileId={null}
                      onUploaded={handleHeroUploaded}
                      onRemove={() => {
                        /* disassociation is out of scope */
                      }}
                      data-testid="landing-hero-upload-widget"
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="pt-6">
              <FieldSet>
                <FieldLegend>Contenido institucional</FieldLegend>
                <FieldDescription>
                  Estos textos alimentan las secciones institucionales de la
                  landing.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="ls-mission">Misión</FieldLabel>
                    <Textarea
                      id="ls-mission"
                      value={settings.mission}
                      onChange={(e) => handleChange("mission", e.target.value)}
                      disabled={saving}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ls-vision">Visión</FieldLabel>
                    <Textarea
                      id="ls-vision"
                      value={settings.vision}
                      onChange={(e) => handleChange("vision", e.target.value)}
                      disabled={saving}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ls-description">
                      Descripción
                    </FieldLabel>
                    <Textarea
                      id="ls-description"
                      value={settings.description}
                      onChange={(e) =>
                        handleChange("description", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ls-video">
                      URL del video destacado
                    </FieldLabel>
                    <Input
                      id="ls-video"
                      type="url"
                      className="min-h-10"
                      value={settings.featuredVideoUrl}
                      onChange={(e) =>
                        handleChange("featuredVideoUrl", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="pt-6">
              <FieldSet>
                <FieldLegend>Contacto</FieldLegend>
                <FieldDescription>
                  Estos datos se muestran como acciones de contacto en la
                  landing pública.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="ls-email">
                      Correo electrónico de contacto
                    </FieldLabel>
                    <Input
                      id="ls-email"
                      type="email"
                      autoComplete="email"
                      className="min-h-10"
                      value={settings.contactEmail}
                      onChange={(e) =>
                        handleChange("contactEmail", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ls-phone">
                      Teléfono de contacto
                    </FieldLabel>
                    <Input
                      id="ls-phone"
                      type="tel"
                      autoComplete="tel"
                      className="min-h-10"
                      value={settings.contactPhone}
                      onChange={(e) =>
                        handleChange("contactPhone", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="submit"
              className="min-h-11"
              disabled={saving}
              aria-busy={saving}
            >
              Guardar configuración
            </Button>
            {saving && (
              <span
                role="status"
                aria-live="polite"
                className="text-sm text-muted-foreground"
              >
                Guardando cambios…
              </span>
            )}
          </div>
          {saveSuccess && (
            <p
              className="text-sm text-foreground"
              data-testid="landing-settings-save-success"
              role="status"
            >
              Configuración guardada correctamente.
            </p>
          )}
          {saveError && (
            <Alert
              data-testid="landing-settings-save-error"
              variant="destructive"
            >
              <AlertDescription>
                No se pudo guardar la configuración. Intenta de nuevo.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </form>
    </div>
  );
}
