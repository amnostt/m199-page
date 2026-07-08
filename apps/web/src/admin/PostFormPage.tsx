// ---------------------------------------------------------------------------
// PostFormPage — create/edit post form with slug gate, cover image, and
// downloadable file management
//
// - Create mode: empty form → POST /posts/admin on save
// - Edit mode: GET /posts/admin/slug/:slug → populate form → PATCH on save
// - Tags input is comma-separated; split via parseTags before API call
// - Loading, error, success, and validation states per LandingSettingsPage
//   pattern
// - Slug change on PUBLISHED post triggers two sequential
//   window.confirm calls (URL-breakage then save) before PATCH
// - Cover image preview + FileUploadWidget; downloads with links,
//   labels, and per-slot FileUploadWidget instances
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import type { Post, PostDownload, PostForm, PostStatus } from "./adminTypes.js";
import { createPost, getPost, updatePost, fileUrl, thumbUrl } from "./postsApi.js";
import { FileUploadWidget } from "./FileUploadWidget.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_FORM: PostForm = {
  title: "",
  slug: "",
  content: "",
  description: "",
  tagsInput: "",
  status: "DRAFT",
  coverImageId: null,
  downloadIds: [],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface PostFormPageProps {
  mode: "create" | "edit";
  slug?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function PostFormPage({
  mode,
  slug,
  onSaved,
  onCancel,
}: PostFormPageProps) {
  const [form, setForm] = useState<PostForm | null>(
    mode === "create" ? { ...EMPTY_FORM } : null,
  );
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);

  // Download list with labels (managed separately from form.downloadIds)
  const [downloadEntries, setDownloadEntries] = useState<PostDownload[]>([]);

  // Track original slug for P-07 slug-change gate
  const originalSlugRef = useRef<string | null>(null);

  // ------------------------------------------------------------------
  // Load post in edit mode
  // ------------------------------------------------------------------

  useEffect(() => {
    if (mode !== "edit" || !slug) return;

    let cancelled = false;

    getPost(slug)
      .then((post: Post) => {
        if (cancelled) return;
        setPostId(post.id);
        setForm(normalizePostToForm(post));
        setDownloadEntries(post.downloads);
        originalSlugRef.current = post.slug;
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

  const handleChange = (field: keyof PostForm, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : null));
    setSaveError(false);
    setSaveSuccess(false);
    setValidationError(false);
  };

  // Cover handlers
  const handleCoverUploaded = (assetId: string) => {
    setForm((prev) => (prev ? { ...prev, coverImageId: assetId } : null));
  };

  const handleCoverRemove = () => {
    setForm((prev) => (prev ? { ...prev, coverImageId: null } : null));
  };

  // Download handlers
  const handleDownloadAdd = (assetId: string) => {
    const entry: PostDownload = {
      id: crypto.randomUUID(),
      fileId: assetId,
      label: null,
      sortOrder: downloadEntries.length,
    };
    setDownloadEntries((prev) => [...prev, entry]);
    // Sync downloadIds to form
    setForm((prev) =>
      prev
        ? {
            ...prev,
            downloadIds: [...prev.downloadIds, assetId],
          }
        : null,
    );
  };

  const handleDownloadRemove = (fileId: string) => {
    setDownloadEntries((prev) => prev.filter((d) => d.fileId !== fileId));
    setForm((prev) =>
      prev
        ? {
            ...prev,
            downloadIds: prev.downloadIds.filter((id) => id !== fileId),
          }
        : null,
    );
  };

  const handleDownloadLabel = (fileId: string, label: string) => {
    setDownloadEntries((prev) =>
      prev.map((d) => (d.fileId === fileId ? { ...d, label } : d)),
    );
  };

  const handleSave = async () => {
    if (!form || saving) return;

    // Required title validation
    if (!form.title.trim()) {
      setValidationError(true);
      return;
    }

    // P-07: slug-change URL-breakage warning on PUBLISHED posts.
    // This fires BEFORE the general save confirmation so the user
    // sees the more critical URL-breakage warning first. Cancelling
    // either confirm prevents the PATCH.
    const slugChanged =
      mode === "edit" &&
      originalSlugRef.current !== null &&
      form.slug !== originalSlugRef.current;

    if (slugChanged && form.status === "PUBLISHED") {
      // URL-breakage warning
      if (
        !window.confirm(
          "You are changing the URL of a published post. Existing links to this post will break. Continue?",
        )
      ) {
        return;
      }
    }

    // General save confirmation (create + edit, all statuses)
    if (!window.confirm("Save changes to this post?")) {
      return;
    }

    setSaving(true);
    setSaveError(false);
    setSaveSuccess(false);

    // Build download labels from local download state
    const downloadLabels: Record<string, string> = {};
    for (const d of downloadEntries) {
      if (d.label) {
        downloadLabels[d.fileId] = d.label;
      }
    }

    try {
      if (mode === "edit" && postId) {
        await updatePost(postId, form, downloadLabels);
      } else {
        await createPost(form, downloadLabels);
      }
      setSaveSuccess(true);
      onSaved();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------
  // States
  // ------------------------------------------------------------------

  // Load error (edit mode GET failure)
  if (loadError) {
    return (
      <div data-testid="post-form-load-error">
        <p>Failed to load post. Please try again.</p>
        <button type="button" onClick={onCancel}>
          Back to Posts
        </button>
      </div>
    );
  }

  // Loading (edit mode — waiting for GET)
  if (form === null) {
    return (
      <div data-testid="post-form-loading">
        <p>Loading…</p>
      </div>
    );
  }

  // Form — loaded
  return (
    <div data-testid="post-form">
      <h2>{mode === "create" ? "New Post" : "Edit Post"}</h2>

      <label htmlFor="pf-title">Title</label>
      <input
        id="pf-title"
        type="text"
        value={form.title}
        onChange={(e) => handleChange("title", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="pf-slug">Slug</label>
      <input
        id="pf-slug"
        type="text"
        value={form.slug}
        onChange={(e) => handleChange("slug", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="pf-content">Content</label>
      <textarea
        id="pf-content"
        value={form.content}
        onChange={(e) => handleChange("content", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="pf-description">Description</label>
      <input
        id="pf-description"
        type="text"
        value={form.description}
        onChange={(e) => handleChange("description", e.target.value)}
        disabled={saving}
      />

      <label htmlFor="pf-tags">Tags (comma-separated)</label>
      <input
        id="pf-tags"
        type="text"
        value={form.tagsInput}
        onChange={(e) => handleChange("tagsInput", e.target.value)}
        disabled={saving}
        placeholder="e.g. react, typescript"
      />

      <label htmlFor="pf-status">Status</label>
      <select
        id="pf-status"
        value={form.status}
        onChange={(e) =>
          handleChange("status", e.target.value as PostStatus)
        }
        disabled={saving}
      >
        <option value="DRAFT">DRAFT</option>
        <option value="PUBLISHED">PUBLISHED</option>
        <option value="ARCHIVED">ARCHIVED</option>
      </select>

      {/* Cover image section */}
      <fieldset>
        <legend>Cover Image</legend>
        {form.coverImageId && (
          <img
            src={thumbUrl(form.coverImageId)!}
            alt="Cover preview"
            data-testid="post-form-cover-preview"
          />
        )}
        <FileUploadWidget
          category="POST_COVER_IMAGE"
          fileId={form.coverImageId}
          onUploaded={(asset) => handleCoverUploaded(asset.id)}
          onRemove={handleCoverRemove}
          data-testid="post-form-cover-widget"
        />
      </fieldset>

      {/* Downloads section */}
      <fieldset>
        <legend>Downloads</legend>
        {downloadEntries.map((d) => (
          <div key={d.id}>
            <a
              href={fileUrl(d.fileId)!}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`post-form-download-link-${d.fileId}`}
            >
              {d.fileId}
            </a>
            <input
              type="text"
              value={d.label ?? ""}
              onChange={(e) =>
                handleDownloadLabel(d.fileId, e.target.value)
              }
              placeholder="File label"
              data-testid={`post-form-download-label-${d.fileId}`}
            />
            <FileUploadWidget
              category="POST_DOWNLOAD"
              fileId={d.fileId}
              onUploaded={() => {}}
              onRemove={() => handleDownloadRemove(d.fileId)}
              data-testid={`post-form-download-widget-${d.fileId}`}
            />
          </div>
        ))}
        <FileUploadWidget
          category="POST_DOWNLOAD"
          fileId={null}
          onUploaded={(asset) => handleDownloadAdd(asset.id)}
          onRemove={() => {}}
          data-testid="post-form-download-add"
        />
      </fieldset>

      <div>
        <button type="button" onClick={handleSave} disabled={saving}>
          Save Post
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>

      {validationError && (
        <div data-testid="post-form-validation-error">
          Title is required.
        </div>
      )}

      {saveSuccess && (
        <div data-testid="post-form-save-success">
          Post saved successfully.
        </div>
      )}

      {saveError && (
        <div data-testid="post-form-save-error">
          Failed to save post. Please try again.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a Post API response into a PostForm for the editor.
 * Tags array → comma-separated string; downloads fileId array.
 */
export function normalizePostToForm(post: Post): PostForm {
  return {
    title: post.title,
    slug: post.slug,
    content: post.content,
    description: post.description,
    tagsInput: post.tags.join(", "),
    status: post.status,
    coverImageId: post.coverImageId,
    downloadIds: post.downloads.map((d) => d.fileId),
  };
}
