// ---------------------------------------------------------------------------
// PostsListPage — read-only post list + lifecycle actions + featured toggle
//
// - GET /posts/admin on mount via listPosts()
// - Status filter dropdown (All / DRAFT / PUBLISHED / ARCHIVED)
// - Loading, error, empty states
// - Per-row publish/archive/delete with window.confirm gates
//   and per-row state isolation (Record<postId, "idle"|"pending"|"error">)
// - Feature/unfeature toggle for PUBLISHED posts, 3-slot cap,
//   local featured-post tracking (Set<postId>)
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import type { PostListItem, PostStatus } from "./adminTypes.js";
import {
  listPosts,
  publishPost,
  archivePost,
  deletePost,
  featurePost,
  unfeaturePost,
  listFeaturedPostIds,
} from "./postsApi.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of posts that can be featured simultaneously. */
const MAX_FEATURED_POSTS = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionState = "idle" | "pending" | "error";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PostsListPageProps {
  onCreatePost?: () => void;
  onEditPost?: (slug: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostsListPage({
  onCreatePost,
  onEditPost,
}: PostsListPageProps) {
  const [posts, setPosts] = useState<PostListItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PostStatus | "">("");
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>(
    {},
  );

  // Featured post IDs initialized from GET /posts/admin/featured
  // and kept in sync with local feature/unfeature calls.
  const [featuredPostIds, setFeaturedPostIds] = useState<Set<string>>(
    new Set(),
  );

  // Track whether the featured endpoint failed — when true, feature/unfeature
  // actions are disabled because we cannot know the current cap state.
  const [featuredLoadError, setFeaturedLoadError] = useState(false);

  // Load on mount — posts and featured post IDs load independently.
  // Featured failure surfaces visibly without hiding the posts list.
  useEffect(() => {
    let cancelled = false;

    listPosts()
      .then((postsData) => {
        if (cancelled) return;
        setPosts(postsData);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    listFeaturedPostIds()
      .then((ids) => {
        if (cancelled) return;
        setFeaturedPostIds(new Set(ids));
      })
      .catch(() => {
        if (!cancelled) setFeaturedLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------------
  // Lifecycle action handler
  // ------------------------------------------------------------------

  const handleAction = useCallback(
    async (
      postId: string,
      action: "publish" | "archive" | "delete",
      confirmMessage: string,
      apiCall: () => Promise<unknown>,
    ) => {
      if (!window.confirm(confirmMessage)) return;

      setActionStates((prev) => ({ ...prev, [postId]: "pending" }));

      try {
        await apiCall();

        // Update local posts state on success
        if (action === "delete") {
          setPosts((prev) => prev?.filter((p) => p.id !== postId) ?? null);
        } else {
          const newStatus: PostStatus =
            action === "publish" ? "PUBLISHED" : "ARCHIVED";
          setPosts(
            (prev) =>
              prev?.map((p) =>
                p.id === postId ? { ...p, status: newStatus } : p,
              ) ?? null,
          );
          // Archive also deletes the FeaturedPost row on the backend —
          // remove the post from local featured tracking.
          if (action === "archive") {
            setFeaturedPostIds((prev) => {
              const next = new Set(prev);
              next.delete(postId);
              return next;
            });
          }
        }
        setActionStates((prev) => ({ ...prev, [postId]: "idle" }));
      } catch {
        setActionStates((prev) => ({ ...prev, [postId]: "error" }));
      }
    },
    [],
  );

  // ------------------------------------------------------------------
  // Feature / unfeature handlers
  // ------------------------------------------------------------------

  const handleFeature = useCallback(
    async (postId: string) => {
      setActionStates((prev) => ({ ...prev, [postId]: "pending" }));
      try {
        await featurePost(postId);
        setFeaturedPostIds((prev) => new Set(prev).add(postId));
        setActionStates((prev) => ({ ...prev, [postId]: "idle" }));
      } catch {
        setActionStates((prev) => ({ ...prev, [postId]: "error" }));
      }
    },
    [],
  );

  const handleUnfeature = useCallback(
    async (postId: string) => {
      setActionStates((prev) => ({ ...prev, [postId]: "pending" }));
      try {
        await unfeaturePost(postId);
        setFeaturedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        setActionStates((prev) => ({ ...prev, [postId]: "idle" }));
      } catch {
        setActionStates((prev) => ({ ...prev, [postId]: "error" }));
      }
    },
    [],
  );

  const featuredCount = featuredPostIds.size;

  // ------------------------------------------------------------------
  // Derived: filtered posts
  // ------------------------------------------------------------------

  const filteredPosts =
    posts === null
      ? null
      : statusFilter === ""
        ? posts
        : posts.filter((p) => p.status === statusFilter);

  // ------------------------------------------------------------------
  // States
  // ------------------------------------------------------------------

  // Load error
  if (loadError) {
    return (
      <div data-testid="posts-list-load-error">
        <p>Failed to load posts. Please try again.</p>
      </div>
    );
  }

  // Loading (posts not yet available)
  if (filteredPosts === null) {
    return (
      <div data-testid="posts-list-loading">
        <p>Loading…</p>
      </div>
    );
  }

  // Empty — no posts at all, or filter matched nothing
  if (filteredPosts.length === 0) {
    return (
      <div data-testid="posts-list-empty">
        <p>No posts found.</p>
        {onCreatePost && (
          <button type="button" onClick={onCreatePost}>
            New Post
          </button>
        )}
        <label htmlFor="posts-filter-status">Status</label>
        <select
          id="posts-filter-status"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as PostStatus | "")
          }
        >
          <option value="">All</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>
    );
  }

  // Loaded — render table with filter
  return (
    <div data-testid="posts-list-table">
      <h2>Posts</h2>

      {/* Featured cap display */}
      <span data-testid="featured-cap">
        {featuredLoadError
          ? "Featured: unavailable"
          : `Featured: ${featuredCount}/${MAX_FEATURED_POSTS}`}
      </span>

      {onCreatePost && (
        <button type="button" onClick={onCreatePost}>
          New Post
        </button>
      )}

      <label htmlFor="posts-filter-status">Status</label>
      <select
        id="posts-filter-status"
        value={statusFilter}
        onChange={(e) =>
          setStatusFilter(e.target.value as PostStatus | "")
        }
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
            {onEditPost && <th />}
            <th>Featured</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPosts.map((post) => (
            <tr key={post.id}>
              <td>{post.title}</td>
              <td>{post.slug}</td>
              <td>{post.status}</td>
              {onEditPost && (
                <td>
                  <button type="button" onClick={() => onEditPost(post.slug)}>
                    Edit
                  </button>
                </td>
              )}
              {/* Featured column */}
              <td>
                {post.status === "PUBLISHED" &&
                  !featuredPostIds.has(post.id) && (
                    <button
                      type="button"
                      data-testid={`feature-${post.id}`}
                      disabled={
                        featuredLoadError ||
                        featuredCount >= MAX_FEATURED_POSTS ||
                        actionStates[post.id] === "pending"
                      }
                      onClick={() => handleFeature(post.id)}
                    >
                      Feature
                    </button>
                  )}
                {featuredPostIds.has(post.id) && (
                  <button
                    type="button"
                    data-testid={`unfeature-${post.id}`}
                    disabled={
                      featuredLoadError ||
                      actionStates[post.id] === "pending"
                    }
                    onClick={() => handleUnfeature(post.id)}
                  >
                    Featured ★
                  </button>
                  )}
              </td>
              <td>
                {post.status !== "PUBLISHED" && (
                  <button
                    type="button"
                    data-testid={`lifecycle-publish-${post.id}`}
                    disabled={actionStates[post.id] === "pending"}
                    onClick={() =>
                      handleAction(
                        post.id,
                        "publish",
                        `Publish "${post.title}"?`,
                        () => publishPost(post.id),
                      )
                    }
                  >
                    Publish
                  </button>
                )}
                {post.status === "PUBLISHED" && (
                  <button
                    type="button"
                    data-testid={`lifecycle-archive-${post.id}`}
                    disabled={actionStates[post.id] === "pending"}
                    onClick={() =>
                      handleAction(
                        post.id,
                        "archive",
                        `Archive "${post.title}"?`,
                        () => archivePost(post.id),
                      )
                    }
                  >
                    Archive
                  </button>
                )}
                <button
                  type="button"
                  data-testid={`lifecycle-delete-${post.id}`}
                  disabled={actionStates[post.id] === "pending"}
                  onClick={() =>
                    handleAction(
                      post.id,
                      "delete",
                      `Delete "${post.title}"? This cannot be undone.`,
                      () => deletePost(post.id),
                    )
                  }
                >
                  Delete
                </button>
                {actionStates[post.id] === "error" && (
                  <span data-testid={`lifecycle-error-${post.id}`}>
                    Action failed
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
