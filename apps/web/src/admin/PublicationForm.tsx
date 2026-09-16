import { useEffect, useState } from "react";
import type {
  CreatePublicationInput,
  MissionAdmin,
  PublicationAdmin,
  PublicationType,
  UpdatePublicationInput,
} from "./adminTypes.js";
import { MissionPickerDialog } from "./MissionPickerDialog.js";
import { PublicationContentEditor } from "./PublicationContentEditor.js";
import { PublicationImageField } from "./PublicationImageField.js";
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
  imageIds: [],
  type: "POST",
  activityDate: null,
};

const dateInputValue = (value: string | null): string | null =>
  value ? value.slice(0, 10) : null;

type FormErrors = Partial<Record<keyof CreatePublicationInput, string>>;

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
  const [typeChange, setTypeChange] = useState<UpdatePublicationInput | null>(
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
            imageIds: publication.imageIds,
            type: publication.type,
            scope: publication.scope,
            missionIds: publication.missionIds,
            activityDate: dateInputValue(publication.activityDate),
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
    if (value.imageIds.length === 0)
      errors.imageIds = "Agrega al menos una imagen.";
    if (value.type !== "POST" && !value.activityDate)
      errors.activityDate = "La fecha de actividad es obligatoria.";
    return errors;
  };

  const submitValue = (
    input: CreatePublicationInput,
  ): UpdatePublicationInput => ({
    ...input,
    activityDate: input.type === "POST" ? null : input.activityDate,
  });

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
        const nextValue = submitValue(value);
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
            <PublicationContentEditor
              id="publication-content"
              value={value.content}
              onChange={(content) => set("content", content)}
              disabled={busy}
              aria-label="Contenido"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="publication-type">Tipo</FieldLabel>
            <select
              id="publication-type"
              value={value.type}
              onChange={(e) => {
                setFieldErrors({});
                setValue((current) => ({
                  ...current,
                  type: e.target.value as PublicationType,
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

          {value.type !== "POST" && (
            <Field data-invalid={Boolean(fieldErrors.activityDate)}>
              <FieldLabel htmlFor="publication-activity-date">
                Fecha de actividad
              </FieldLabel>
              <Input
                id="publication-activity-date"
                name="activityDate"
                type="date"
                value={value.activityDate ?? ""}
                onChange={(e) => set("activityDate", e.target.value || null)}
                aria-invalid={Boolean(fieldErrors.activityDate)}
                aria-describedby={
                  fieldErrors.activityDate
                    ? "publication-activity-date-error"
                    : undefined
                }
                disabled={busy}
                required
              />
              {fieldErrors.activityDate && (
                <FieldError id="publication-activity-date-error">
                  {fieldErrors.activityDate}
                </FieldError>
              )}
            </Field>
          )}
        </FieldGroup>
      </FieldSet>

      <PublicationImageField
        imageIds={value.imageIds}
        onChange={(imageIds) => set("imageIds", imageIds)}
        disabled={busy}
      />
      {fieldErrors.imageIds && (
        <p className="text-sm text-destructive" role="alert">
          {fieldErrors.imageIds}
        </p>
      )}

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
              disabled={busy}
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
              disabled={busy || missions.length === 0}
            />
            Misiones
          </label>
        </FieldGroup>
        {value.scope === "MISSION" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            disabled={busy}
          >
            Elegir misiones ({value.missionIds?.length ?? 0})
          </Button>
        )}
      </FieldSet>

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
        description={
          typeChange?.type === "POST"
            ? "La fecha de actividad se eliminará al cambiar a publicación. ¿Quieres continuar?"
            : "La fecha y las imágenes se conservarán al cambiar el tipo. ¿Quieres continuar?"
        }
        confirmLabel="Cambiar tipo"
        onConfirm={() => {
          if (typeChange)
            void onSubmit({ ...typeChange, confirmTypeChange: true });
          setTypeChange(null);
        }}
        onCancel={() => setTypeChange(null)}
      />
    </form>
  );
}
