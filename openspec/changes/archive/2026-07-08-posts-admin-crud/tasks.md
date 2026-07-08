# Tasks: Posts Admin CRUD UI

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (total) | ~1,805 (impl ~750, tests ~1,055) |
| 800-line budget risk | **High** (total); Slice 1: Med, Slice 2: Med-Low, Slice 3: Low, Slice 4: Med |
| Chained PRs recommended | **Yes** |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
800-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Est. lines | Notes |
|------|------|-----------|------------|-------|
| 1 | Foundation + list (read-only) | PR 1 | ~585 | Proxy, types, postsApi helpers, PostsListPage, AdminApp nav |
| 2 | Create/edit form (core fields) | PR 2 | ~400 | PostFormPage title/slug/content/desc/tags/status via POST/PATCH |
| 3 | Lifecycle actions + P-07 slug gate | PR 3 | ~330 | Publish/archive/delete confirms, slug-change-on-published distict confirm |
| 4 | Files + featured | PR 4 | ~490 | FileUploadWidget, cover/downloads, feature toggle, 401-retry-FormData test |

## Slice 1 — Foundation + List (~585 lines)

- [x] 1.1 RED: Unit-test `parseTags("a, b, ,c")` → `["a","b","c"]`, `null` → `[]`, max 20; `fileUrl(id)`/`thumbUrl(id)`
- [x] 1.2 GREEN: Implement `parseTags`, `fileUrl`, `thumbUrl` in `apps/web/src/admin/postsApi.ts`
- [x] 1.3 Add `PostStatus`, `PostDownload`, `PostListItem`, `Post`, `PostForm`, `FileAssetResponse` to `apps/web/src/admin/adminTypes.ts`
- [x] 1.4 Add `/files` proxy entry to `apps/web/vite.config.ts` (target API_TARGET, changeOrigin, no bypass)
- [x] 1.5 GREEN: Add `listPosts()`, `getPost(slug)` thin `adminFetch<T>` wrappers in `postsApi.ts`
- [x] 1.6 RED: Test PostsListPage renders loading → rows (title/slug/status); status filter dropdown; empty state; load error banner
- [x] 1.7 GREEN: Implement `PostsListPage` in `apps/web/src/admin/PostsListPage.tsx` — GET all, status filter, loading/error/empty, no mutations
- [x] 1.8 RED: Test AdminApp Posts nav is active (not disabled), clicking shows PostsListPage; Landing↔Posts switching preserves shell
- [x] 1.9 GREEN: Add `activeSection` state to `AdminApp`/`AdminShell`; promote Posts from placeholder to active; render `PostsPage` wrapper

## Slice 2 — Create/Edit Form (~400 lines)

- [x] 2.1 RED: Test create: fill form → `POST /posts/admin` with title/slug/content/desc/tags/status; tags split from comma input
- [x] 2.2 RED: Test edit: load `GET /posts/admin/slug/:slug` → populate form; submit → `PATCH /posts/admin/:id`
- [x] 2.3 RED: Test loading/error/success states, save disabled while submitting, required title validation
- [x] 2.4 GREEN: Implement `PostFormPage.tsx` with create/edit modes, all fields (textarea content, comma tags), loading/error/success per LandingSettingsPage pattern

## Slice 3 — Lifecycle + P-07 Slug Gate (~330 lines)

- [x] 3.1 RED: Test publish/archive/delete per-row: `window.confirm` accepted → request sent; declined → no request; per-row state isolation
- [x] 3.2 RED: Test P-07: slug changed on PUBLISHED → two sequential `window.confirm` (URL-breakage then save), assert call order; cancel first → no PATCH; non-published slug change → no extra confirm
- [x] 3.3 GREEN: Add per-row lifecycle buttons + `Record<postId, "idle"|"pending"|"error">` state to `PostsListPage`
- [x] 3.4 GREEN: Add P-07 slug-change confirm gate to `PostFormPage` — compares original vs current slug when status === PUBLISHED

## Slice 4 — Files + Featured (~490 lines)

- [x] 4.1 RED: Test `FileUploadWidget` upload: `new File(["x"],"c.png",{type:"image/png"})`, `fireEvent.change`, assert FormData body; success/error states
- [x] 4.2 RED: **401-retry-FormData test**: `adminFetch` 401→refresh→retry on `POST /files/:category` re-sends the File in retry body
- [x] 4.3 RED: Test cover preview `<img>`; downloads link + remove button; show label input per download
- [x] 4.4 GREEN: Implement `FileUploadWidget.tsx` (single-file, `category`/`fileId`/`onUploaded`/`onRemove`, idle|uploading|error)
- [x] 4.5 RED: Test feature/unfeature toggle: cap at 3 disables feature; unfeature frees slot; PUBLISHED-only eligible
- [x] 4.6 GREEN: Wire FileUploadWidget into `PostFormPage` for cover + downloads; wire feature/unfeature into `PostsListPage` with 3-slot cap display

## Design Notes

- **Raw PostRow leak**: The API returns `createdById`/`createdAt`/`updatedAt` in raw PostRow. These are NOT mapped in `PostListItem`/`Post` UI types. Do NOT "fix" the API expecting a DTO — the frontend simply ignores unmapped fields.
- **adminFetch body reuse**: `adminFetch`'s 401→refresh→retry reuses the same `init.body` reference. For FormData this works in browsers but MUST be covered by the 4.2 test.
- **Cover replace / download remove**: Only detach FileAsset reference (set `coverImageId` to new, splice from `downloadIds`). Never call `DELETE /files/:id` — matches backend behavior.
