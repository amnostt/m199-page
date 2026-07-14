// ---------------------------------------------------------------------------
// OutingsPage — admin section owner for Outings
//
// Owns view state: list | create | edit(slug).
// Delegates to OutingsListPage for read-only list and (in a later work unit)
// OutingFormPage for create/edit forms.
//
// Mirrors the existing PostsPage composition pattern. The form page is not
// part of WU2 — the edit/create callbacks land on WU3 — but the owner is
// declared now so the navigation wiring (Task 2.5) can compile and render
// without depending on the not-yet-built form component. The form slot is
// handled by a temporary "coming soon" placeholder that disappears in WU3.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { OutingsListPage } from "./OutingsListPage.js";

// ---------------------------------------------------------------------------
// View state
// ---------------------------------------------------------------------------

type OutingsView =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; slug: string };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OutingsPage() {
  const [view, setView] = useState<OutingsView>({ mode: "list" });

  // Create / Edit forms land in WU3. Until then, surface a recoverable
  // placeholder that does not claim the form is built.
  if (view.mode === "create" || view.mode === "edit") {
    return (
      <div data-testid="outings-form-placeholder">
        <p>Outing form coming in the next release.</p>
        <button type="button" onClick={() => setView({ mode: "list" })}>
          Back to Outings
        </button>
      </div>
    );
  }

  // List view
  return (
    <OutingsListPage
      onCreateOuting={() => setView({ mode: "create" })}
      onEditOuting={(slug: string) => setView({ mode: "edit", slug })}
    />
  );
}
