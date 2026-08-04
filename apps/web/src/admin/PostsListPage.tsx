// ---------------------------------------------------------------------------
// PostsListPage — read-only post list + lifecycle actions + featured toggle
//
// - GET /posts/admin on mount via listPosts()
// - Status filter dropdown (All / DRAFT / PUBLISHED / ARCHIVED)
// - Loading, error, empty states
// - Per-row publish/archive/delete with accessible confirmation dialogs
//   and per-row state isolation (Record<postId, "idle"|"pending"|"error">)
// - Feature/unfeature toggle for PUBLISHED posts, 3-slot cap,
//   local featured-post tracking (Set<postId>)
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import type { PostListItem, PostStatus } from "./adminTypes.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { useAdminToast } from "./AdminProviders.js";
import { mapAdminError } from "./adminErrors.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
// prettier-ignore
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.js";
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
const ACTION_LABELS = {
  publish: "Publicar",
  archive: "Archivar",
  delete: "Eliminar",
} as const;
const ACTION_SUCCESS = {
  publish: "Publicación realizada correctamente.",
  archive: "Publicación archivada correctamente.",
  delete: "Publicación eliminada correctamente.",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionState = "idle" | "pending" | "error";
// prettier-ignore
type Confirmation = { postId: string; action: "publish" | "archive" | "delete"; message: string };

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
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const tableFallbackRef = useRef<HTMLDivElement>(null);
  const toast = useAdminToast();

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

  const runAction = useCallback(
    async (
      postId: string,
      action: "publish" | "archive" | "delete",
      apiCall: () => Promise<unknown>,
    ) => {
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
        // prettier-ignore
        toast.success(ACTION_SUCCESS[action]);
      } catch (error) {
        setActionStates((prev) => ({ ...prev, [postId]: "error" }));
        const mapped = mapAdminError(error);
        toast.error(`No se pudo ${ACTION_LABELS[action].toLowerCase()}.`, {
          description: mapped.root,
        });
      }
    },
    [toast],
  );

  // prettier-ignore
  // prettier-ignore
  const requestAction = (post: PostListItem, action: Confirmation["action"]) => setConfirmation({ postId: post.id, action, message: action === "delete" ? `¿Eliminar "${post.title}"? Esta acción no se puede deshacer.` : `${ACTION_LABELS[action]} "${post.title}"?` });

  // ------------------------------------------------------------------
  // Feature / unfeature handlers
  // ------------------------------------------------------------------

  // prettier-ignore
  const handleFeature = useCallback(async (postId: string) => { setActionStates((prev) => ({ ...prev, [postId]: "pending" })); try { await featurePost(postId); setFeaturedPostIds((prev) => new Set(prev).add(postId)); setActionStates((prev) => ({ ...prev, [postId]: "idle" })); toast.success("Publicación destacada correctamente."); } catch (error) { setActionStates((prev) => ({ ...prev, [postId]: "error" })); toast.error("No se pudo destacar la publicación.", { description: mapAdminError(error).root }); } }, [toast]);

  // prettier-ignore
  const handleUnfeature = useCallback(async (postId: string) => { setActionStates((prev) => ({ ...prev, [postId]: "pending" })); try { await unfeaturePost(postId); setFeaturedPostIds((prev) => { const next = new Set(prev); next.delete(postId); return next; }); setActionStates((prev) => ({ ...prev, [postId]: "idle" })); toast.success("Publicación quitada de destacados."); } catch (error) { setActionStates((prev) => ({ ...prev, [postId]: "error" })); toast.error("No se pudo quitar la publicación de destacados.", { description: mapAdminError(error).root }); } }, [toast]);

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

  const statusFilterSelect = (
    <>
      <label htmlFor="posts-filter-status">Estado</label>
      <Select
        value={statusFilter || null}
        onValueChange={(value) =>
          setStatusFilter((value ?? "") as PostStatus | "")
        }
      >
        <SelectTrigger id="posts-filter-status">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>Todos</SelectItem>
          <SelectItem value="DRAFT">DRAFT</SelectItem>
          <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
          <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  // ------------------------------------------------------------------
  // States
  // ------------------------------------------------------------------

  // Load error
  if (loadError) {
    return (
      <div data-testid="posts-list-load-error">
        <Alert variant="destructive">
          <AlertDescription>
            No se pudieron cargar las publicaciones. Intenta de nuevo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading (posts not yet available)
  if (filteredPosts === null) {
    return (
      <div data-testid="posts-list-loading">
        <div role="status" aria-live="polite">
          Cargando…
        </div>
      </div>
    );
  }

  // Empty — no posts at all, or filter matched nothing
  if (filteredPosts.length === 0) {
    return (
      <div data-testid="posts-list-empty">
        <div role="status">No se encontraron publicaciones.</div>
        {onCreatePost && (
          <Button type="button" onClick={onCreatePost}>
            Nueva publicación
          </Button>
        )}
        {statusFilterSelect}
      </div>
    );
  }

  // Loaded — render table with filter
  // prettier-ignore
  return (
    <div data-testid="posts-list-table" ref={tableFallbackRef}>
      <h2>Publicaciones</h2>

      {/* Featured cap display */}
      <span data-testid="featured-cap" role={featuredLoadError ? "alert" : "status"} aria-live="polite">
        {featuredLoadError
          ? "Destacadas: no disponible"
          : `Destacadas: ${featuredCount}/${MAX_FEATURED_POSTS}`}
      </span>

      {onCreatePost && (
        <Button type="button" onClick={onCreatePost}>
          Nueva publicación
        </Button>
      )}

      {statusFilterSelect}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Estado</TableHead>
            {onEditPost && <TableHead>Administrar</TableHead>}
            <TableHead>Destacada</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPosts.map((post) => (
            <TableRow key={post.id}>
              <TableCell>{post.title}</TableCell>
              <TableCell>{post.slug}</TableCell>
              <TableCell><Badge>{post.status}</Badge></TableCell>
              {onEditPost && (
                <TableCell>
                  <Button type="button" variant="outline" size="sm" onClick={() => onEditPost(post.slug)}>
                    Editar
                  </Button>
                </TableCell>
              )}
              {/* Featured column */}
              <TableCell>
                {post.status === "PUBLISHED" &&
                  !featuredPostIds.has(post.id) && (
                    <Button
                      type="button"
                      data-testid={`feature-${post.id}`}
                      disabled={
                        featuredLoadError ||
                        featuredCount >= MAX_FEATURED_POSTS ||
                        actionStates[post.id] === "pending"
                      }
                      onClick={() => handleFeature(post.id)}
                      aria-label={`Destacar ${post.title}`}
                    >
                      Destacar
                    </Button>
                  )}
                {featuredPostIds.has(post.id) && (
                  <Button
                    type="button"
                    data-testid={`unfeature-${post.id}`}
                    disabled={
                      featuredLoadError || actionStates[post.id] === "pending"
                    }
                    onClick={() => handleUnfeature(post.id)}
                    aria-label={`Quitar ${post.title} de destacados`}
                  >
                    Destacada ★
                  </Button>
                )}
              </TableCell>
              <TableCell>
                {post.status !== "PUBLISHED" && (
                  <Button
                    type="button"
                    data-testid={`lifecycle-publish-${post.id}`}
                    disabled={actionStates[post.id] === "pending"}
                    onClick={() => requestAction(post, "publish")}
                  >
                    Publicar
                  </Button>
                )}
                {post.status === "PUBLISHED" && (
                  <Button
                    type="button"
                    data-testid={`lifecycle-archive-${post.id}`}
                    disabled={actionStates[post.id] === "pending"}
                    onClick={() => requestAction(post, "archive")}
                  >
                    Archivar
                  </Button>
                )}
                <Button
                  type="button"
                  data-testid={`lifecycle-delete-${post.id}`}
                  disabled={actionStates[post.id] === "pending"}
                  onClick={() => requestAction(post, "delete")}
                  variant="destructive"
                >
                  Eliminar
                </Button>
                {actionStates[post.id] === "error" && (
                  <span data-testid={`lifecycle-error-${post.id}`} role="alert">
                    Acción fallida
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ConfirmDialog
        open={confirmation !== null}
        title={`${ACTION_LABELS[confirmation?.action ?? "publish"]} publicación`}
        description={confirmation?.message ?? ""}
        confirmLabel={confirmation?.action === "delete" ? "Eliminar" : "Continuar"}
        destructive={confirmation?.action === "delete"}
        fallbackFocusRef={tableFallbackRef}
        onCancel={() => setConfirmation(null)}
        onConfirm={async () => {
          if (!confirmation) return;
          const { postId, action } = confirmation;
          setConfirmation(null);
          // prettier-ignore
          const calls = { publish: () => publishPost(postId), archive: () => archivePost(postId), delete: () => deletePost(postId) };
          await runAction(postId, action, calls[action]);
        }}
      />
    </div>
  );
}
