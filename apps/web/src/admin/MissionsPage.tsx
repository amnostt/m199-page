import {
  Fragment,
  useCallback,
  useEffect,
  useState,
  type ElementType,
  type SyntheticEvent,
} from "react";
import { MoreHorizontalIcon, PlusIcon } from "lucide-react";
import type { MissionAdmin } from "./adminTypes.js";
import { FileUploadWidget } from "./FileUploadWidget.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { mapAdminError } from "./adminErrors.js";
import {
  createMission,
  listActiveMissions,
  listArchivedMissions,
  updateMission,
  updateMissionStatus,
} from "./missionsApi.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog.js";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../components/ui/context-menu.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu.js";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "../components/ui/field.js";
import { Input } from "../components/ui/input.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs.js";
import { Textarea } from "../components/ui/textarea.js";
import {
  isUrlSafeSlug,
  suggestSlugFromTitle,
  URL_SAFE_SLUG_DESCRIPTION,
  URL_SAFE_SLUG_ERROR,
  URL_SAFE_SLUG_PATTERN,
} from "./slugValidation.js";

type Form = {
  title: string;
  slug: string;
  heroImageId: string;
  profileImageId: string | null;
  heroPhrase: string;
};
const EMPTY: Form = {
  title: "",
  slug: "",
  heroImageId: "",
  profileImageId: null,
  heroPhrase: "",
};

type RowAction = {
  id: string;
  label: string;
  onSelect: () => void;
  group: number;
  destructive?: boolean;
};

type ActionMenu = {
  Group: ElementType;
  Label: ElementType;
  Item: ElementType;
  Separator: ElementType;
};

function RowActionItems({
  actions,
  menu,
}: {
  actions: readonly RowAction[];
  menu: ActionMenu;
}) {
  const groups = actions.reduce<RowAction[][]>((result, action) => {
    (result[action.group] ??= []).push(action);
    return result;
  }, []);
  const Group = menu.Group;
  const Label = menu.Label;
  const Item = menu.Item;
  const Separator = menu.Separator;

  return groups.map((group, index) => (
    <Fragment key={`action-group-${index}`}>
      {index > 0 && <Separator />}
      <Group>
        {index === 0 && <Label>Acciones</Label>}
        {group.map((action) => (
          <Item
            key={action.id}
            className={
              action.destructive
                ? "text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
                : undefined
            }
            onClick={action.onSelect}
          >
            {action.label}
          </Item>
        ))}
      </Group>
    </Fragment>
  ));
}

const missionActionMenu = {
  Group: ContextMenuGroup,
  Label: ContextMenuLabel,
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
};

const missionDropdownActionMenu = {
  Group: DropdownMenuGroup,
  Label: DropdownMenuLabel,
  Item: DropdownMenuItem,
  Separator: DropdownMenuSeparator,
};

function missionRowActions(
  mission: MissionAdmin,
  onEdit: (mission: MissionAdmin) => void,
  onStatus: (mission: MissionAdmin) => void,
): RowAction[] {
  return [
    { id: "edit", label: "Editar", onSelect: () => onEdit(mission), group: 0 },
    {
      id: "status",
      label: mission.status === "ACTIVE" ? "Archivar" : "Reactivar",
      onSelect: () => onStatus(mission),
      group: 1,
    },
  ];
}

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
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2
          id={`${testId}-heading`}
          className="text-lg font-semibold tracking-tight"
        >
          {heading}
        </h2>
        <span className="text-sm text-muted-foreground">
          {missions.length} {missions.length === 1 ? "misión" : "misiones"}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Frase</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-16 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {missions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              missions.map((mission) => {
                const actions = missionRowActions(mission, onEdit, onStatus);
                return (
                  <ContextMenu key={mission.id}>
                    <ContextMenuTrigger
                      render={
                        <TableRow data-testid={`mission-${mission.id}`} />
                      }
                    >
                      <TableCell className="font-medium">
                        {mission.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {mission.slug}
                      </TableCell>
                      <TableCell className="max-w-[22rem] truncate">
                        {mission.heroPhrase}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            mission.status === "ACTIVE"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {mission.status === "ACTIVE" ? "Activa" : "Archivada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Acciones para ${mission.title}`}
                              />
                            }
                          >
                            <MoreHorizontalIcon aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <RowActionItems
                              actions={actions}
                              menu={missionDropdownActionMenu}
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-44">
                      <RowActionItems
                        actions={actions}
                        menu={missionActionMenu}
                      />
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function MissionsPage() {
  const [active, setActive] = useState<MissionAdmin[] | null>(null);
  const [archived, setArchived] = useState<MissionAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<MissionAdmin | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [pending, setPending] = useState(false);
  const [statusTarget, setStatusTarget] = useState<MissionAdmin | null>(null);

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

  const resetForm = () => {
    setEditing(null);
    setForm(EMPTY);
    setMutationError(null);
    setSlugError(null);
    setSlugManuallyEdited(false);
  };

  const closeForm = () => {
    if (pending) return;
    setDialogOpen(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const edit = (mission: MissionAdmin) => {
    setEditing(mission);
    setForm({
      title: mission.title,
      slug: mission.slug,
      heroImageId: mission.heroImageId,
      profileImageId: mission.profileImageId,
      heroPhrase: mission.heroPhrase,
    });
    setSlugManuallyEdited(true);
    setMutationError(null);
    setSlugError(null);
    setDialogOpen(true);
  };

  const save = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const values = {
      title: form.title.trim(),
      slug: form.slug,
      heroImageId: form.heroImageId,
      profileImageId: editing
        ? form.profileImageId
        : (form.profileImageId ?? undefined),
      heroPhrase: form.heroPhrase.trim(),
    };
    const nextSlugError = !values.slug
      ? "El slug es obligatorio."
      : !isUrlSafeSlug(values.slug)
        ? URL_SAFE_SLUG_ERROR
        : null;
    setSlugError(nextSlugError);
    if (nextSlugError) {
      setMutationError(
        !values.slug
          ? "Completa el título, el slug, la imagen y la frase."
          : null,
      );
      return;
    }
    if (!values.title || !values.heroImageId || !values.heroPhrase) {
      setMutationError("Completa el título, el slug, la imagen y la frase.");
      return;
    }
    setPending(true);
    setMutationError(null);
    try {
      if (editing) await updateMission(editing.id, values);
      else await createMission(values);
      setDialogOpen(false);
      resetForm();
      load();
    } catch (reason) {
      setMutationError(mapAdminError(reason).root);
    } finally {
      setPending(false);
    }
  };

  const changeStatus = async () => {
    if (!statusTarget) return;
    const mission = statusTarget;
    const next = mission.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    setStatusTarget(null);
    setPending(true);
    setMutationError(null);
    try {
      await updateMissionStatus(mission.id, next);
      load();
    } catch (reason) {
      setMutationError(mapAdminError(reason).root);
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className="mx-auto flex min-w-0 w-full max-w-6xl flex-col gap-6"
      data-testid="missions-page"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Misiones</h1>
          <p className="text-sm text-muted-foreground">
            Administra las misiones activas y archivadas.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <PlusIcon data-icon="inline-start" />
          Nueva misión
        </Button>
      </header>

      {mutationError && !dialogOpen && (
        <Alert variant="destructive">
          <AlertDescription>{mutationError}</AlertDescription>
        </Alert>
      )}

      {active === null || archived === null
        ? !error && (
            <p role="status" className="text-sm text-muted-foreground">
              Cargando misiones…
            </p>
          )
        : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button type="button" variant="outline" onClick={load}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : active !== null && archived !== null ? (
        <Tabs defaultValue="active" className="min-w-0">
          <TabsList aria-label="Filtrar misiones por estado">
            <TabsTrigger value="active">Activas ({active.length})</TabsTrigger>
            <TabsTrigger value="archived">
              Archivadas ({archived.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4 min-w-0">
            <MissionList
              heading="Misiones activas"
              empty="Todavía no hay misiones activas."
              missions={active}
              testId="active-missions"
              onEdit={edit}
              onStatus={setStatusTarget}
            />
          </TabsContent>
          <TabsContent value="archived" className="mt-4 min-w-0">
            <MissionList
              heading="Misiones archivadas"
              empty="Todavía no hay misiones archivadas."
              missions={archived}
              testId="archived-missions"
              onEdit={edit}
              onStatus={setStatusTarget}
            />
          </TabsContent>
        </Tabs>
      ) : null}

      <Dialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeForm();
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar misión" : "Nueva misión"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Actualiza los datos de la misión y guarda los cambios."
                : "Completa los datos para publicar una nueva misión activa."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} noValidate aria-busy={pending}>
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="mission-title">Título</FieldLabel>
                  <Input
                    id="mission-title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                        ...(!editing && !slugManuallyEdited
                          ? { slug: suggestSlugFromTitle(event.target.value) }
                          : {}),
                      }))
                    }
                    disabled={pending}
                    required
                  />
                </Field>
                <Field data-invalid={Boolean(slugError)}>
                  <FieldLabel htmlFor="mission-slug">Slug</FieldLabel>
                  <Input
                    id="mission-slug"
                    value={form.slug}
                    onChange={(event) => {
                      setSlugManuallyEdited(true);
                      setForm((current) => ({
                        ...current,
                        slug: event.target.value,
                      }));
                      setSlugError(null);
                    }}
                    onInput={() => setSlugManuallyEdited(true)}
                    aria-invalid={Boolean(slugError)}
                    aria-describedby={
                      slugError
                        ? "mission-slug-description mission-slug-error"
                        : "mission-slug-description"
                    }
                    pattern={URL_SAFE_SLUG_PATTERN}
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={pending}
                    required
                  />
                  <FieldDescription id="mission-slug-description">
                    Se usará en la URL pública de la misión.{" "}
                    {URL_SAFE_SLUG_DESCRIPTION}
                  </FieldDescription>
                  {slugError && (
                    <FieldError id="mission-slug-error">{slugError}</FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="mission-phrase">Frase</FieldLabel>
                  <Textarea
                    id="mission-phrase"
                    value={form.heroPhrase}
                    onChange={(event) =>
                      setForm({ ...form, heroPhrase: event.target.value })
                    }
                    disabled={pending}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Imagen hero</FieldLabel>
                  <FileUploadWidget
                    category="MISSION_HERO"
                    fileId={form.heroImageId || null}
                    onUploaded={(asset) =>
                      setForm({ ...form, heroImageId: asset.id })
                    }
                    onRemove={() => setForm({ ...form, heroImageId: "" })}
                    preview
                    previewVariant="hero"
                    previewAlt={`Imagen hero de ${form.title || "la misión"}`}
                    data-testid="mission-hero-upload"
                  />
                </Field>
                <Field>
                  <FieldLabel>Imagen de perfil o logotipo</FieldLabel>
                  <FileUploadWidget
                    category="OTHER"
                    fileId={form.profileImageId}
                    onUploaded={(asset) =>
                      setForm({ ...form, profileImageId: asset.id })
                    }
                    onRemove={() => setForm({ ...form, profileImageId: null })}
                    preview
                    previewVariant="logo"
                    previewAlt={`Logotipo de ${form.title || "la misión"}`}
                    description="Formatos: JPG, PNG, WebP o GIF. Tamaño máximo: 10 MB."
                    data-testid="mission-profile-upload"
                  />
                  <FieldDescription>
                    Se muestra como identificador de la misión y conserva sus
                    proporciones.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldSet>
            {mutationError && (
              <Alert variant="destructive" className="mt-5">
                <AlertDescription>{mutationError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending
                  ? "Guardando…"
                  : editing
                    ? "Guardar cambios"
                    : "Crear misión"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={
          statusTarget?.status === "ACTIVE"
            ? "Archivar misión"
            : "Reactivar misión"
        }
        description={`¿Quieres ${statusTarget?.status === "ACTIVE" ? "archivar" : "reactivar"} ${statusTarget?.title ?? "esta misión"}?`}
        confirmLabel={
          statusTarget?.status === "ACTIVE" ? "Archivar" : "Reactivar"
        }
        destructive={statusTarget?.status === "ACTIVE"}
        onConfirm={changeStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </section>
  );
}
