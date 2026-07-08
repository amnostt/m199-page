# Design: Posts Admin CRUD UI

## Technical Approach

Extend the existing single-page admin shell (no router) with a `Posts` section composed of a list page, a shared create/edit form page, and one net-new file-upload widget reused for cover image and downloads. All API calls go through the existing `adminFetch` helper. Client types map the raw `PostRow`/`FileAssetResponse` shapes to `/files/{id}` URLs since admin endpoints return no public-response mapping.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| View switching | `AdminApp` owns `activeSection: "landing" \| "posts"`; `PostsPage` owns its own `view: {mode:"list"}\|{mode:"create"}\|{mode:"edit", slug}` | React Router | No router installed; proposal forbids adding one; nested local state mirrors existing single-page shell |
| Upload widget shape | One `FileUploadWidget` (single-file, per-slot state), used twice: cover (1 slot) and downloads (list of slots) | One combined multi-purpose widget with `multiple` prop internally | Keeping it single-file-per-instance keeps the state machine trivial; "multi" is just N sibling instances + an "add" slot |
| Cover replace / download remove | Only detach the FileAsset reference (`coverImageId`/`downloadIds`); never call `DELETE /files/:id` from the UI | Also delete the orphaned FileAsset | Backend `update()` never deletes FileAssets on reference change — matching that avoids deleting a file another entity/slice may still reference later |
| Form save confirms | Two sequential `window.confirm` calls when slug changed on a `PUBLISHED` post: URL-breakage confirm, then generic save confirm | Single merged confirm message | P-07 requires a "distinct" confirmation; keeping them separate lets tests assert call order/content independently |
| Row lifecycle state | `Record<postId, "idle"\|"pending"\|"error">` on the list page | One global `saving` boolean | Row actions (publish/archive/delete) must not block other rows or the list itself |

## Data Flow

    PostsListPage --adminFetch GET /posts/admin--> list state
         │ select/create
         ▼
    PostFormPage --adminFetch GET /posts/admin/slug/:slug (edit only)--> form state
         │ upload
         ▼
    FileUploadWidget --adminFetch POST /files/:category (multipart)--> FileAssetResponse
         │ sets coverImageId / appends downloadIds
         ▼
    PostFormPage --adminFetch POST|PATCH /posts/admin[/:id]--> back to PostsListPage

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/admin/adminTypes.ts` | Modify | Add `PostStatus`, `PostDownload`, `PostListItem`, `Post`, `PostForm`, `FileAssetResponse` |
| `apps/web/src/admin/AdminApp.tsx` | Modify | Lift `activeSection` state; enable Posts nav; render `PostsPage` when active |
| `apps/web/src/admin/postsApi.ts` | Create | Thin wrappers over `adminFetch` for all `/posts/admin/*` and `/files/:category` calls; `parseTags`, `fileUrl`, `thumbUrl` helpers |
| `apps/web/src/admin/PostsListPage.tsx` | Create | Load-all list, status filter, per-row lifecycle actions + confirms |
| `apps/web/src/admin/PostFormPage.tsx` | Create | Create/edit form; slug-change confirm; embeds two `FileUploadWidget`s |
| `apps/web/src/admin/FileUploadWidget.tsx` | Create | Single-file upload widget (contract below) |
| `apps/web/vite.config.ts` | Modify | Add `/files` proxy entry |

## Interfaces / Contracts

```ts
export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export interface PostDownload { id: string; fileId: string; label: string | null; sortOrder: number }
export interface PostListItem { id: string; slug: string; title: string; status: PostStatus; coverImageId: string | null; publishedAt: string | null }
export interface Post extends PostListItem { description: string; content: string; tags: string[]; downloads: PostDownload[] }
export interface PostForm { title: string; slug: string; content: string; description: string; tagsInput: string; status: PostStatus; coverImageId: string | null; downloadIds: string[] }
export interface FileAssetResponse { id: string; url: string; thumbnailUrl: string | null; mimeType: string; fileSize: number; originalFilename: string; category: string; createdAt: string }
```

`FileUploadWidget` props: `category`, `fileId: string | null`, `onUploaded(asset): void`, `onRemove(): void`. Internal state `"idle" | "uploading" | "error"`. Upload builds `FormData` with `file`, calls `adminFetch<FileAssetResponse>('/files/' + category, { method: "POST", body: formData })` — no `Content-Type` header (browser sets multipart boundary). Cover preview via `<img src={/files/{fileId}/thumb}>`; downloads render as a plain link (`/files/{fileId}`) + label input, no thumbnail (avoids PDF-thumbnail edge cases).

`fileUrl`/`thumbUrl`: `id ? \`/files/${id}\`[/thumb] : null`. `parseTags`: split on comma, trim, drop empty, slice to 20.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `parseTags`, `fileUrl`/`thumbUrl`, form normalization | Pure function tests, no DOM |
| Component | List/form render states, confirm gates, per-row action isolation | Vitest + RTL, jsdom, `fetch` stubbed with `vi.fn()`, `data-testid` per state |
| Upload | Success/error paths, multipart body shape | `new File(["x"], "cover.png", { type: "image/png" })`, `fireEvent.change(input, { target: { files: [file] } })` (no `user-event` dep); assert `fetch.mock.calls[0][1].body instanceof FormData` and `.get("file") === file` |
| Confirm gate | Slug-change vs generic confirm ordering | `vi.spyOn(window, "confirm")` returning distinct values per call; assert call count/args and that `fetch` is not called when declined |

Run via `pnpm test` (`vitest run`, `forbidOnly: true`).

## Migration / Rollout

No migration required — frontend-only, no schema/backend changes.

## Open Questions

- [ ] None blocking. Cover-replace/download-remove not deleting the underlying `FileAsset` is a deliberate scope choice (see Architecture Decisions) — flagged as low-risk since it matches existing backend behavior, not a gap this design introduces.
