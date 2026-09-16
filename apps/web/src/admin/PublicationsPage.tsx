import { useCallback, useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
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
} from "./publicationsApi.js";
import { listActiveMissions } from "./missionsApi.js";
import { mapAdminError } from "./adminErrors.js";
import { PublicationForm } from "./PublicationForm.js";
import { PublicationList } from "./PublicationList.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs.js";

export function PublicationsPage() {
  const [published, setPublished] = useState<PublicationAdmin[] | null>(null);
  const [drafts, setDrafts] = useState<PublicationAdmin[] | null>(null);
  const [missions, setMissions] = useState<MissionAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PublicationAdmin | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState<PublicationAdmin | null>(null);
  const [action, setAction] = useState<"delete" | "status" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setPublished(null);
    setDrafts(null);
    setMissions(null);
    void Promise.all([
      listPublications("PUBLISHED"),
      listPublications("DRAFT"),
      listActiveMissions(),
    ])
      .then(([publishedItems, draftItems, activeMissions]) => {
        setPublished(publishedItems);
        setDrafts(draftItems);
        setMissions(activeMissions);
      })
      .catch((reason: unknown) => setError(mapAdminError(reason).root));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closeForm = () => {
    if (busy) return;
    setDialogOpen(false);
    setEditing(null);
  };

  const openCreate = () => {
    setError(null);
    setMutationError(null);
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (publication: PublicationAdmin) => {
    setError(null);
    setMutationError(null);
    setEditing(publication);
    setDialogOpen(true);
  };

  const save = async (input: UpdatePublicationInput) => {
    if (busy) return;
    setBusy(true);
    setMutationError(null);
    try {
      if (editing) {
        const { status: _status, ...update } = input;
        if (Object.keys(update).length) {
          await updatePublication(editing.id, update);
        }
      } else {
        await createPublication(input as CreatePublicationInput);
      }
      setDialogOpen(false);
      setEditing(null);
      load();
    } catch (reason) {
      setMutationError(mapAdminError(reason).root);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!pending || !action) return;
    setBusy(true);
    try {
      if (action === "delete") {
        await deletePublication(pending.id);
      } else {
        await updatePublicationStatus(
          pending.id,
          pending.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
        );
      }
      setPending(null);
      setAction(null);
      load();
    } catch (reason) {
      setError(mapAdminError(reason).root);
    } finally {
      setBusy(false);
    }
  };

  const loaded = published !== null && drafts !== null && missions !== null;

  return (
    <section
      className="mx-auto flex min-w-0 w-full max-w-6xl flex-col gap-6"
      data-testid="publications-page"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Publicaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra las publicaciones publicadas y en borrador.
          </p>
        </div>
        <Button type="button" onClick={openCreate} disabled={!loaded}>
          <PlusIcon data-icon="inline-start" />
          Nueva publicación
        </Button>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button type="button" variant="outline" onClick={load}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : !loaded ? (
        <p
          role="status"
          data-testid="publications-loading"
          className="text-sm text-muted-foreground"
        >
          Cargando publicaciones…
        </p>
      ) : (
        <Tabs defaultValue="published" className="min-w-0">
          <TabsList aria-label="Filtrar publicaciones por estado">
            <TabsTrigger value="published">
              Publicadas ({published.length})
            </TabsTrigger>
            <TabsTrigger value="drafts">
              Borradores ({drafts.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="published" className="mt-4 min-w-0">
            <PublicationList
              heading="Publicaciones publicadas"
              empty="Todavía no hay publicaciones publicadas."
              publications={published}
              testId="published-publications"
              onEdit={openEdit}
              onDelete={(publication) => {
                setPending(publication);
                setAction("delete");
              }}
              onStatus={(publication) => {
                setPending(publication);
                setAction("status");
              }}
            />
          </TabsContent>
          <TabsContent value="drafts" className="mt-4 min-w-0">
            <PublicationList
              heading="Publicaciones en borrador"
              empty="Todavía no hay borradores."
              publications={drafts}
              testId="draft-publications"
              onEdit={openEdit}
              onDelete={(publication) => {
                setPending(publication);
                setAction("delete");
              }}
              onStatus={(publication) => {
                setPending(publication);
                setAction("status");
              }}
            />
          </TabsContent>
        </Tabs>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeForm();
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar publicación" : "Nueva publicación"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Actualiza los datos de la publicación y guarda los cambios."
                : "Completa los datos para crear una nueva publicación."}
            </DialogDescription>
          </DialogHeader>
          <PublicationForm
            publication={editing}
            missions={missions ?? []}
            busy={busy}
            error={mutationError}
            onSubmit={save}
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pending)}
        title={
          action === "delete"
            ? "Eliminar publicación"
            : pending?.status === "PUBLISHED"
              ? "Despublicar publicación"
              : "Publicar publicación"
        }
        description={
          action === "delete"
            ? "Esta acción no se puede deshacer."
            : `¿Quieres ${pending?.status === "PUBLISHED" ? "despublicar" : "publicar"} ${pending?.title ?? "esta publicación"}?`
        }
        confirmLabel={
          action === "delete"
            ? "Eliminar"
            : pending?.status === "PUBLISHED"
              ? "Despublicar"
              : "Publicar"
        }
        destructive={action === "delete"}
        onConfirm={confirm}
        onCancel={() => {
          setPending(null);
          setAction(null);
        }}
      />
    </section>
  );
}
