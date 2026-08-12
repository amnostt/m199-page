import { useEffect, useState } from "react";
import type {
  CreatePublicationInput,
  MissionAdmin,
  PublicationAdmin,
  UpdatePublicationInput,
} from "./adminTypes.js";
import {
  createPublication,
  deletePublication,
  listPublications,
  updatePublication,
  updatePublicationStatus,
  updatePublicationScope,
} from "./publicationsApi.js";
import { listActiveMissions } from "./missionsApi.js";
import { mapAdminError } from "./adminErrors.js";
import { PublicationForm } from "./PublicationForm.js";
import { PublicationList } from "./PublicationList.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Button } from "../components/ui/button.js";

export function PublicationsPage() {
  const [publications, setPublications] = useState<PublicationAdmin[]>([]);
  const [missions, setMissions] = useState<MissionAdmin[]>([]);
  const [editing, setEditing] = useState<PublicationAdmin | null>(null);
  const [pending, setPending] = useState<PublicationAdmin | null>(null);
  const [action, setAction] = useState<"delete" | "status" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setLoading(true);
    try {
      const [items, active] = await Promise.all([
        listPublications(),
        listActiveMissions(),
      ]);
      setPublications(items);
      setMissions(active);
      setError("");
    } catch (e) {
      setError(mapAdminError(e).root);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  const save = async (input: UpdatePublicationInput) => {
    setBusy(true);
    try {
      if (editing?.id) {
        const { status: _status, ...update } = input;
        if (update.scope) {
          await updatePublicationScope(
            editing.id,
            update.scope,
            update.missionIds ?? [],
          );
          delete update.scope;
          delete update.missionIds;
        }
        if (Object.keys(update).length)
          await updatePublication(editing.id, update);
      } else await createPublication(input as CreatePublicationInput);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(mapAdminError(e).root);
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!pending || !action) return;
    setBusy(true);
    try {
      if (action === "delete") await deletePublication(pending.id);
      else
        await updatePublicationStatus(
          pending.id,
          pending.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
        );
      setPending(null);
      setAction(null);
      await refresh();
    } catch (e) {
      setError(mapAdminError(e).root);
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <div data-testid="publications-loading" role="status">
        Cargando publicaciones…
      </div>
    );
  return (
    <div data-testid="publications-page">
      <header>
        <h2>Publicaciones</h2>
        <Button
          type="button"
          onClick={() => setEditing({} as PublicationAdmin)}
        >
          Nueva publicación
        </Button>
      </header>
      {error && (
        <p role="alert" data-testid="publications-error">
          {error}
        </p>
      )}
      {editing && (
        <PublicationForm
          publication={editing.id ? editing : null}
          missions={missions}
          busy={busy}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}
      <PublicationList
        publications={publications}
        onEdit={setEditing}
        onDelete={(p) => {
          setPending(p);
          setAction("delete");
        }}
        onStatus={(p) => {
          setPending(p);
          setAction("status");
        }}
      />
      <ConfirmDialog
        open={Boolean(pending)}
        title={action === "delete" ? "Eliminar publicación" : "Cambiar estado"}
        description={
          action === "delete"
            ? "Esta acción no se puede deshacer."
            : "¿Querés cambiar el estado de esta publicación?"
        }
        confirmLabel={action === "delete" ? "Eliminar" : "Confirmar"}
        destructive={action === "delete"}
        onConfirm={confirm}
        onCancel={() => {
          setPending(null);
          setAction(null);
        }}
      />
    </div>
  );
}
