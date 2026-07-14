// ---------------------------------------------------------------------------
// outingsApi — adminFetch wrappers and helpers for Outings admin CRUD.
//
// URL conventions:
//   GET    /outings/admin[?status=...]   — list
//   POST   /outings/admin                 — create
//   PATCH  /outings/admin/:id             — update
//   POST   /outings/admin/:id/archive     — archive (status → ARCHIVED)
//
// Date convention:
//   The form uses the HTML datetime-local format (YYYY-MM-DDTHH:mm, no
//   timezone). The API expects ISO 8601 UTC strings. The two helpers
//   (formatOutingDateTime, parseOutingDateTime) and the buildOutingPayload
//   helper bridge the two without leaking dates into the form components.
// ---------------------------------------------------------------------------

import { adminFetch } from "./session.js";
import type { OutingAdmin, OutingForm, OutingStatus } from "./adminTypes.js";

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Base path shared by every Outings admin endpoint. */
const OUTINGS_ADMIN_BASE = "/outings/admin";

/**
 * Build the listOutings URL. When status is provided, the API filters
 * server-side and retains ordering. When status is undefined we send no
 * query string so the server returns every status.
 */
export function buildOutingsListUrl(status?: OutingStatus): string {
  if (!status) return OUTINGS_ADMIN_BASE;
  return `${OUTINGS_ADMIN_BASE}?status=${encodeURIComponent(status)}`;
}

/**
 * Build the resource URL for a single outing. Used by update/archive.
 */
export function buildOutingResourceUrl(id: string): string {
  return `${OUTINGS_ADMIN_BASE}/${encodeURIComponent(id)}`;
}

/**
 * Build the archive endpoint URL. Centralised so callers and tests can
 * refer to the same path; the form's lifecycle action uses this for the
 * confirmed archive POST.
 */
export function buildOutingArchiveUrl(id: string): string {
  return `${buildOutingResourceUrl(id)}/archive`;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Convert an ISO UTC string from the API into the HTML datetime-local input
 * value (YYYY-MM-DDTHH:mm). The conversion is timezone-naive: we extract the
 * YYYY-MM-DDTHH:mm prefix from the ISO string without applying timezone
 * shifts, so the value the operator sees in the input matches the value the
 * server stored (regardless of the browser's local timezone). Returns "" for
 * null/undefined/empty input.
 */
export function formatOutingDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(iso);
  return match?.[1] ?? "";
}

/**
 * Convert a datetime-local input value (YYYY-MM-DDTHH:mm) into an ISO UTC
 * string. The conversion is timezone-naive: the operator's input is appended
 * with ":00.000Z" so the value travels to the server as the same wall-clock
 * time the operator typed (no browser-local offset is applied). Returns null
 * for null/undefined/empty input so callers can omit the field from update
 * payloads.
 */
export function parseOutingDateTime(
  local: string | null | undefined,
): string | null {
  if (!local) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  return `${local}:00.000Z`;
}

// ---------------------------------------------------------------------------
// Payload helper
// ---------------------------------------------------------------------------

/**
 * Build the request body for create/update. dateTime is converted to ISO
 * (parseOutingDateTime returns null for empty input — that case yields an
 * invalid payload and the form guards against it). Asset IDs are always
 * sent; the backend distinguishes null from omitted on update, and on
 * create null is the documented default.
 */
export function buildOutingPayload(
  form: OutingForm,
): Record<string, unknown> {
  return {
    title: form.title,
    slug: form.slug,
    dateTime: parseOutingDateTime(form.dateTime),
    location: form.location,
    description: form.description,
    mainImageId: form.mainImageId,
    croquisId: form.croquisId,
    planId: form.planId,
    status: form.status,
  };
}

// ---------------------------------------------------------------------------
// API wrappers — read-only
// ---------------------------------------------------------------------------

/**
 * List outings. When status is provided the request includes the
 * server-side filter; when undefined the server returns every status.
 */
export function listOutings(status?: OutingStatus): Promise<OutingAdmin[]> {
  return adminFetch<OutingAdmin[]>(buildOutingsListUrl(status));
}

/**
 * Fetch a single outing by id. The list row already contains every editable
 * field, so this is a thin pass-through reserved for explicit detail loads
 * and for parity with the postsApi.
 */
export function getOuting(id: string): Promise<OutingAdmin> {
  return adminFetch<OutingAdmin>(buildOutingResourceUrl(id));
}

// ---------------------------------------------------------------------------
// API wrappers — create / update
// ---------------------------------------------------------------------------

/**
 * Create a new outing. Status is read from form.status (form lets the
 * operator pick DRAFT or PUBLISHED on save).
 */
export function createOuting(form: OutingForm): Promise<OutingAdmin> {
  return adminFetch<OutingAdmin>(OUTINGS_ADMIN_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildOutingPayload(form)),
  });
}

/**
 * Update an existing outing. Sends the same payload shape as create; the
 * backend treats every field as optional on PATCH.
 */
export function updateOuting(
  id: string,
  form: OutingForm,
): Promise<OutingAdmin> {
  return adminFetch<OutingAdmin>(buildOutingResourceUrl(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildOutingPayload(form)),
  });
}

// ---------------------------------------------------------------------------
// API wrappers — lifecycle
// ---------------------------------------------------------------------------

/**
 * Archive an outing. Sets the outing's status to ARCHIVED via the
 * dedicated archive endpoint — no payload is sent.
 */
export function archiveOuting(id: string): Promise<OutingAdmin> {
  return adminFetch<OutingAdmin>(buildOutingArchiveUrl(id), {
    method: "POST",
  });
}
