import { useCallback, useEffect, useState } from "react";
import type { CreateVerseInput, VerseAdmin } from "./adminTypes.js";
import { createVerse, deleteVerse, listVerses } from "./versesApi.js";
import { mapAdminError } from "./adminErrors.js";

type FormErrors = Partial<Record<keyof CreateVerseInput, string>>;

const EMPTY_FORM: CreateVerseInput = { text: "", reference: "" };

function formatBusinessDate(value: string): string {
  const dateOnly = value.slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function VersesPage() {
  const [rows, setRows] = useState<VerseAdmin[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateVerseInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState<Set<string>>(new Set());
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setRows(await listVerses());
    } catch (error) {
      setLoadError(mapAdminError(error).root);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const validate = (): FormErrors => {
    const errors: FormErrors = {};
    if (!form.text.trim()) errors.text = "El texto es obligatorio.";
    if (!form.reference.trim())
      errors.reference = "La referencia es obligatoria.";
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
      const created = await createVerse({
        text: form.text.trim(),
        reference: form.reference.trim(),
      });
      setRows((current) => [created, ...(current ?? [])]);
      setForm(EMPTY_FORM);
      setFieldErrors({});
    } catch (error) {
      setCreateError(mapAdminError(error).root);
    } finally {
      setCreatePending(false);
    }
  };

  const handleDelete = async (row: VerseAdmin) => {
    if (deletePending.has(row.id)) return;
    if (
      !window.confirm(
        `¿Eliminar este versículo de forma permanente?\n\n${row.reference}`,
      )
    ) {
      return;
    }

    setDeleteErrors((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });
    setDeletePending((current) => new Set(current).add(row.id));
    try {
      await deleteVerse(row.id);
      setRows(
        (current) => current?.filter((item) => item.id !== row.id) ?? current,
      );
    } catch (error) {
      setDeleteErrors((current) => ({
        ...current,
        [row.id]: mapAdminError(error).root,
      }));
    } finally {
      setDeletePending((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  };

  return (
    <section data-testid="verses-page">
      <h1>Versículos</h1>
      <p>Revisa y administra los versículos disponibles para el ministerio.</p>

      <section aria-labelledby="create-verse-heading">
        <h2 id="create-verse-heading">Crear versículo</h2>
        <form onSubmit={handleCreate} noValidate>
          <label htmlFor="verse-text">Texto</label>
          <textarea
            id="verse-text"
            name="text"
            value={form.text}
            onChange={(event) => setForm({ ...form, text: event.target.value })}
            aria-invalid={Boolean(fieldErrors.text)}
            disabled={createPending}
            required
          />
          {fieldErrors.text && <p role="alert">{fieldErrors.text}</p>}

          <label htmlFor="verse-reference">Referencia</label>
          <input
            id="verse-reference"
            name="reference"
            value={form.reference}
            onChange={(event) =>
              setForm({ ...form, reference: event.target.value })
            }
            aria-invalid={Boolean(fieldErrors.reference)}
            disabled={createPending}
            required
          />
          {fieldErrors.reference && <p role="alert">{fieldErrors.reference}</p>}

          <button type="submit" disabled={createPending}>
            {createPending ? "Creando…" : "Crear versículo"}
          </button>
          {createError && <p role="alert">{createError}</p>}
        </form>
      </section>

      <section aria-labelledby="verses-list-heading">
        <h2 id="verses-list-heading">Todos los versículos</h2>
        {rows === null && !loadError && <p>Cargando versículos…</p>}
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
            Todavía no hay versículos. Usa el formulario de arriba para crear
            uno.
          </p>
        )}
        {rows !== null && rows.length > 0 && (
          <table data-testid="verses-table">
            <thead>
              <tr>
                <th>Texto</th>
                <th>Referencia</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pending = deletePending.has(row.id);
                return (
                  <tr key={row.id} data-testid={`verse-row-${row.id}`}>
                    <td>{row.text}</td>
                    <td>{row.reference}</td>
                    <td>{formatBusinessDate(row.date)}</td>
                    <td>{row.status}</td>
                    <td>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void handleDelete(row)}
                      >
                        {pending ? "Eliminando…" : "Eliminar"}
                      </button>
                      {deleteErrors[row.id] && (
                        <p role="alert">{deleteErrors[row.id]}</p>
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
