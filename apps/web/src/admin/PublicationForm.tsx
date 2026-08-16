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
            startDate: publication.startDate,
            endDate: publication.endDate,
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
      <h2>{publication ? "Editar publicación" : "Nueva publicación"}</h2>
      <label>
        Slug
        <input
          aria-label="Slug"
          value={value.slug}
          onChange={(e) => set("slug", e.target.value)}
          disabled={busy}
        />
      </label>
      <label>
        Título
        <input
          aria-label="Título"
          value={value.title}
          onChange={(e) => set("title", e.target.value)}
          disabled={busy}
        />
      </label>
      <label>
        Extracto
        <Textarea
          aria-label="Extracto"
          value={value.excerpt}
          onChange={(e) => set("excerpt", e.target.value)}
          disabled={busy}
        />
      </label>
      <label>
        Contenido
        <Textarea
          aria-label="Contenido"
          value={value.content}
          onChange={(e) => set("content", e.target.value)}
          disabled={busy}
        />
      </label>
      <label>
        Tipo
        <select
          aria-label="Tipo"
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
        >
          <option value="POST">Publicación</option>
          <option value="OUTING">Salida</option>
          <option value="EVENT">Evento</option>
        </select>
      </label>
      {activity && (
        <>
          <label>
            Fecha de inicio
            <input
              aria-label="Fecha de inicio"
              type="date"
              value={value.startDate ?? ""}
              onChange={(e) => set("startDate", e.target.value || null)}
              disabled={busy}
            />
          </label>
          <label>
            Fecha de fin
            <input
              aria-label="Fecha de fin"
              type="date"
              value={value.endDate ?? ""}
              onChange={(e) => set("endDate", e.target.value || null)}
              disabled={busy}
            />
          </label>
          <label>
            Estado de actividad
            <select
              aria-label="Estado de actividad"
              value={value.activityStatus ?? "UPCOMING"}
              onChange={(e) => set("activityStatus", e.target.value)}
              disabled={busy}
            >
              <option value="UPCOMING">Próxima</option>
              <option value="COMPLETED">Completada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </label>
          <label>
            Estado de documentación
            <select
              aria-label="Estado de documentación"
              value={value.documentationStatus ?? "PENDING_DOCUMENTATION"}
              onChange={(e) => set("documentationStatus", e.target.value)}
              disabled={busy}
            >
              <option value="PENDING_DOCUMENTATION">Pendiente</option>
              <option value="DOCUMENTED">Documentada</option>
            </select>
          </label>
        </>
      )}
      <fieldset>
        <legend>Alcance</legend>
        <label>
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
        <label>
          <input
            type="radio"
            checked={value.scope === "MISSION"}
            onChange={() => set("scope", "MISSION")}
            disabled={missions.length === 0}
          />
          Misiones
        </label>
        {value.scope === "MISSION" && (
          <Button type="button" onClick={() => setPickerOpen(true)}>
            Elegir misiones ({value.missionIds?.length ?? 0})
          </Button>
        )}
      </fieldset>
      <FileUploadWidget
        category="PUBLICATION_FEATURED_IMAGE"
        fileId={value.featuredImageId || null}
        onUploaded={(asset) => set("featuredImageId", asset.id)}
        onRemove={() => set("featuredImageId", "")}
        data-testid="publication-featured-image"
      />
      <Button type="submit" disabled={busy}>
        Guardar publicación
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={busy}
      >
        Cancelar
      </Button>
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
