import { useCallback, useEffect, useState } from "react";
import type {
  CreateResponsibleInput,
  Responsible,
  ResponsibleStatus,
} from "./adminTypes.js";
import {
  createResponsible,
  listResponsibles,
  updateResponsibleStatus,
} from "./responsiblesApi.js";
import { mapAdminError } from "./adminErrors.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent } from "../components/ui/card.js";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
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

type FormValues = CreateResponsibleInput;
type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_FORM: FormValues = { email: "", displayName: "", password: "" };

export function ResponsiblesPage({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<Responsible[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [statusPending, setStatusPending] = useState<Set<string>>(new Set());
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setRows(await listResponsibles());
    } catch (error) {
      setLoadError(mapAdminError(error).root);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const validate = (): FormErrors => {
    const errors: FormErrors = {};
    if (!form.email.trim())
      errors.email = "El correo electrónico es obligatorio.";
    if (!form.displayName.trim()) {
      errors.displayName = "El nombre visible es obligatorio.";
    }
    if (form.password.length < 8) {
      errors.password = "La contraseña debe tener al menos 8 caracteres.";
    }
    return errors;
  };

  const handleCreate = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createPending) return;
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCreatePending(true);
    setCreateError(null);
    try {
      const created = await createResponsible({
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        password: form.password,
      });
      setRows((current) => [created, ...(current ?? [])]);
      setForm(EMPTY_FORM);
      setFieldErrors({});
    } catch (error) {
      setCreateError(mapAdminError(error).root);
      setForm((current) => ({ ...current, password: "" }));
    } finally {
      setCreatePending(false);
    }
  };

  const handleStatus = async (row: Responsible, status: ResponsibleStatus) => {
    if (statusPending.has(row.id)) return;
    if (
      row.id === currentUserId &&
      row.status === "ACTIVE" &&
      status === "INACTIVE"
    ) {
      return;
    }
    setStatusErrors((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });
    setStatusPending((current) => new Set(current).add(row.id));
    try {
      const updated = await updateResponsibleStatus(row.id, status);
      setRows(
        (current) =>
          current?.map((item) => (item.id === updated.id ? updated : item)) ??
          current,
      );
    } catch (error) {
      setStatusErrors((current) => ({
        ...current,
        [row.id]: mapAdminError(error).root,
      }));
    } finally {
      setStatusPending((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  };

  return (
    <section
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      data-testid="responsibles-page"
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Responsables</h1>
        <p className="text-sm text-muted-foreground">
          Administra las personas responsables que pueden acceder al área de
          administración.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <section aria-labelledby="create-responsible-heading">
          <Card className="h-full shadow-none">
            <CardContent className="pt-6">
              <form
                onSubmit={handleCreate}
                noValidate
                aria-busy={createPending}
              >
                <FieldSet>
                  <FieldLegend id="create-responsible-heading">
                    Crear responsable
                  </FieldLegend>
                  <FieldDescription>
                    Completá los datos para habilitar un nuevo acceso al área de
                    administración.
                  </FieldDescription>
                  <FieldGroup>
                    <Field data-invalid={Boolean(fieldErrors.email)}>
                      <FieldLabel htmlFor="responsible-email">
                        Correo electrónico
                      </FieldLabel>
                      <Input
                        id="responsible-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        className="min-h-10"
                        value={form.email}
                        onChange={(event) =>
                          setForm({ ...form, email: event.target.value })
                        }
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-describedby={
                          fieldErrors.email
                            ? "responsible-email-error"
                            : undefined
                        }
                        disabled={createPending}
                        required
                      />
                      {fieldErrors.email && (
                        <FieldError id="responsible-email-error">
                          {fieldErrors.email}
                        </FieldError>
                      )}
                    </Field>

                    <Field data-invalid={Boolean(fieldErrors.displayName)}>
                      <FieldLabel htmlFor="responsible-display-name">
                        Nombre visible
                      </FieldLabel>
                      <Input
                        id="responsible-display-name"
                        name="displayName"
                        type="text"
                        autoComplete="name"
                        className="min-h-10"
                        value={form.displayName}
                        onChange={(event) =>
                          setForm({ ...form, displayName: event.target.value })
                        }
                        aria-invalid={Boolean(fieldErrors.displayName)}
                        aria-describedby={
                          fieldErrors.displayName
                            ? "responsible-display-name-error"
                            : undefined
                        }
                        disabled={createPending}
                        required
                      />
                      {fieldErrors.displayName && (
                        <FieldError id="responsible-display-name-error">
                          {fieldErrors.displayName}
                        </FieldError>
                      )}
                    </Field>

                    <Field data-invalid={Boolean(fieldErrors.password)}>
                      <FieldLabel htmlFor="responsible-password">
                        Contraseña inicial
                      </FieldLabel>
                      <Input
                        id="responsible-password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        className="min-h-10"
                        value={form.password}
                        onChange={(event) =>
                          setForm({ ...form, password: event.target.value })
                        }
                        aria-invalid={Boolean(fieldErrors.password)}
                        aria-describedby={
                          fieldErrors.password
                            ? "responsible-password-error"
                            : undefined
                        }
                        disabled={createPending}
                        required
                      />
                      {fieldErrors.password && (
                        <FieldError id="responsible-password-error">
                          {fieldErrors.password}
                        </FieldError>
                      )}
                    </Field>
                  </FieldGroup>
                  <Button
                    type="submit"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={createPending}
                    aria-busy={createPending}
                  >
                    {createPending ? "Creando…" : "Crear responsable"}
                  </Button>
                  {createError && (
                    <Alert
                      data-testid="responsibles-create-error"
                      variant="destructive"
                    >
                      <AlertDescription>{createError}</AlertDescription>
                    </Alert>
                  )}
                </FieldSet>
              </form>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="responsibles-list-heading">
          <Card className="h-full shadow-none">
            <CardContent className="pt-6">
              <div className="space-y-1">
                <h2
                  id="responsibles-list-heading"
                  className="text-lg font-semibold"
                >
                  Personas responsables
                </h2>
                <p className="text-sm text-muted-foreground">
                  Revisá y actualizá el estado de acceso de cada responsable.
                </p>
              </div>

              <div className="mt-6">
                {rows === null && !loadError && (
                  <p
                    className="text-sm text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    Cargando personas responsables…
                  </p>
                )}
                {loadError && (
                  <Alert
                    data-testid="responsibles-load-error"
                    variant="destructive"
                  >
                    <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                      <span>{loadError}</span>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => void load()}
                      >
                        Reintentar
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {rows !== null && rows.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Todavía no hay personas responsables. Usa el formulario de
                    arriba para crear una.
                  </p>
                )}
                {rows !== null && rows.length > 0 && (
                  <Table
                    data-testid="responsibles-table"
                    className="min-w-[44rem]"
                  >
                    <TableHeader>
                      <TableRow>
                        <TableHead>Correo electrónico</TableHead>
                        <TableHead>Nombre visible</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => {
                        const pending = statusPending.has(row.id);
                        const selfDeactivationBlocked =
                          row.id === currentUserId && row.status === "ACTIVE";
                        const nextStatus: ResponsibleStatus =
                          row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                        const statusErrorId = `responsible-status-error-${row.id}`;
                        const selfDeactivationId = `responsible-self-warning-${row.id}`;
                        const describedBy = [
                          selfDeactivationBlocked ? selfDeactivationId : null,
                          statusErrors[row.id] ? statusErrorId : null,
                        ]
                          .filter(Boolean)
                          .join(" ");
                        return (
                          <TableRow
                            key={row.id}
                            data-testid={`responsible-row-${row.id}`}
                          >
                            <TableCell>{row.email}</TableCell>
                            <TableCell>{row.displayName}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  row.status === "ACTIVE"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {row.status === "ACTIVE"
                                  ? "Activo"
                                  : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex min-w-44 flex-col items-start gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="min-h-11"
                                  disabled={pending || selfDeactivationBlocked}
                                  onClick={() =>
                                    void handleStatus(row, nextStatus)
                                  }
                                  aria-busy={pending}
                                  aria-describedby={describedBy || undefined}
                                >
                                  {pending
                                    ? "Guardando…"
                                    : row.status === "ACTIVE"
                                      ? "Desactivar"
                                      : "Activar"}
                                </Button>
                                {selfDeactivationBlocked && (
                                  <span
                                    id={selfDeactivationId}
                                    className="text-xs text-muted-foreground"
                                  >
                                    No puedes desactivar tu propia cuenta.
                                  </span>
                                )}
                                {statusErrors[row.id] && (
                                  <p
                                    id={statusErrorId}
                                    className="text-sm text-destructive"
                                    role="alert"
                                  >
                                    {statusErrors[row.id]}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </section>
  );
}
