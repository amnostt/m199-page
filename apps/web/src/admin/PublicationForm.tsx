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
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "../components/ui/field.js";
import { Input } from "../components/ui/input.js";
import { Textarea } from "../components/ui/textarea.js";
import { ConfirmDialog } from "./ConfirmDialog.js";

export interface PublicationFormProps {
  publication?: PublicationAdmin | null;
  missions: MissionAdmin[];
  busy?: boolean;
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

export function PublicationForm({
  publication,
  missions,
  busy = false,
  onSubmit,
  onCancel,
}: PublicationFormProps) {
  const [value, setValue] = useState<CreatePublicationInput>(blank);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [typeChange, setTypeChange] = useState<CreatePublicationInput | null>(
    null,
  );
  useEffect(() => {
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
  const set = (key: keyof CreatePublicationInput, next: unknown) =>
    setValue((current) => ({ ...current, [key]: next }));
  const activity = value.type !== "POST";
  return (
    <form
      data-testid="publication-form"
      className="space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (publication && publication.type !== value.type) {
          setTypeChange(value);
          return;
        }
        void onSubmit(value);
      }}
      aria-busy={busy}
    >
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="publication-slug">Slug</FieldLabel>
            <Input
              id="publication-slug"
              value={value.slug}
              onChange={(e) => set("slug", e.target.value)}
              disabled={busy}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="publication-title">Título</FieldLabel>
            <Input
              id="publication-title"
              value={value.title}
              onChange={(e) => set("title", e.target.value)}
              disabled={busy}
            />
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
                setValue((current) =>
                  type === "POST"
                    ? {
                        ...current,
                        type,
                        startDate: null,
                        endDate: null,
                        activityStatus: null,
                        documentationStatus: null,
                      }
                    : { ...current, type },
                );
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
              <Field>
                <FieldLabel htmlFor="publication-start-date">
                  Fecha de inicio
                </FieldLabel>
                <Input
                  id="publication-start-date"
                  type="date"
                  value={value.startDate ?? ""}
                  onChange={(e) => set("startDate", e.target.value || null)}
                  disabled={busy}
                />
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
              <Field>
                <FieldLabel htmlFor="publication-activity-status">
                  Estado de actividad
                </FieldLabel>
                <select
                  id="publication-activity-status"
                  value={value.activityStatus ?? "UPCOMING"}
                  onChange={(e) => set("activityStatus", e.target.value)}
                  disabled={busy}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="UPCOMING">Próxima</option>
                  <option value="COMPLETED">Completada</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="publication-documentation-status">
                  Estado de documentación
                </FieldLabel>
                <select
                  id="publication-documentation-status"
                  value={value.documentationStatus ?? "PENDING_DOCUMENTATION"}
                  onChange={(e) => set("documentationStatus", e.target.value)}
                  disabled={busy}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="PENDING_DOCUMENTATION">Pendiente</option>
                  <option value="DOCUMENTED">Documentada</option>
                </select>
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
          onClick={onCancel}
          disabled={busy}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          Guardar publicación
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
          if (typeChange)
            void onSubmit({ ...typeChange, confirmTypeChange: true });
          setTypeChange(null);
        }}
        onCancel={() => setTypeChange(null)}
      />
    </form>
  );
}
