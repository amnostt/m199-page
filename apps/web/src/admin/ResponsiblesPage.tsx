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

  const handleCreate = async (event: React.FormEvent) => {
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
    <section data-testid="responsibles-page">
      <h1>Responsables</h1>
      <p>
        Administra las personas responsables que pueden acceder al área de
        administración.
      </p>

      <section aria-labelledby="create-responsible-heading">
        <h2 id="create-responsible-heading">Crear responsable</h2>
        <form onSubmit={handleCreate} noValidate>
          <label htmlFor="responsible-email">Correo electrónico</label>
          <input
            id="responsible-email"
            name="email"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            aria-invalid={Boolean(fieldErrors.email)}
            disabled={createPending}
            required
          />
          {fieldErrors.email && <p role="alert">{fieldErrors.email}</p>}

          <label htmlFor="responsible-display-name">Nombre visible</label>
          <input
            id="responsible-display-name"
            name="displayName"
            value={form.displayName}
            onChange={(event) =>
              setForm({ ...form, displayName: event.target.value })
            }
            aria-invalid={Boolean(fieldErrors.displayName)}
            disabled={createPending}
            required
          />
          {fieldErrors.displayName && (
            <p role="alert">{fieldErrors.displayName}</p>
          )}

          <label htmlFor="responsible-password">Contraseña inicial</label>
          <input
            id="responsible-password"
            name="password"
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            aria-invalid={Boolean(fieldErrors.password)}
            disabled={createPending}
            required
          />
          {fieldErrors.password && <p role="alert">{fieldErrors.password}</p>}
          <button type="submit" disabled={createPending}>
            {createPending ? "Creando…" : "Crear responsable"}
          </button>
          {createError && <p role="alert">{createError}</p>}
        </form>
      </section>

      <section aria-labelledby="responsibles-list-heading">
        <h2 id="responsibles-list-heading">Personas responsables</h2>
        {rows === null && !loadError && <p>Cargando personas responsables…</p>}
        {loadError && (
          <div role="alert">
            <p>{loadError}</p>
            <button type="button" onClick={() => void load()}>
              Reintentar
            </button>
          </div>
        )}
        {rows !== null && rows.length === 0 && (
          <p>
            Todavía no hay personas responsables. Usa el formulario de arriba
            para crear una.
          </p>
        )}
        {rows !== null && rows.length > 0 && (
          <table data-testid="responsibles-table">
            <thead>
              <tr>
                <th>Correo electrónico</th>
                <th>Nombre visible</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pending = statusPending.has(row.id);
                const selfDeactivationBlocked =
                  row.id === currentUserId && row.status === "ACTIVE";
                const nextStatus: ResponsibleStatus =
                  row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                return (
                  <tr key={row.id} data-testid={`responsible-row-${row.id}`}>
                    <td>{row.email}</td>
                    <td>{row.displayName}</td>
                    <td>{row.status}</td>
                    <td>
                      <button
                        type="button"
                        disabled={pending || selfDeactivationBlocked}
                        onClick={() => void handleStatus(row, nextStatus)}
                      >
                        {pending
                          ? "Guardando…"
                          : row.status === "ACTIVE"
                            ? "Desactivar"
                            : "Activar"}
                      </button>
                      {selfDeactivationBlocked && (
                        <span> No puedes desactivar tu propia cuenta.</span>
                      )}
                      {statusErrors[row.id] && (
                        <p role="alert">{statusErrors[row.id]}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}
