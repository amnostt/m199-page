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
 * Options for {@link buildOutingPayload}.
 *
 * - `omitNullAssets`: when true, null optional asset IDs (mainImageId,
 *   croquisId, planId) are OMITTED from the body. The Outings API's
 *   PATCH handler treats an absent field as "preserve existing value"
 *   and a present `null` as "clear the asset" (see
 *   `apps/api/src/outings/outings.service.ts` update()). To honor the
 *   "Existing assets are retained" spec scenario, PATCH payloads must
 *   omit null asset IDs so an edit that changes unrelated fields does
 *   not clobber existing asset references. Create payloads keep the
 *   documented default of including null (null is the explicit unset
 *   value on create).
 */
export interface BuildOutingPayloadOptions {
  omitNullAssets?: boolean;
}

/**
 * Build the request body for create/update. dateTime is converted to ISO
 * (parseOutingDateTime returns null for empty input — that case yields an
 * invalid payload and the form guards against it). When the
 * `omitNullAssets` option is true, null optional asset IDs are omitted
 * from the body so the server preserves the existing values (PATCH
 * behavior). The default behavior includes null asset IDs so create
 * payloads remain explicit about the unset state.
 */
export function buildOutingPayload(
  form: OutingForm,
  options: BuildOutingPayloadOptions = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: form.title,
    slug: form.slug,
    dateTime: parseOutingDateTime(form.dateTime),
    location: form.location,
    description: form.description,
    status: form.status,
  };

  if (options.omitNullAssets) {
    if (form.mainImageId !== null) payload.mainImageId = form.mainImageId;
    if (form.croquisId !== null) payload.croquisId = form.croquisId;
    if (form.planId !== null) payload.planId = form.planId;
  } else {
    payload.mainImageId = form.mainImageId;
    payload.croquisId = form.croquisId;
    payload.planId = form.planId;
  }

  return payload;
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
 * Update an existing outing. The PATCH payload OMITS null optional asset
 * IDs (mainImageId, croquisId, planId) so the server preserves the
 * existing asset references when the operator edits unrelated fields.
 * The backend's update() handler treats an absent field as "preserve
 * existing" and a present `null` as "clear the asset" — omitting null
 * assets is required to honor the "Existing assets are retained" spec
 * scenario. Required fields (title, slug, dateTime, location,
 * description) and the current status are always sent.
 */
export function updateOuting(
  id: string,
  form: OutingForm,
): Promise<OutingAdmin> {
  return adminFetch<OutingAdmin>(buildOutingResourceUrl(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildOutingPayload(form, { omitNullAssets: true })),
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

export interface FeaturedOutingState {
  featuredOutingId: string | null;
}

export function featureOuting(id: string): Promise<FeaturedOutingState> {
  return adminFetch<FeaturedOutingState>(
    `${buildOutingResourceUrl(id)}/feature`,
    {
      method: "POST",
    },
  );
}

export function clearFeaturedOuting(): Promise<FeaturedOutingState> {
  return adminFetch<FeaturedOutingState>(`${OUTINGS_ADMIN_BASE}/feature`, {
    method: "DELETE",
  });
}
