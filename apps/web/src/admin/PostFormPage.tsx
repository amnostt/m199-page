// ---------------------------------------------------------------------------
// PostFormPage — create/edit post form with slug gate, cover image, and
// downloadable file management
//
// - Create mode: empty form → POST /posts/admin on save
// - Edit mode: GET /posts/admin/slug/:slug → populate form → PATCH on save
// - Tags input is comma-separated; split via parseTags before API call
// - Published slug changes trigger sequential accessible confirmations
// - Cover image preview + FileUploadWidget; downloads with links, labels, and
//   per-slot FileUploadWidget instances
//
// The route owns fetching, uploads, confirmation ordering, and API payload
// construction while RHF/Zod owns the native form.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Post, PostForm, PostStatus } from "./adminTypes.js";
// prettier-ignore
import {
  createPost,
  getPost,
  updatePost,
  fileUrl,
  thumbUrl,
} from "./postsApi.js";
import { FileUploadWidget } from "./FileUploadWidget.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { useAdminToast } from "./AdminProviders.js";
import { mapAdminError } from "./adminErrors.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../components/ui/field.js";
import { Input } from "../components/ui/input.js";
import { Textarea } from "../components/ui/textarea.js";
// prettier-ignore
const postSchema = z.object({ title: z.string().refine((value) => value.trim().length > 0, "Title is required."), slug: z.string(), content: z.string(), description: z.string(), tagsInput: z.string(), coverImageId: z.string().nullable(), downloadIds: z.array(z.string()), downloads: z.array(z.object({ entryId: z.string(), fileId: z.string(), label: z.string() })) });
type EditorDownload = { entryId: string; fileId: string; label: string };
type EditorValues = PostForm & { downloads: EditorDownload[] };
type Confirmation = { kind: "slug" | "save"; values: EditorValues };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// prettier-ignore
const EMPTY_VALUES: EditorValues = { title: "", slug: "", content: "", description: "", tagsInput: "", coverImageId: null, downloadIds: [], downloads: [] };
export interface PostFormPageProps {
  mode: "create" | "edit";
  slug?: string;
  onSaved: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// prettier-ignore
function editorValues(post: Post): EditorValues { const values = normalizePostToForm(post); return { ...values, downloads: post.downloads.map((download) => ({ entryId: download.id, fileId: download.fileId, label: download.label ?? "" })) }; }

// prettier-ignore
export function PostFormPage({
  mode,
  slug,
  onSaved,
  onCancel,
}: PostFormPageProps) {
  const [loading, setLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [loadedStatus, setLoadedStatus] = useState<PostStatus>("DRAFT");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const originalSlugRef = useRef<string | null>(null);
  const toast = useAdminToast();
  // prettier-ignore
  const { register, control, reset, setValue, setError, getValues, clearErrors, watch, handleSubmit, formState: { errors } } = useForm<EditorValues>({ defaultValues: mode === "create" ? EMPTY_VALUES : undefined, resolver: zodResolver(postSchema), shouldFocusError: true });
  // prettier-ignore
  const { fields, append, remove, update } = useFieldArray({ control, name: "downloads", keyName: "fieldKey" });
  const coverImageId = watch("coverImageId");
  const updateDownload = (entryId: string, fileId: string) => { const downloads = getValues("downloads"); const index = downloads.findIndex((download) => download.entryId === entryId); if (index >= 0) update(index, { ...downloads[index]!, fileId }); };
  // ------------------------------------------------------------------
  // Load post in edit mode
  // ------------------------------------------------------------------

  useEffect(() => {
    if (mode !== "edit" || !slug) return;
    let cancelled = false;
    getPost(slug)
      .then((post) => {
        if (cancelled) return;
        setPostId(post.id);
        setLoadedStatus(post.status);
        originalSlugRef.current = post.slug;
        reset(editorValues(post));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, reset, slug]);
  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const saveValues = async (values: EditorValues) => {
    if (saving) return;
    setSaving(true);
    setSaveSuccess(false);
    const form: PostForm = {
      title: values.title,
      slug: values.slug,
      content: values.content,
      description: values.description,
      tagsInput: values.tagsInput,
      coverImageId: values.coverImageId,
      downloadIds: values.downloads.map((download) => download.fileId),
    };
    const downloadLabels: Record<string, string> = {};
    for (const download of values.downloads) {
      const label = download.label.trim();
      if (label) downloadLabels[download.fileId] = label;
    }
    try {
      // prettier-ignore
      if (mode === "edit" && postId) await updatePost(postId, form, downloadLabels);
      else await createPost(form, downloadLabels);
      setSaveSuccess(true);
      toast.success("Post saved successfully.");
      onSaved();
    } catch (error) {
      const message = mapAdminError(error).root;
      setError("root.server", { type: "server", message });
      // prettier-ignore
      toast.error("Failed to save post.", { description: message, retry: () => void saveValues(values) });
    } finally {
      setSaving(false);
    }
  };
  const onValid: SubmitHandler<EditorValues> = (values) => {
    // prettier-ignore
    const slugChanged = mode === "edit" && originalSlugRef.current !== null && values.slug !== originalSlugRef.current;
    if (slugChanged && loadedStatus === "PUBLISHED") {
      setConfirmation({ kind: "slug", values });
      return;
    }
    setConfirmation({ kind: "save", values });
  };

  // ------------------------------------------------------------------
  // States
  // ------------------------------------------------------------------

  if (loadError) {
    return (
      <div data-testid="post-form-load-error">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load post. Please try again.
          </AlertDescription>
        </Alert>
        {/* prettier-ignore */}<Button type="button" onClick={onCancel}>Back to Posts</Button>
      </div>
    );
  }
  if (loading) {
    return (
      <div data-testid="post-form-loading" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  const fieldError = (name: keyof EditorValues) => errors[name]?.message;
  const renderField = (
    name: "title" | "slug" | "content" | "description" | "tagsInput",
    label: string,
    control: ReactNode,
    controlId = `pf-${name}`,
  ) => (
    <Field data-invalid={Boolean(fieldError(name))}>
      <FieldLabel htmlFor={controlId}>{label}</FieldLabel>
      {control}
      {fieldError(name) && <FieldError>{fieldError(name)}</FieldError>}
    </Field>
  );

  return (
    <div data-testid="post-form">
      <h2>{mode === "create" ? "New Post" : "Edit Post"}</h2>
      <form onSubmit={handleSubmit(onValid)} noValidate>
        <FieldGroup>
          {renderField(
            "title",
            "Title",
            <Input
              id="pf-title"
              type="text"
              disabled={saving}
              aria-invalid={Boolean(fieldError("title"))}
              {...register("title", {
                onChange: () => clearErrors("root.server"),
              })}
            />,
          )}
          {renderField(
            "slug",
            "Slug",
            <Input
              id="pf-slug"
              type="text"
              disabled={saving}
              aria-invalid={Boolean(fieldError("slug"))}
              {...register("slug", {
                onChange: () => clearErrors("root.server"),
              })}
            />,
          )}
          {renderField(
            "content",
            "Content",
            <Textarea
              id="pf-content"
              disabled={saving}
              aria-invalid={Boolean(fieldError("content"))}
              {...register("content", {
                onChange: () => clearErrors("root.server"),
              })}
            />,
          )}
          {renderField(
            "description",
            "Description",
            <Input
              id="pf-description"
              type="text"
              disabled={saving}
              aria-invalid={Boolean(fieldError("description"))}
              {...register("description", {
                onChange: () => clearErrors("root.server"),
              })}
            />,
          )}
          {renderField(
            "tagsInput",
            "Tags (comma-separated)",
            <Input
              id="pf-tags"
              type="text"
              placeholder="e.g. react, typescript"
              disabled={saving}
              aria-invalid={Boolean(fieldError("tagsInput"))}
              {...register("tagsInput", {
                onChange: () => clearErrors("root.server"),
              })}
            />,
            "pf-tags",
          )}
        </FieldGroup>
        {mode === "edit" && <p>Status: {loadedStatus}</p>}
        <FieldSet>
          <FieldLegend>Cover Image</FieldLegend>
          {coverImageId && (
            <img
              src={thumbUrl(coverImageId)!}
              alt="Cover preview"
              data-testid="post-form-cover-preview"
            />
          )}
          <FileUploadWidget
            category="POST_COVER_IMAGE"
            fileId={coverImageId}
            onUploaded={(asset) =>
              setValue("coverImageId", asset.id, { shouldDirty: true })
            }
            onRemove={() =>
              setValue("coverImageId", null, { shouldDirty: true })
            }
            data-testid="post-form-cover-widget"
          />
        </FieldSet>
        <FieldSet>
          <FieldLegend>Downloads</FieldLegend>
          {fields.map((download, index) => {
            const fieldName = `downloads.${index}.label` as const;
            const error = errors.downloads?.[index]?.label?.message;
            const inputId = `download-label-${download.fieldKey}`;
            return (
              <div key={download.fieldKey}>
                <a
                  href={fileUrl(download.fileId)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`post-form-download-link-${download.fileId}`}
                >
                  {download.fileId}
                </a>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor={inputId}>File label</FieldLabel>
                  <Input
                    id={inputId}
                    type="text"
                    placeholder="File label"
                    data-testid={`post-form-download-label-${download.fileId}`}
                    aria-invalid={Boolean(error)}
                    {...register(fieldName, {
                      onChange: () => clearErrors("root.server"),
                    })}
                  />
                  {error && <FieldError>{error}</FieldError>}
                </Field>
                <FileUploadWidget
                  category="POST_DOWNLOAD"
                  fileId={download.fileId}
                  onUploaded={(asset) =>
                    updateDownload(download.entryId, asset.id)
                  }
                  onRemove={() => remove(index)}
                  data-testid={`post-form-download-widget-${download.fileId}`}
                />
              </div>
            );
          })}
          <FileUploadWidget
            category="POST_DOWNLOAD"
            fileId={null}
            onUploaded={(asset) =>
              append({
                entryId: crypto.randomUUID(),
                fileId: asset.id,
                label: "",
              })
            }
            onRemove={() => undefined}
            data-testid="post-form-download-add"
          />
        </FieldSet>
        <div>
          <Button type="submit" disabled={saving}>
            Save Post
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
        {errors.title?.message && (
          <div data-testid="post-form-validation-error" aria-hidden="true" />
        )}
        {errors.root?.server?.message && (
          <Alert
            data-testid="post-form-save-error"
            variant="destructive"
          >
            <AlertDescription>
              <p>Failed to save post. Please try again.</p>
              <p>{errors.root.server.message}</p>
            </AlertDescription>
          </Alert>
        )}
        {saveSuccess && (
          <div data-testid="post-form-save-success" role="status">
            Post saved successfully.
          </div>
        )}
      </form>
      <ConfirmDialog
        open={confirmation !== null}
        title={
          confirmation?.kind === "slug" ? "Change published URL?" : "Save post?"
        }
        description={
          confirmation?.kind === "slug"
            ? "You are changing the URL of a published post. Existing links to this post will break. Continue?"
            : "Save changes to this post?"
        }
        confirmLabel={confirmation?.kind === "slug" ? "Continue" : "Confirm"}
        onCancel={() => setConfirmation(null)}
        onConfirm={async () => {
          if (!confirmation) return;
          if (confirmation.kind === "slug") {
            setConfirmation({ kind: "save", values: confirmation.values });
          } else {
            setConfirmation(null);
            await saveValues(confirmation.values);
          }
        }}
      />
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
    coverImageId: post.coverImageId,
    downloadIds: post.downloads.map((d) => d.fileId),
  };
}
