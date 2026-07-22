// ---------------------------------------------------------------------------
// PostsPage — admin section owner for Posts
//
// Owns view state: list | create | edit(slug).
// Delegates to PostsListPage for read-only list and PostFormPage for
// create/edit forms.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { PostsListPage } from "./PostsListPage.js";
import { PostFormPage } from "./PostFormPage.js";

// ---------------------------------------------------------------------------
// View state
// ---------------------------------------------------------------------------

type PostsView =
  { mode: "list" } | { mode: "create" } | { mode: "edit"; slug: string };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostsPage() {
  const [view, setView] = useState<PostsView>({ mode: "list" });

  if (view.mode === "create") {
    return (
      <PostFormPage
        mode="create"
        onSaved={() => setView({ mode: "list" })}
        onCancel={() => setView({ mode: "list" })}
      />
    );
  }

  if (view.mode === "edit") {
    return (
      <PostFormPage
        mode="edit"
        slug={view.slug}
        onSaved={() => setView({ mode: "list" })}
        onCancel={() => setView({ mode: "list" })}
      />
    );
  }

  // List view
  return (
    <PostsListPage
      onCreatePost={() => setView({ mode: "create" })}
      onEditPost={(slug: string) => setView({ mode: "edit", slug })}
    />
  );
}
