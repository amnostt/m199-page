// ---------------------------------------------------------------------------
// OutingsListPage — server-filtered read-only outing list with archive
//
// - GET /outings/admin[?status=…] on mount AND on filter change
//   (server-side filtering per the design — preserves API ordering/pagination
//   contract and keeps server authority).
// - Status filter dropdown (All / DRAFT / PUBLISHED / ARCHIVED).
// - Loading, error, empty states.
// - Per-row archive action with window.confirm gate and per-row state
//   isolation (Record<outingId, "idle" | "pending" | "error">).
// - Server-returned archived row reconciles the local list (status update
//   from the API response, never from local guesswork).
// - Archive is hidden for ARCHIVED outings (no removal control — the API
//   does not expose a way to revert an archive in this slice).
// - Edit / New Outing entry points are surfaced through props callbacks
//   (the owner OutingsPage owns the view state machine).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import type { OutingAdmin, OutingStatus } from "./adminTypes.js";
import {
  listOutings,
  archiveOuting,
  clearFeaturedOuting,
  featureOuting,
} from "./outingsApi.js";
import { adminFetch } from "./session.js";
import { AdminRequestError } from "./session.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionState = "idle" | "pending" | "error";

type OutingsFilter = OutingStatus | "";

interface OutingsListPageProps {
  onCreateOuting?: () => void;
  onEditOuting?: (slug: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OutingsListPage({
  onCreateOuting,
  onEditOuting,
}: OutingsListPageProps) {
  const [outings, setOutings] = useState<OutingAdmin[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OutingsFilter>("");
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>(
    {},
  );
  // Per-row error message captured from the server's parsed response so the
  // UI can show the actual validation reason rather than a generic failure.
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [featuredOutingId, setFeaturedOutingId] = useState<string | null>(null);

  const refreshFeaturedState = useCallback(async () => {
    const rows = await listOutings(statusFilter || undefined);
    setOutings(rows);
    const settings = await adminFetch<{
      featuredOutingId?: string | null;
    } | null>("/landing/admin");
    if (settings && !Array.isArray(settings)) {
      setFeaturedOutingId(settings.featuredOutingId ?? null);
    }
  }, [statusFilter]);

  // Load (or re-load) on mount and on filter change.
  // Server-side filtering — the API returns the matching subset.
  useEffect(() => {
    let cancelled = false;

    setLoadError(false);
    setOutings(null);

    refreshFeaturedState()
      .then(() => {
        if (cancelled) return;
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshFeaturedState]);

  const handleFeature = useCallback(
    async (outing: OutingAdmin) => {
      if (
        featuredOutingId &&
        featuredOutingId !== outing.id &&
        !window.confirm(`Replace the featured outing with "${outing.title}"?`)
      )
        return;
      try {
        await featureOuting(outing.id);
        await refreshFeaturedState();
      } catch {
        setActionErrors((prev) => ({
          ...prev,
          [outing.id]: "Failed to update featured outing.",
        }));
      }
    },
    [featuredOutingId, refreshFeaturedState],
  );

  const handleClearFeatured = useCallback(async () => {
    try {
      await clearFeaturedOuting();
      await refreshFeaturedState();
    } catch {
      setActionErrors((prev) => ({
        ...prev,
        featured: "Failed to update featured outing.",
      }));
    }
  }, [refreshFeaturedState]);

  // ------------------------------------------------------------------
  // Archive handler
  // ------------------------------------------------------------------

  const handleArchive = useCallback(
    async (outing: OutingAdmin) => {
      if (!window.confirm(`Archive "${outing.title}"?`)) return;

      setActionStates((prev) => ({ ...prev, [outing.id]: "pending" }));
      setActionErrors((prev) => {
        const next = { ...prev };
        delete next[outing.id];
        return next;
      });

      try {
        const updated = await archiveOuting(outing.id);
        // Reconcile list state from the server's response — never assume
        // success locally.
        //
        // WU2-WARN-1: when the active status filter is DRAFT or PUBLISHED,
        // the newly-archived row no longer matches the filter and must be
        // removed from the visible list (showing an ARCHIVED row under a
        // DRAFT/PUBLISHED filter would contradict the active filter). The
        // All and ARCHIVED filters keep the row with its updated status.
        const filterExcludesArchived =
          statusFilter === "DRAFT" || statusFilter === "PUBLISHED";
        if (filterExcludesArchived) {
          setOutings((prev) =>
            prev === null ? prev : prev.filter((o) => o.id !== updated.id),
          );
        } else {
          setOutings((prev) =>
            prev === null
              ? prev
              : prev.map((o) => (o.id === updated.id ? updated : o)),
          );
        }
        setActionStates((prev) => ({ ...prev, [outing.id]: "idle" }));
      } catch (err) {
        setActionStates((prev) => ({ ...prev, [outing.id]: "error" }));
        if (err instanceof AdminRequestError) {
          setActionErrors((prev) => ({ ...prev, [outing.id]: err.message }));
        }
      }
    },
    [statusFilter],
  );

  // ------------------------------------------------------------------
  // States
  // ------------------------------------------------------------------

  // Load error
  if (loadError) {
    return (
      <div data-testid="outings-list-load-error">
        <p>Failed to load outings. Please try again.</p>
      </div>
    );
  }

  // Loading
  if (outings === null) {
    return (
      <div data-testid="outings-list-loading">
        <p>Loading…</p>
      </div>
    );
  }

  // Empty
  if (outings.length === 0) {
    return (
      <div data-testid="outings-list-empty">
        <p>No outings found.</p>
        {onCreateOuting && (
          <button type="button" onClick={onCreateOuting}>
            New Outing
          </button>
        )}
        <label htmlFor="outings-filter-status">Status</label>
        <select
          id="outings-filter-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OutingsFilter)}
        >
          <option value="">All</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>
    );
  }

  // Loaded — render table
  return (
    <div data-testid="outings-list-table">
      <h2>Outings</h2>

      {featuredOutingId && (
        <button type="button" onClick={handleClearFeatured}>
          Clear featured outing
        </button>
      )}
      {actionErrors.featured && <p>{actionErrors.featured}</p>}

      {onCreateOuting && (
        <button type="button" onClick={onCreateOuting}>
          New Outing
        </button>
      )}

      <label htmlFor="outings-filter-status">Status</label>
      <select
        id="outings-filter-status"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as OutingsFilter)}
      >
        <option value="">All</option>
        <option value="DRAFT">DRAFT</option>
        <option value="PUBLISHED">PUBLISHED</option>
        <option value="ARCHIVED">ARCHIVED</option>
      </select>

      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Location</th>
            {onEditOuting && <th />}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {outings.map((outing) => (
            <tr key={outing.id}>
              <td>{outing.title}</td>
              <td>{outing.slug}</td>
              <td>{outing.status}</td>
              <td>{outing.location}</td>
              {onEditOuting && (
                <td>
                  <button
                    type="button"
                    onClick={() => onEditOuting(outing.slug)}
                  >
                    Edit
                  </button>
                </td>
              )}
              <td>
                {outing.status === "PUBLISHED" && (
                  <>
                    {featuredOutingId === outing.id && (
                      <span data-testid={`featured-outing-${outing.id}`}>
                        Featured
                      </span>
                    )}
                    <button
                      type="button"
                      data-testid={`feature-outing-${outing.id}`}
                      onClick={() => handleFeature(outing)}
                    >
                      Feature outing
                    </button>
                  </>
                )}
                {outing.status !== "ARCHIVED" && (
                  <button
                    type="button"
                    data-testid={`lifecycle-archive-${outing.id}`}
                    disabled={actionStates[outing.id] === "pending"}
                    onClick={() => handleArchive(outing)}
                  >
                    Archive
                  </button>
                )}
                {actionStates[outing.id] === "error" && (
                  <span data-testid={`lifecycle-error-${outing.id}`}>
                    Action failed
                  </span>
                )}
                {actionErrors[outing.id] && (
                  <span data-testid={`lifecycle-error-message-${outing.id}`}>
                    {actionErrors[outing.id]}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
