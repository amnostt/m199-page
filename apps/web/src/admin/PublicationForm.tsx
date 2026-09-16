import { useEffect, useState } from "react";
import type {
  CreatePublicationInput,
  MissionAdmin,
  PublicationAdmin,
  PublicationType,
  UpdatePublicationInput,
} from "./adminTypes.js";
import { FileUploadWidget } from "./FileUploadWidget.js";
import { MissionPickerDialog } from "./MissionPickerDialog.js";
import { Button } from "../components/ui/button.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "../components/ui/field.js";
import { Input } from "../components/ui/input.js";
import { Textarea } from "../components/ui/textarea.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import {
  isUrlSafeSlug,
  suggestSlugFromTitle,
  URL_SAFE_SLUG_DESCRIPTION,
  URL_SAFE_SLUG_ERROR,
  URL_SAFE_SLUG_PATTERN,
} from "./slugValidation.js";

export interface PublicationFormProps {
  publication?: PublicationAdmin | null;
  missions: MissionAdmin[];
  busy?: boolean;
  error?: string | null;
  onSubmit: (input: UpdatePublicationInput) => void | Promise<void>;
  onCancel: () => void;
}

const blank: CreatePublicationInput = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  featuredImageId: "",
  type: "POST",
};

const dateInputValue = (value: string | null): string | null =>
  value ? value.slice(0, 10) : null;

type FormErrors = Partial<Record<keyof CreatePublicationInput, string>>;

const clearActivityFields = (
  input: CreatePublicationInput,
): CreatePublicationInput => ({
  ...input,
  startDate: null,
  endDate: null,
  activityStatus: null,
  documentationStatus: null,
});

export function PublicationForm({
  publication,
  missions,
  busy = false,
  error = null,
  onSubmit,
  onCancel,
}: PublicationFormProps) {
  const [value, setValue] = useState<CreatePublicationInput>(blank);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [typeChange, setTypeChange] = useState<CreatePublicationInput | null>(
    null,
  );
  useEffect(() => {
    setFieldErrors({});
    setTypeChange(null);
    setSlugManuallyEdited(Boolean(publication));
    setValue(
      publication
        ? {
            slug: publication.slug,
            title: publication.title,
            excerpt: publication.excerpt,
            content: publication.content,
            featuredImageId: publication.featuredImageId ?? "",
            type: publication.type,
            scope: publication.scope,
            missionIds: publication.missionIds,
            startDate: dateInputValue(publication.startDate),
            endDate: dateInputValue(publication.endDate),
            activityStatus: publication.activityStatus,
            documentationStatus: publication.documentationStatus,
          }
        : blank,
    );
  }, [publication]);
  const set = (key: keyof CreatePublicationInput, next: unknown) => {
    setValue((current) => ({ ...current, [key]: next }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
  };
  const handleTitleChange = (title: string) => {
    setValue((current) => ({
      ...current,
      title,
      ...(!publication && !slugManuallyEdited
        ? { slug: suggestSlugFromTitle(title) }
        : {}),
    }));
    setFieldErrors((current) => {
      if (
        !current.title &&
        (!current.slug || publication || slugManuallyEdited)
      )
        return current;
      const nextErrors = { ...current };
      delete nextErrors.title;
      if (!publication && !slugManuallyEdited) delete nextErrors.slug;
      return nextErrors;
    });
  };
  const validate = (): FormErrors => {
    const errors: FormErrors = {};
    if (!value.slug) errors.slug = "El slug es obligatorio.";
    else if (!isUrlSafeSlug(value.slug)) errors.slug = URL_SAFE_SLUG_ERROR;
    if (!value.title.trim()) errors.title = "El título es obligatorio.";
    if (value.type !== "POST") {
      if (!value.startDate)
        errors.startDate = "La fecha de inicio es obligatoria.";
      if (!value.activityStatus)
        errors.activityStatus = "Selecciona el estado de actividad.";
      if (!value.documentationStatus)
        errors.documentationStatus = "Selecciona el estado de documentación.";
    }
    return errors;
  };
  const activity = value.type !== "POST";
  return (
    <form
      data-testid="publication-form"
      className="space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        const nextErrors = validate();
        setFieldErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        const nextValue =
          value.type === "POST" ? clearActivityFields(value) : value;
        if (publication && publication.type !== value.type) {
          setTypeChange(nextValue);
          return;
        }
        void onSubmit(nextValue);
      }}
      aria-busy={busy}
    >
      {error && (
        <Alert data-testid="publication-form-error" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <FieldSet>
        <FieldGroup>
          <Field data-invalid={Boolean(fieldErrors.title)}>
            <FieldLabel htmlFor="publication-title">Título</FieldLabel>
            <Input
              id="publication-title"
              name="title"
              value={value.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={
                fieldErrors.title ? "publication-title-error" : undefined
              }
              disabled={busy}
              required
            />
            {fieldErrors.title && (
              <FieldError id="publication-title-error">
                {fieldErrors.title}
              </FieldError>
            )}
          </Field>
          <Field data-invalid={Boolean(fieldErrors.slug)}>
            <FieldLabel htmlFor="publication-slug">Slug</FieldLabel>
            <Input
              id="publication-slug"
              name="slug"
              value={value.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                set("slug", e.target.value);
              }}
              onInput={() => setSlugManuallyEdited(true)}
              aria-invalid={Boolean(fieldErrors.slug)}
              aria-describedby={
                fieldErrors.slug
                  ? "publication-slug-description publication-slug-error"
                  : "publication-slug-description"
              }
              pattern={URL_SAFE_SLUG_PATTERN}
              autoCapitalize="none"
              spellCheck={false}
              disabled={busy}
              required
            />
            <FieldDescription id="publication-slug-description">
              {URL_SAFE_SLUG_DESCRIPTION}
            </FieldDescription>
            {fieldErrors.slug && (
              <FieldError id="publication-slug-error">
                {fieldErrors.slug}
              </FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="publication-excerpt">Extracto</FieldLabel>
            <Textarea
              id="publication-excerpt"
              value={value.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              disabled={busy}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="publication-content">Contenido</FieldLabel>
            <Textarea
              id="publication-content"
              value={value.content}
              onChange={(e) => set("content", e.target.value)}
              disabled={busy}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="publication-type">Tipo</FieldLabel>
            <select
              id="publication-type"
              value={value.type}
              onChange={(e) => {
                const type = e.target.value as PublicationType;
                setFieldErrors({});
                setValue((current) => ({
                  ...current,
                  type,
                  ...(type !== "POST" && current.type === "POST"
                    ? {
                        activityStatus: current.activityStatus ?? "UPCOMING",
                        documentationStatus:
                          current.documentationStatus ??
                          "PENDING_DOCUMENTATION",
                      }
                    : {}),
                }));
              }}
              disabled={busy}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="POST">Publicación</option>
              <option value="OUTING">Salida</option>
              <option value="EVENT">Evento</option>
            </select>
          </Field>
          {activity && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(fieldErrors.startDate)}>
                <FieldLabel htmlFor="publication-start-date">
                  Fecha de inicio
                </FieldLabel>
                <Input
                  id="publication-start-date"
                  name="startDate"
                  type="date"
                  value={value.startDate ?? ""}
                  onChange={(e) => set("startDate", e.target.value || null)}
                  aria-invalid={Boolean(fieldErrors.startDate)}
                  aria-describedby={
                    fieldErrors.startDate
                      ? "publication-start-date-error"
                      : undefined
                  }
                  disabled={busy}
                  required
                />
                {fieldErrors.startDate && (
                  <FieldError id="publication-start-date-error">
                    {fieldErrors.startDate}
                  </FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="publication-end-date">
                  Fecha de fin
                </FieldLabel>
                <Input
                  id="publication-end-date"
                  type="date"
                  value={value.endDate ?? ""}
                  onChange={(e) => set("endDate", e.target.value || null)}
                  disabled={busy}
                />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.activityStatus)}>
                <FieldLabel htmlFor="publication-activity-status">
                  Estado de actividad
                </FieldLabel>
                <select
                  id="publication-activity-status"
                  name="activityStatus"
                  value={value.activityStatus ?? ""}
                  onChange={(e) => set("activityStatus", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.activityStatus)}
                  aria-describedby={
                    fieldErrors.activityStatus
                      ? "publication-activity-status-error"
                      : undefined
                  }
                  disabled={busy}
                  required
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Selecciona un estado</option>
                  <option value="UPCOMING">Próxima</option>
                  <option value="COMPLETED">Completada</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
                {fieldErrors.activityStatus && (
                  <FieldError id="publication-activity-status-error">
                    {fieldErrors.activityStatus}
                  </FieldError>
                )}
              </Field>
              <Field data-invalid={Boolean(fieldErrors.documentationStatus)}>
                <FieldLabel htmlFor="publication-documentation-status">
                  Estado de documentación
                </FieldLabel>
                <select
                  id="publication-documentation-status"
                  name="documentationStatus"
                  value={value.documentationStatus ?? ""}
                  onChange={(e) => set("documentationStatus", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.documentationStatus)}
                  aria-describedby={
                    fieldErrors.documentationStatus
                      ? "publication-documentation-status-error"
                      : undefined
                  }
                  disabled={busy}
                  required
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Selecciona un estado</option>
                  <option value="PENDING_DOCUMENTATION">Pendiente</option>
                  <option value="DOCUMENTED">Documentada</option>
                </select>
                {fieldErrors.documentationStatus && (
                  <FieldError id="publication-documentation-status-error">
                    {fieldErrors.documentationStatus}
                  </FieldError>
                )}
              </Field>
            </div>
          )}
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <legend className="text-sm font-medium">Alcance</legend>
        <FieldGroup className="gap-3 sm:flex-row">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="publication-scope"
              value="GENERAL"
              checked={value.scope !== "MISSION"}
              onChange={() =>
                setValue((current) => ({
                  ...current,
                  scope: "GENERAL",
                  missionIds: [],
                }))
              }
            />
            General
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="publication-scope"
              value="MISSION"
              checked={value.scope === "MISSION"}
              onChange={() => set("scope", "MISSION")}
              disabled={missions.length === 0}
            />
            Misiones
          </label>
        </FieldGroup>
        {value.scope === "MISSION" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setPickerOpen(true)}
          >
            Elegir misiones ({value.missionIds?.length ?? 0})
          </Button>
        )}
      </FieldSet>
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
        fileId={value.featuredImageId || null}
        onUploaded={(asset) => set("featuredImageId", asset.id)}
        onRemove={() => set("featuredImageId", "")}
        preview
        previewVariant="hero"
        previewAlt={`Imagen destacada de ${value.title || "la publicación"}`}
        data-testid="publication-featured-image"
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!publication) {
              setValue(blank);
              setFieldErrors({});
              setTypeChange(null);
              setSlugManuallyEdited(false);
            }
            onCancel();
          }}
          disabled={busy}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="min-w-40"
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? "Guardando publicación…" : "Guardar publicación"}
        </Button>
      </div>
      <MissionPickerDialog
        open={pickerOpen}
        missions={missions}
        selectedIds={value.missionIds ?? []}
        onConfirm={(ids) => {
          set("missionIds", ids);
          setPickerOpen(false);
        }}
        onCancel={() => setPickerOpen(false)}
      />
      <ConfirmDialog
        open={typeChange !== null}
        title="Cambiar tipo de publicación"
        description="Los campos de actividad cambiarán según el nuevo tipo. ¿Quieres continuar?"
        confirmLabel="Cambiar tipo"
        onConfirm={() => {
          if (typeChange) {
            const nextValue =
              typeChange.type === "POST"
                ? clearActivityFields(typeChange)
                : typeChange;
            void onSubmit({ ...nextValue, confirmTypeChange: true });
          }
          setTypeChange(null);
        }}
        onCancel={() => setTypeChange(null)}
      />
    </form>
  );
}
