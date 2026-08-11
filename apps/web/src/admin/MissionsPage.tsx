import { useCallback, useEffect, useState } from "react";
import type { MissionAdmin } from "./adminTypes.js";
import { FileUploadWidget } from "./FileUploadWidget.js";
import { mapAdminError } from "./adminErrors.js";
import {
  createMission,
  listActiveMissions,
  listArchivedMissions,
  updateMission,
  updateMissionStatus,
} from "./missionsApi.js";

const EMPTY = { title: "", slug: "", heroImageId: "", heroPhrase: "" };
type Form = typeof EMPTY;

function MissionList({
  heading,
  empty,
  missions,
  testId,
  onEdit,
  onStatus,
}: {
  heading: string;
  empty: string;
  missions: MissionAdmin[];
  testId: string;
  onEdit: (mission: MissionAdmin) => void;
  onStatus: (mission: MissionAdmin) => void;
}) {
  return (
    <section aria-labelledby={`${testId}-heading`} data-testid={testId}>
      <h2 id={`${testId}-heading`}>{heading}</h2>
      {missions.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <ul>
          {missions.map((mission) => (
            <li key={mission.id} data-testid={`mission-${mission.id}`}>
              <h3>{mission.title}</h3>
              <p>{mission.heroPhrase}</p>
              <p>{mission.slug}</p>
              <button type="button" onClick={() => onEdit(mission)}>
                Editar
              </button>
              <button type="button" onClick={() => onStatus(mission)}>
                {mission.status === "ACTIVE" ? "Archivar" : "Reactivar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MissionsPage() {
  const [active, setActive] = useState<MissionAdmin[] | null>(null);
  const [archived, setArchived] = useState<MissionAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<MissionAdmin | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const load = useCallback(() => {
    setError(null);
    setActive(null);
    setArchived(null);
    void Promise.all([listActiveMissions(), listArchivedMissions()])
      .then(([a, r]) => {
        setActive(a);
        setArchived(r);
      })
      .catch((reason: unknown) => setError(mapAdminError(reason).root));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const edit = (mission: MissionAdmin) => {
    setEditing(mission);
    setForm({
      title: mission.title,
      slug: mission.slug,
      heroImageId: mission.heroImageId,
      heroPhrase: mission.heroPhrase,
    });
    setFormError(null);
  };
  const reset = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const values = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      heroImageId: form.heroImageId,
      heroPhrase: form.heroPhrase.trim(),
    };
    if (
      !values.title ||
      !values.slug ||
      !values.heroImageId ||
      !values.heroPhrase
    ) {
      setFormError("Completá título, slug, imagen y frase.");
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      if (editing) await updateMission(editing.id, values);
      else await createMission(values);
      reset();
      load();
    } catch (reason) {
      setFormError(mapAdminError(reason).root);
    } finally {
      setPending(false);
    }
  };
  const changeStatus = async (mission: MissionAdmin) => {
    const next = mission.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    if (
      !window.confirm(
        next === "ARCHIVED"
          ? "¿Archivar esta misión?"
          : "¿Reactivar esta misión?",
      )
    )
      return;
    setPending(true);
    setFormError(null);
    try {
      await updateMissionStatus(mission.id, next);
      load();
    } catch (reason) {
      setFormError(mapAdminError(reason).root);
    } finally {
      setPending(false);
    }
  };
  return (
    <section
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      data-testid="missions-page"
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Misiones</h1>
        <p className="text-sm text-muted-foreground">
          Administra las misiones activas y anteriores.
        </p>
      </header>
      <form onSubmit={save} aria-busy={pending}>
        <h2>{editing ? "Editar misión" : "Crear misión"}</h2>
        <label>
          Título
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label>
          Slug
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </label>
        <label>
          Frase
          <input
            value={form.heroPhrase}
            onChange={(e) => setForm({ ...form, heroPhrase: e.target.value })}
          />
        </label>
        <FileUploadWidget
          category="MISSION_HERO"
          fileId={form.heroImageId || null}
          onUploaded={(asset) => setForm({ ...form, heroImageId: asset.id })}
          onRemove={() => setForm({ ...form, heroImageId: "" })}
          data-testid="mission-hero-upload"
        />
        <button type="submit" disabled={pending}>
          {pending
            ? "Guardando…"
            : editing
              ? "Guardar cambios"
              : "Crear misión"}
        </button>
        {editing && (
          <button type="button" onClick={reset} disabled={pending}>
            Cancelar
          </button>
        )}
        {formError && <p role="alert">{formError}</p>}
      </form>
      {active === null || archived === null
        ? !error && <p>Cargando misiones…</p>
        : null}
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={load}>
            Reintentar
          </button>
        </div>
      ) : active !== null && archived !== null ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <MissionList
            heading="Misiones activas"
            empty="Todavía no hay misiones activas."
            missions={active}
            testId="active-missions"
            onEdit={edit}
            onStatus={changeStatus}
          />
          <MissionList
            heading="Misiones anteriores"
            empty="Todavía no hay misiones anteriores."
            missions={archived}
            testId="archived-missions"
            onEdit={edit}
            onStatus={changeStatus}
          />
        </div>
      ) : null}
    </section>
  );
}
