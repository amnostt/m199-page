// ---------------------------------------------------------------------------
// OutingsPage — admin section owner for Outings
//
// Owns view state: list | create | edit(slug).
// Delegates to OutingsListPage for the read-only list and to
// OutingFormPage for create/edit forms. Mirrors the existing
// PostsPage composition pattern.
//
// History:
// - WU2 declared the owner with a temporary placeholder for the
//   create/edit surfaces so the navigation wiring could compile and
//   render without depending on the not-yet-built form component.
// - WU3 (this revision) replaces the placeholder with the real
//   OutingFormPage. The owner still owns the slug-based view state
//   and the list↔form transition; the form is responsible for
//   loading, validation, save, and error display.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { OutingsListPage } from "./OutingsListPage.js";
import { OutingFormPage } from "./OutingFormPage.js";

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

  if (view.mode === "create") {
    return (
      <OutingFormPage
        mode="create"
        onSaved={() => setView({ mode: "list" })}
        onCancel={() => setView({ mode: "list" })}
      />
    );
  }

  if (view.mode === "edit") {
    return (
      <OutingFormPage
        mode="edit"
        slug={view.slug}
        onSaved={() => setView({ mode: "list" })}
        onCancel={() => setView({ mode: "list" })}
      />
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
