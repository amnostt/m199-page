// ---------------------------------------------------------------------------
// useOutingForm — state machine and effects for the Outing create/edit form.
//
// Extracted from OutingFormPage in WU3 (Task 3.3) so the component stays a
// thin render layer and the load/save/validation logic is testable in
// isolation if a future change needs that. The extraction is a pure
// refactor — every behavior the OutingFormPage tests assert remains
// observable through the component (GREEN cycle held before extraction,
// the RED→GREEN→REFACTOR gate is the OutingFormPage test suite).
//
// State machine:
//   - create mode: form is initialised empty, no GET on mount
//   - edit mode:   GET /outings/admin on mount, find row by slug, populate
//                  form; set loadError if the GET fails or the slug is not
//                  found; the resolved `outingId` is captured for PATCH
//
// Save handler:
//   - Validates title (required) — local-only, no request
//   - window.confirm gate — declined confirm aborts the request
//   - POST in create, PATCH in edit — both routed through the payload
//     helper (createOuting keeps null asset IDs; updateOuting uses
//     omitNullAssets: true so unrelated edits preserve existing assets)
//   - Parsed AdminRequestError.message is surfaced via saveError;
//     onSaved is NOT called on failure
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import type {
  FileAssetResponse,
  OutingForm,
  OutingStatus,
} from "./adminTypes.js";
import {
  createOuting,
  formatOutingDateTime,
  listOutings,
  updateOuting,
} from "./outingsApi.js";
import { AdminRequestError } from "./session.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Initial form values for create mode (every field empty / null, DRAFT). */
export const EMPTY_OUTING_FORM: OutingForm = {
  title: "",
  slug: "",
  dateTime: "",
  location: "",
  description: "",
  mainImageId: null,
  croquisId: null,
  planId: null,
  status: "DRAFT",
};

// ---------------------------------------------------------------------------
// Hook signature
// ---------------------------------------------------------------------------

export interface UseOutingFormOptions {
  mode: "create" | "edit";
  /** Required when mode === "edit". The slug to look up in the list. */
  slug?: string;
  /** Called after a successful save (create or update). */
  onSaved: () => void;
  /** Called on Cancel, on a load error recovery, or any user-initiated
   *  abandonment of the form. The component is expected to return to
   *  the list view. */
  onCancel: () => void;
}

export interface UseOutingFormResult {
  /** Current form state. `null` while the edit-mode GET is in flight. */
  form: OutingForm | null;
  /** Edit-mode GET failed (network error or slug not found). */
  loadError: boolean;
  /** A save POST/PATCH is currently in flight. */
  saving: boolean;
  /** Server-returned error message from the most recent save attempt;
   *  null when there is no error. */
  saveError: string | null;
  /** Local title-required validation triggered. Cleared on the next edit. */
  validationError: boolean;
  /** Server-issued id of the outing being edited; null in create mode. */
  outingId: string | null;
  /** The loaded outing is archived and cannot be transitioned through this form. */
  archived: boolean;

  /** Update a scalar form field. Clears the inline error states so the
   *  user sees their next attempt unblocked. */
  handleChange: (field: keyof OutingForm, value: string) => void;
  /** Asset upload completed for the main-image slot. */
  handleMainUploaded: (asset: FileAssetResponse) => void;
  /** Asset upload completed for the croquis slot. */
  handleCroquisUploaded: (asset: FileAssetResponse) => void;
  /** Asset upload completed for the plan slot. */
  handlePlanUploaded: (asset: FileAssetResponse) => void;
  /** Trigger a save with the requested status. */
  handleSave: (status: OutingStatus) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOutingForm({
  mode,
  slug,
  onSaved,
  onCancel: _onCancel,
}: UseOutingFormOptions): UseOutingFormResult {
  // Form state. In create mode the form is initialised empty. In edit
  // mode the form is null until the GET resolves (and the row is found).
  const [form, setForm] = useState<OutingForm | null>(
    mode === "create" ? { ...EMPTY_OUTING_FORM } : null,
  );
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState(false);
  const [archived, setArchived] = useState(false);
  // The server-issued id of the outing being edited. Captured from the
  // list response (the row whose slug matches the supplied slug) and
  // used as the PATCH path. Kept separate from form state so a
  // user-typed slug change does not clobber the routing id.
  const [outingId, setOutingId] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Edit mode: GET /outings/admin, locate row by slug, populate form
  // ------------------------------------------------------------------

  useEffect(() => {
    if (mode !== "edit" || !slug) return;

    let cancelled = false;

    listOutings()
      .then((rows) => {
        if (cancelled) return;
        const found = rows.find((r) => r.slug === slug);
        if (!found) {
          setLoadError(true);
          return;
        }
        setOutingId(found.id);
        setArchived(found.status === "ARCHIVED");
        setForm({
          title: found.title,
          slug: found.slug,
          dateTime: formatOutingDateTime(found.dateTime),
          location: found.location,
          description: found.description,
          mainImageId: found.mainImageId,
          croquisId: found.croquisId,
          planId: found.planId,
          status: found.status,
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, slug]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleChange = (field: keyof OutingForm, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : null));
    setSaveError(null);
    setValidationError(false);
  };

  const handleMainUploaded = (asset: FileAssetResponse) => {
    setForm((prev) => (prev ? { ...prev, mainImageId: asset.id } : null));
  };

  const handleCroquisUploaded = (asset: FileAssetResponse) => {
    setForm((prev) => (prev ? { ...prev, croquisId: asset.id } : null));
  };

  const handlePlanUploaded = (asset: FileAssetResponse) => {
    setForm((prev) => (prev ? { ...prev, planId: asset.id } : null));
  };

  const handleSave = async (status: OutingStatus) => {
    if (!form || saving || archived) return;

    // Local validation: title is required.
    if (!form.title.trim()) {
      setValidationError(true);
      return;
    }

    // General save confirmation (create + edit, both DRAFT and PUBLISHED).
    if (!window.confirm("Save changes to this outing?")) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    // Build the payload by stamping the chosen status onto the form.
    // The payload helper handles dateTime conversion and PATCH
    // omitNullAssets for us.
    const payload: OutingForm = { ...form, status };

    try {
      if (mode === "edit" && outingId) {
        await updateOuting(outingId, payload);
      } else {
        await createOuting(payload);
      }
      onSaved();
    } catch (err) {
      if (err instanceof AdminRequestError) {
        setSaveError(err.message);
      } else {
        setSaveError("Save failed. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    loadError,
    saving,
    saveError,
    validationError,
    outingId,
    archived,
    handleChange,
    handleMainUploaded,
    handleCroquisUploaded,
    handlePlanUploaded,
    handleSave,
  };
}
