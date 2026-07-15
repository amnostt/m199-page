// ---------------------------------------------------------------------------
// OutingFormPage — create/edit form for Outings.
//
// Two modes:
//   - mode="create" → empty form → POST /outings/admin on save
//   - mode="edit"   → GET /outings/admin (list-only admin read contract),
//                     locate the row by the supplied slug, use that row's
//                     `id` for the PATCH /outings/admin/:id save. The API
//                     does not expose a GET-by-id endpoint for outings, so
//                     the form performs a client-side filter on the list
//                     response (mirrors the design's "list response already
//                     contains every editable field" decision).
//
// The state machine, effects, and save/upload handlers live in the
// `useOutingForm` hook (WU3 refactor — Task 3.3). This component is the
// thin render layer: it reads form/error state from the hook and wires
// the form fields, three FileUploadWidget slots, action buttons, and
// inline error messages around it.
//
// Existing assets are shown as links/previews; no clearing control is
// offered (PATCH omitNullAssets preserves the existing asset reference;
// clearing semantics are deferred until the API distinguishes omitted
// IDs from null-clearing). The widget's onRemove is wired to a no-op so
// the form never offers a removal affordance.
//
// Errors:
//   - Local validation (empty title) renders an inline error and
//     blocks the request.
//   - Server validation errors are surfaced via the parsed
//     AdminRequestError.message; onSaved is NOT called when the request
//     fails (no false success).
//   - Load errors (edit-mode GET failure or slug-not-found) render a
//     recoverable "Back to Outings" state that calls onCancel.
// ---------------------------------------------------------------------------

import { useOutingForm } from "./useOutingForm.js";
import { FileUploadWidget } from "./FileUploadWidget.js";
import type { OutingStatus } from "./adminTypes.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface OutingFormPageProps {
  mode: "create" | "edit";
  slug?: string;
  onSaved: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OutingFormPage(props: OutingFormPageProps) {
  const { mode, onCancel } = props;
  const {
    form,
    loadError,
    saving,
    saveError,
    validationError,
    archived,
    handleChange,
    handleMainUploaded,
    handleCroquisUploaded,
    handlePlanUploaded,
    handleSave,
  } = useOutingForm(props);

  // ------------------------------------------------------------------
  // States
  // ------------------------------------------------------------------

  // Load error — GET failed, or the slug was not found in the list
  // response. Show a recoverable "Back to Outings" prompt.
  if (loadError) {
    return (
      <div data-testid="outing-form-load-error">
        <p>Failed to load outing. Please try again.</p>
        <button type="button" onClick={onCancel}>
          Back to Outings
        </button>
      </div>
    );
  }

  // Loading — edit mode, waiting for the GET to resolve.
  if (form === null) {
    return (
      <div data-testid="outing-form-loading">
        <p>Loading…</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div data-testid="outing-form">
      <h2>{mode === "create" ? "New Outing" : "Edit Outing"}</h2>

      <label htmlFor="of-title">Title</label>
      <input
        id="of-title"
        type="text"
        value={form.title}
        onChange={(e) => handleChange("title", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="of-slug">Slug</label>
      <input
        id="of-slug"
        type="text"
        value={form.slug}
        onChange={(e) => handleChange("slug", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="of-dateTime">Date & time</label>
      <input
        id="of-dateTime"
        type="datetime-local"
        value={form.dateTime}
        onChange={(e) => handleChange("dateTime", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="of-location">Location</label>
      <input
        id="of-location"
        type="text"
        value={form.location}
        onChange={(e) => handleChange("location", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="of-description">Description</label>
      <textarea
        id="of-description"
        value={form.description}
        onChange={(e) => handleChange("description", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="of-status">Status</label>
      <select
        id="of-status"
        value={form.status}
        onChange={(e) =>
          handleChange("status", e.target.value as OutingStatus)
        }
        disabled={saving}
      >
        <option value="DRAFT">DRAFT</option>
        <option value="PUBLISHED">PUBLISHED</option>
      </select>

      {/* Main image — existing asset shown as a link, no clearing control. */}
      <fieldset>
        <legend>Main image</legend>
        {form.mainImageId && (
          <a
            href={`/files/${form.mainImageId}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="outing-form-main-asset-link"
          >
            {form.mainImageId}
          </a>
        )}
        <FileUploadWidget
          category="OUTING_MAIN_IMAGE"
          fileId={null}
          onUploaded={handleMainUploaded}
          onRemove={() => {
            /* no removal control — clearing semantics are deferred */
          }}
          data-testid="outing-form-main-widget"
        />
      </fieldset>

      {/* Croquis — same shape as main image. */}
      <fieldset>
        <legend>Croquis</legend>
        {form.croquisId && (
          <a
            href={`/files/${form.croquisId}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="outing-form-croquis-asset-link"
          >
            {form.croquisId}
          </a>
        )}
        <FileUploadWidget
          category="OUTING_CROQUIS"
          fileId={null}
          onUploaded={handleCroquisUploaded}
          onRemove={() => {
            /* no removal control */
          }}
          data-testid="outing-form-croquis-widget"
        />
      </fieldset>

      {/* Plan — same shape as main image. */}
      <fieldset>
        <legend>Plan</legend>
        {form.planId && (
          <a
            href={`/files/${form.planId}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="outing-form-plan-asset-link"
          >
            {form.planId}
          </a>
        )}
        <FileUploadWidget
          category="OUTING_PLAN"
          fileId={null}
          onUploaded={handlePlanUploaded}
          onRemove={() => {
            /* no removal control */
          }}
          data-testid="outing-form-plan-widget"
        />
      </fieldset>

      <div>
        {!archived && (
          <>
            <button
              type="button"
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave("PUBLISHED")}
              disabled={saving}
            >
              Save Publish
            </button>
          </>
        )}
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>

      {validationError && (
        <div data-testid="outing-form-validation-error">
          Title is required.
        </div>
      )}

      {saveError && (
        <div data-testid="outing-form-save-error">{saveError}</div>
      )}
    </div>
  );
}
