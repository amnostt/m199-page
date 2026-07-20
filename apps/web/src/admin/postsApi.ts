// ---------------------------------------------------------------------------
// postsApi — adminFetch wrappers and helpers for Posts admin CRUD
// ---------------------------------------------------------------------------

import { adminFetch } from "./session.js";
import type { PostListItem, Post, PostForm } from "./adminTypes.js";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Split a comma-separated tags string into an array of trimmed, non-empty
 * strings, capped at 20. Returns [] for null/undefined/empty input.
 */
export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 20);
}

/**
 * Build a /files/{id} URL from a file id. Returns null when id is falsy
 * so callers can conditionally render an <img> or <a> only when a file exists.
 */
export function fileUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  return `/files/${id}`;
}

/**
 * Build a /files/{id}/thumb URL from a file id. Returns null when id is
 * falsy so callers can guard thumbnail rendering.
 */
export function thumbUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  return `/files/${id}/thumb`;
}

// ---------------------------------------------------------------------------
// API wrappers — read-only
// ---------------------------------------------------------------------------

/**
 * List all posts (admin endpoint). No pagination — full result set.
 */
export function listPosts(): Promise<PostListItem[]> {
  return adminFetch<PostListItem[]>("/posts/admin");
}

/**
 * Fetch a single post by its slug for the edit form.
 */
export function getPost(slug: string): Promise<Post> {
  return adminFetch<Post>(`/posts/admin/slug/${slug}`);
}

// ---------------------------------------------------------------------------
// API wrappers — create / update
// ---------------------------------------------------------------------------

/**
 * Create a new post. Tags are already parsed from tagsInput before calling.
 */
export function createPost(
  form: PostForm,
  downloadLabels?: Record<string, string>,
): Promise<Post> {
  const body: Record<string, unknown> = {
    title: form.title,
    slug: form.slug,
    content: form.content,
    description: form.description,
    tags: parseTags(form.tagsInput),
    coverImageId: form.coverImageId,
    downloadIds: form.downloadIds,
  };
  if (downloadLabels && Object.keys(downloadLabels).length > 0) {
    body.downloadLabels = downloadLabels;
  }
  return adminFetch<Post>("/posts/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Update an existing post by id.
 */
export function updatePost(
  id: string,
  form: PostForm,
  downloadLabels?: Record<string, string>,
): Promise<Post> {
  const body: Record<string, unknown> = {
    title: form.title,
    slug: form.slug,
    content: form.content,
    description: form.description,
    tags: parseTags(form.tagsInput),
    coverImageId: form.coverImageId,
    downloadIds: form.downloadIds,
  };
  if (downloadLabels && Object.keys(downloadLabels).length > 0) {
    body.downloadLabels = downloadLabels;
  }
  return adminFetch<Post>(`/posts/admin/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// API wrappers — lifecycle
// ---------------------------------------------------------------------------

/** Publish a post via the backend lifecycle endpoint. */
export function publishPost(id: string): Promise<Post> {
  return adminFetch<Post>(`/posts/admin/${id}/publish`, {
    method: "POST",
  });
}

/** Archive a post via the backend lifecycle endpoint. */
export function archivePost(id: string): Promise<Post> {
  return adminFetch<Post>(`/posts/admin/${id}/archive`, {
    method: "POST",
  });
}

/** Delete a post. */
export function deletePost(id: string): Promise<void> {
  return adminFetch<void>(`/posts/admin/${id}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// API wrappers — files + featured
// ---------------------------------------------------------------------------

/** Feature a PUBLISHED post (adheres to the configured feature-slot cap, first-free slot). */
export function featurePost(id: string): Promise<{ success: boolean }> {
  return adminFetch<{ success: boolean }>(`/posts/admin/${id}/feature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

/** Unfeature a post (idempotent — does not error if not currently featured). */
export function unfeaturePost(id: string): Promise<{ success: boolean }> {
  return adminFetch<{ success: boolean }>(`/posts/admin/${id}/feature`, {
    method: "DELETE",
  });
}

/**
 * List currently featured post IDs so the admin UI can enforce the
 * configured feature-slot cap before sending a Feature request.
 */
export function listFeaturedPostIds(): Promise<string[]> {
  return adminFetch<{ postIds: string[] }>("/posts/admin/featured").then(
    (r) => r.postIds,
  );
}
