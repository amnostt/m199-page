// ---------------------------------------------------------------------------
// LandingSettingsPage — LP-01 base field editor
//
// - GET /landing/admin on mount via adminFetch
// - Normalizes null response to empty string form values
// - Editable form for active landing fields
// - shadcn AlertDialog gate before every PUT /landing/admin save
// - Persistent loading errors and Sonner mutation feedback
//
// WU3 / Slice 1 — the legacy featured-outing wiring was removed. The
// admin no longer issues `/outings/admin?status=PUBLISHED` lookups,
// no longer calls `featureOuting`/`clearFeaturedOuting`, and no longer
// carries `featuredOutingId` on the editor state. The featured-posts
// slots were already removed in earlier work.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { FileUploadWidget } from "./FileUploadWidget.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { useAdminToast } from "./AdminProviders.js";
import { mapAdminError } from "./adminErrors.js";
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
  missionsTitle: "",
  missionsDescription: "",
  publicationsTitle: "",
  publicationsDescription: "",
  aboutTitle: "",
  description: "",
  featuredVideoId: null,
  backgroundMusicId: null,
  contactTitle: "",
  contactDescription: "",
  contactEmail: "",
  contactPhone: "",
  verseText: "",
  verseReference: "",
  visualBreakImageId: null,
};

const fields: Array<keyof LandingSettingsForm> = [
  "heroTitle",
  "heroSubtitle",
  "heroImageId",
  "missionsTitle",
  "missionsDescription",
  "publicationsTitle",
  "publicationsDescription",
  "aboutTitle",
  "description",
  "featuredVideoId",
  "backgroundMusicId",
  "contactTitle",
  "contactDescription",
  "contactEmail",
  "contactPhone",
  "verseText",
  "verseReference",
  "visualBreakImageId",
];

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
    missionsTitle: data.missionsTitle ?? "",
    missionsDescription: data.missionsDescription ?? "",
    publicationsTitle: data.publicationsTitle ?? "",
    publicationsDescription: data.publicationsDescription ?? "",
    aboutTitle: data.aboutTitle ?? "",
    description: data.description ?? "",
    featuredVideoId: data.featuredVideoId,
    backgroundMusicId: data.backgroundMusicId,
    contactTitle: data.contactTitle ?? "",
    contactDescription: data.contactDescription ?? "",
    contactEmail: data.contactEmail ?? "",
    contactPhone: data.contactPhone ?? "",
    verseText: data.verseText ?? "",
    verseReference: data.verseReference ?? "",
    visualBreakImageId: data.visualBreakImageId,
  };
}

export function landingSettingsAreEqual(
  current: LandingSettingsForm,
  saved: LandingSettingsForm,
): boolean {
  return fields.every((field) => current[field] === saved[field]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LandingSettingsPage({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState<LandingSettingsForm | null>(null);
  const [savedSettings, setSavedSettings] =
    useState<LandingSettingsForm | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const toast = useAdminToast();
  const dirty = Boolean(
    settings &&
    savedSettings &&
    !landingSettingsAreEqual(settings, savedSettings),
  );

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    adminFetch<LandingSettings | null>("/landing/admin")
      .then((data) => {
        if (!cancelled) {
          const normalized = normalizeLandingSettings(data);
          setSettings(normalized);
          setSavedSettings(normalized);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleChange = (
    field: Exclude<
      keyof LandingSettingsForm,
      | "heroImageId"
      | "visualBreakImageId"
      | "featuredVideoId"
      | "backgroundMusicId"
    >,
    value: string,
  ) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleHeroUploaded = (asset: { id: string }) => {
    setSettings((prev) => (prev ? { ...prev, heroImageId: asset.id } : null));
  };

  const handleHeroRemoved = () => {
    setSettings((prev) => (prev ? { ...prev, heroImageId: null } : null));
  };

  const handleVisualBreakUploaded = (asset: { id: string }) => {
    setSettings((prev) =>
      prev ? { ...prev, visualBreakImageId: asset.id } : null,
    );
  };

  const handleVisualBreakRemoved = () => {
    setSettings((prev) =>
      prev ? { ...prev, visualBreakImageId: null } : null,
    );
  };

  const handleFeaturedVideoUploaded = (asset: { id: string }) => {
    setSettings((prev) =>
      prev ? { ...prev, featuredVideoId: asset.id } : null,
    );
  };

  const handleFeaturedVideoRemoved = () => {
    setSettings((prev) => (prev ? { ...prev, featuredVideoId: null } : null));
  };

  const handleBackgroundMusicUploaded = (asset: { id: string }) => {
    setSettings((prev) =>
      prev ? { ...prev, backgroundMusicId: asset.id } : null,
    );
  };

  const handleBackgroundMusicRemoved = () => {
    setSettings((prev) => (prev ? { ...prev, backgroundMusicId: null } : null));
  };

  const saveSettings = async () => {
    if (!settings || saving) return;
    setSaving(true);

    try {
      const {
        heroImageId,
        visualBreakImageId,
        featuredVideoId,
        backgroundMusicId,
        verseText,
        verseReference,
        ...copySettings
      } = settings;
      const response = await adminFetch<LandingSettings>("/landing/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...copySettings,
          featuredVideoId,
          backgroundMusicId,
          verseText: verseText.trim(),
          verseReference: verseReference.trim(),
          heroImageId,
          visualBreakImageId,
        }),
      });
      const normalized = normalizeLandingSettings(response);
      setSettings(normalized);
      setSavedSettings(normalized);
      setConfirmOpen(false);
      toast.success("Configuración guardada correctamente.");
    } catch (error) {
      toast.error("No se pudo guardar la configuración.", {
        description: mapAdminError(error).root,
        retry: () => void saveSettings(),
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    if (!savedSettings) return;
    setSettings(savedSettings);
    setDiscardOpen(false);
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
      className="mx-auto w-full max-w-3xl"
      data-testid="landing-settings-form"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (dirty) setConfirmOpen(true);
        }}
        aria-busy={saving}
      >
        <header
          className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80"
          data-testid="landing-settings-toolbar"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                Configuración de la página de inicio
              </h2>
              <p className="text-sm text-muted-foreground">
                Edita el contenido que se muestra en la landing pública.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {dirty && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setDiscardOpen(true)}
                >
                  Descartar cambios
                </Button>
              )}
              <Button
                type="submit"
                className="min-h-10"
                disabled={!dirty || saving}
                aria-busy={saving}
              >
                {saving ? "Guardando…" : "Guardar configuración"}
              </Button>
            </div>
          </div>
          {dirty && (
            <Alert
              className="mt-3 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
              data-testid="landing-settings-dirty"
            >
              <TriangleAlert aria-hidden="true" />
              <AlertDescription className="text-current">
                Tienes cambios sin guardar
              </AlertDescription>
            </Alert>
          )}
        </header>
        <div className="flex flex-col gap-6">
          <Card className="shadow-none">
            <CardContent className="pt-6">
              <FieldSet>
                <FieldLegend>Encabezado principal</FieldLegend>
                <FieldDescription>
                  Presenta la organización desde el primer vistazo de la
                  landing.
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
                    <FileUploadWidget
                      category="LANDING_HERO"
                      fileId={settings.heroImageId}
                      onUploaded={handleHeroUploaded}
                      onRemove={handleHeroRemoved}
                      preview
                      previewVariant="hero"
                      previewAlt={`Imagen hero de ${settings.heroTitle || "la página de inicio"}`}
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
                <FieldLegend>Música de fondo</FieldLegend>
                <FieldDescription>
                  Permite reproducir una canción MP3 desde el botón flotante de
                  la landing pública. La reproducción nunca comienza sola.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldTitle>Archivo de música de fondo</FieldTitle>
                    <FileUploadWidget
                      category="LANDING_BACKGROUND_MUSIC"
                      fileId={settings.backgroundMusicId}
                      onUploaded={handleBackgroundMusicUploaded}
                      onRemove={handleBackgroundMusicRemoved}
                      accept=".mp3,audio/mpeg"
                      acceptedFormats="MP3"
                      maxSizeBytes={10 * 1024 * 1024}
                      preview
                      previewVariant="audio"
                      fileLabel="música"
                      inputLabel="música de fondo"
                      description="Formato: MP3 (audio/mpeg). Tamaño máximo: 10 MB."
                      data-testid="landing-background-music-upload-widget"
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="pt-6">
              <FieldSet>
                <FieldLegend>Imagen de descanso</FieldLegend>
                <FieldDescription>
                  Imagen visual entre el versículo y los proyectos. Si la
                  quitas, se mostrará la imagen incluida en la página.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldTitle>Imagen de descanso</FieldTitle>
                    <FileUploadWidget
                      category="LANDING_VISUAL_BREAK"
                      fileId={settings.visualBreakImageId}
                      onUploaded={handleVisualBreakUploaded}
                      onRemove={handleVisualBreakRemoved}
                      preview
                      previewAlt="Imagen de descanso de la página de inicio"
                      data-testid="landing-visual-break-upload-widget"
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="pt-6">
              <FieldSet>
                <FieldLegend>Misiones</FieldLegend>
                <FieldDescription>
                  Encabezado y descripción que acompañan los proyectos de la
                  landing pública.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="ls-missions-title">
                      Título de Misiones
                    </FieldLabel>
                    <Input
                      id="ls-missions-title"
                      type="text"
                      className="min-h-10"
                      value={settings.missionsTitle}
                      onChange={(e) =>
                        handleChange("missionsTitle", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ls-missions-description">
                      Descripción de Misiones
                    </FieldLabel>
                    <Textarea
                      id="ls-missions-description"
                      value={settings.missionsDescription}
                      onChange={(e) =>
                        handleChange("missionsDescription", e.target.value)
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
                <FieldLegend>Publicaciones</FieldLegend>
                <FieldDescription>
                  Encabezado y descripción que presentan las publicaciones
                  recientes.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="ls-publications-title">
                      Título de Publicaciones
                    </FieldLabel>
                    <Input
                      id="ls-publications-title"
                      type="text"
                      className="min-h-10"
                      value={settings.publicationsTitle}
                      onChange={(e) =>
                        handleChange("publicationsTitle", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ls-publications-description">
                      Descripción de Publicaciones
                    </FieldLabel>
                    <Textarea
                      id="ls-publications-description"
                      value={settings.publicationsDescription}
                      onChange={(e) =>
                        handleChange("publicationsDescription", e.target.value)
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
                <FieldLegend>Versículo de la página de inicio</FieldLegend>
                <FieldDescription>
                  Muestra un versículo en la landing pública. Deja ambos campos
                  vacíos para ocultar esta sección.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="ls-verse-text">Texto</FieldLabel>
                    <Textarea
                      id="ls-verse-text"
                      value={settings.verseText}
                      onChange={(e) =>
                        handleChange("verseText", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ls-verse-reference">
                      Referencia
                    </FieldLabel>
                    <Input
                      id="ls-verse-reference"
                      type="text"
                      className="min-h-10"
                      value={settings.verseReference}
                      onChange={(e) =>
                        handleChange("verseReference", e.target.value)
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
                <FieldLegend>Contenido institucional</FieldLegend>
                <FieldDescription>
                  Este texto alimenta la sección Nosotros de la landing.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="ls-about-title">
                      Título de Nosotros
                    </FieldLabel>
                    <Input
                      id="ls-about-title"
                      type="text"
                      className="min-h-10"
                      value={settings.aboutTitle}
                      onChange={(e) =>
                        handleChange("aboutTitle", e.target.value)
                      }
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
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="pt-6">
              <FieldSet>
                <FieldLegend>Video destacado</FieldLegend>
                <FieldDescription>
                  Muestra un video MP4 en una sección independiente de la
                  landing. Si no cargas un video, la sección permanecerá oculta.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldTitle>Archivo de video destacado</FieldTitle>
                    <FileUploadWidget
                      category="LANDING_FEATURED_VIDEO"
                      fileId={settings.featuredVideoId}
                      onUploaded={handleFeaturedVideoUploaded}
                      onRemove={handleFeaturedVideoRemoved}
                      accept="video/mp4"
                      acceptedFormats="MP4"
                      maxSizeBytes={100 * 1024 * 1024}
                      fileLabel="video"
                      inputLabel="video"
                      description="Formato: MP4 (video/mp4). Tamaño máximo: 100 MB."
                      data-testid="landing-featured-video-upload-widget"
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
                    <FieldLabel htmlFor="ls-contact-title">
                      Título de Contacto
                    </FieldLabel>
                    <Input
                      id="ls-contact-title"
                      type="text"
                      className="min-h-10"
                      value={settings.contactTitle}
                      onChange={(e) =>
                        handleChange("contactTitle", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ls-contact-description">
                      Descripción de Contacto
                    </FieldLabel>
                    <Textarea
                      id="ls-contact-description"
                      value={settings.contactDescription}
                      onChange={(e) =>
                        handleChange("contactDescription", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
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
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        title="Guardar configuración"
        description="Los cambios se publicarán en la página de inicio."
        confirmLabel="Guardar cambios"
        onConfirm={saveSettings}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmDialog
        open={discardOpen}
        title="Descartar cambios"
        description="Se restaurará la última configuración guardada."
        confirmLabel="Descartar"
        destructive
        onConfirm={discardChanges}
        onCancel={() => setDiscardOpen(false)}
      />
    </div>
  );
}
